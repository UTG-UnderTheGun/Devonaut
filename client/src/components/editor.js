import dynamic from 'next/dynamic';
import { useState, useEffect, useRef } from 'react';
import { useCodeContext } from '@/app/context/CodeContext';
import axios from 'axios';
import './editor.css';
import { useRouter } from 'next/navigation';

// Use a simple, direct import for Monaco Editor
const MonacoEditor = dynamic(
  () => import('@monaco-editor/react').then(mod => mod.default),
  { 
    ssr: false,
    loading: () => <div className="monaco-editor-loading">Loading editor...</div>
  }
);

// Simple localStorage access with logging
const getStoredCode = (problemIndex) => {
  try {
    const key = `editor-code-${problemIndex}`;
    const value = localStorage.getItem(key);
    console.log(`Getting stored code for problem ${problemIndex}:`, value?.substring(0, 20) + (value?.length > 20 ? '...' : ''));
    return value;
  } catch (e) {
    console.error(`Error getting code for problem ${problemIndex}:`, e);
    return null;
  }
};

const setStoredCode = (problemIndex, code) => {
  try {
    const key = `editor-code-${problemIndex}`;
    localStorage.setItem(key, code);
    console.log(`Saved code for problem ${problemIndex}:`, code?.substring(0, 20) + (code?.length > 20 ? '...' : ''));
    
    // Also clean up legacy keys
    if (problemIndex !== undefined) {
      [
        `problem-code-${problemIndex}`,
        `code-code-${problemIndex}`,
        `code-${problemIndex}`,
        `code-fill-${problemIndex}`,
        `code-output-${problemIndex}`
      ].forEach(legacyKey => {
        if (localStorage.getItem(legacyKey)) {
          localStorage.removeItem(legacyKey);
          console.log(`Removed legacy key: ${legacyKey}`);
        }
      });
    }
    return true;
  } catch (e) {
    console.error(`Error saving code for problem ${problemIndex}:`, e);
    return false;
  }
};

export default function Editor({ isCodeQuestion, initialValue, onChange, problemIndex, testType }) {
  const router = useRouter();
  const { code, setCode, setOutput, setError } = useCodeContext();
  const [selectedText, setSelectedText] = useState('');
  const [editorInstance, setEditorInstance] = useState(null);
  const [editor, setEditor] = useState(null);
  const [editorKey, setEditorKey] = useState(`editor-${problemIndex || 'default'}`);
  const [editorContent, setEditorContent] = useState(initialValue || '');
  const previousProblemIndexRef = useRef(problemIndex);
  const initialMountRef = useRef(true);
  const timerRef = useRef(null);
  const hasSavedInitialValue = useRef({});
  const isNavigating = useRef(false);
  
  // IMPORTANT: Determine if this is a storage-enabled question
  // This is critical to ensure display-only and output questions don't save to localStorage
  const shouldSaveToStorage = isCodeQuestion && testType !== 'output';
  
  // Run a cleanup operation on mount to remove duplicate short answer content
  useEffect(() => {
    // Only run once on mount, for Q1 or other display questions
    if (!shouldSaveToStorage && problemIndex !== undefined) {
      console.log(`Cleaning storage for non-editable question ${problemIndex}`);
      
      // Remove this question's entries from all storage types
      localStorage.removeItem(`editor-code-${problemIndex}`);
      localStorage.removeItem(`problem-code-${problemIndex}`);
      localStorage.removeItem(`code-code-${problemIndex}`);
      localStorage.removeItem(`code-fill-${problemIndex}`);
      localStorage.removeItem(`code-output-${problemIndex}`);
      
      // If this is Q1 or has the common list pattern, search for duplicates
      const q1Pattern = initialValue && (
        initialValue.includes('my_list = [10, 50, 30, 5, 7]') || 
        initialValue.includes('print(min(my_list)')
      );
      
      if (q1Pattern) {
        console.log("Found potential Q1 pattern, cleaning duplicates...");
        const valuesToCheck = [initialValue];
        // Try to find all localStorage keys with this content
        for (let i = 0; i < localStorage.length; i++) {
          try {
            const key = localStorage.key(i);
            if (!key) continue;
            
            // Check any editor or code keys with numeric suffixes
            if (key.match(/^(editor-code-|code-output-|code-code-|code-fill-|problem-code-)\d+$/)) {
              const value = localStorage.getItem(key);
              // If this key has duplicate Q1 content, clear it
              if (valuesToCheck.includes(value)) {
                console.log(`Cleaning up duplicate content in ${key}`);
                localStorage.removeItem(key);
                // Adjust index since we modified the array
                i--;
              }
            }
          } catch (err) {
            console.error('Error during cleanup:', err);
          }
        }
      }
    }
  }, [shouldSaveToStorage, problemIndex, initialValue]);

  // CRITICAL: Force editor remount when problem changes
  useEffect(() => {
    if (previousProblemIndexRef.current !== problemIndex) {
      // Set navigating flag to prevent unwanted resets
      isNavigating.current = true;
      
      // Save current content before switching - only for saveable question types
      if (shouldSaveToStorage && previousProblemIndexRef.current !== undefined && editorInstance) {
        const currentValue = editorInstance.getValue();
        const prevKey = `editor-code-${previousProblemIndexRef.current}`;
        
        if (currentValue) {
          console.log(`Saving content for problem ${previousProblemIndexRef.current} before navigation:`, 
            currentValue.substring(0, 30) + (currentValue.length > 30 ? '...' : ''));
          localStorage.setItem(prevKey, currentValue);
          
          // Also clean up any legacy keys
          cleanupLegacyKeys(previousProblemIndexRef.current);
        }
      }
      
      // Update reference
      console.log(`Navigating from problem ${previousProblemIndexRef.current} to ${problemIndex}, type: ${testType}, saveable: ${shouldSaveToStorage}`);
      previousProblemIndexRef.current = problemIndex;
      
      // Force editor remount with new key
      setEditorKey(`editor-${problemIndex || 'default'}-${Date.now()}`);
      
      // Load content for new problem
      loadProblemContent();
      
      // Reset navigation flag after a short delay
      setTimeout(() => {
        isNavigating.current = false;
      }, 100);
    }
  }, [problemIndex, editorInstance, testType, shouldSaveToStorage]);

  // Function to load problem content
  const loadProblemContent = () => {
    if (problemIndex === undefined) return;
    
    // For non-saveable questions, just use the initialValue
    if (!shouldSaveToStorage) {
      console.log(`Loading display-only content for ${problemIndex}, type: ${testType}`);
      setEditorContent(initialValue || '');
      setCode(initialValue || '');
      
      if (editorInstance) {
        editorInstance.setValue(initialValue || '');
        // Make non-saveable editors read-only
        editorInstance.updateOptions({
          readOnly: true,
          domReadOnly: true
        });
      }
      return;
    }
    
    // For saveable questions - try to get saved content first
    const storageKey = `editor-code-${problemIndex}`;
    let savedContent = localStorage.getItem(storageKey);
    
    // If no saved content, try legacy keys
    if (!savedContent) {
      const legacyKeys = [
        `problem-code-${problemIndex}`,
        `code-code-${problemIndex}`,
        `code-${problemIndex}`,
        `code-fill-${problemIndex}`,
        `code-output-${problemIndex}`
      ];
      
      for (const key of legacyKeys) {
        const legacyContent = localStorage.getItem(key);
        if (legacyContent) {
          savedContent = legacyContent;
          console.log(`Found content in legacy key ${key}, migrating to ${storageKey}`);
          localStorage.setItem(storageKey, legacyContent);
          localStorage.removeItem(key);
          break;
        }
      }
    }
    
    // If still no saved content and we haven't saved initial value yet, use initial value
    if (!savedContent && initialValue && !hasSavedInitialValue.current[problemIndex]) {
      savedContent = initialValue;
      localStorage.setItem(storageKey, initialValue);
      hasSavedInitialValue.current[problemIndex] = true;
      console.log(`Setting initial value for problem ${problemIndex}`);
    }
    
    if (savedContent) {
      console.log(`Loaded content for problem ${problemIndex}:`, 
        savedContent.substring(0, 30) + (savedContent.length > 30 ? '...' : ''));
      setEditorContent(savedContent);
      setCode(savedContent);
      
      if (editorInstance) {
        editorInstance.setValue(savedContent);
      }
    }
  };

  // Helper to clean up legacy keys
  const cleanupLegacyKeys = (index) => {
    if (index === undefined) return;
    
    const legacyKeys = [
      `problem-code-${index}`,
      `code-code-${index}`,
      `code-${index}`,
      `code-fill-${index}`,
      `code-output-${index}`
    ];
    
    legacyKeys.forEach(key => {
      if (localStorage.getItem(key)) {
        localStorage.removeItem(key);
        console.log(`Removed legacy key: ${key}`);
      }
    });
  };

  // Setup editor when mounted
  const handleEditorDidMount = (editor, monaco) => {
    console.log(`Editor mounted for problem ${problemIndex}, type: ${testType}, saveable: ${shouldSaveToStorage}`);
    setEditorInstance(editor);
    
    // First set the content from our state
    if (editorContent) {
      editor.setValue(editorContent);
    } else if (code) {
      editor.setValue(code);
    }
    
    // Set read-only for non-saveable questions
    if (!shouldSaveToStorage) {
      editor.updateOptions({
        readOnly: true,
        domReadOnly: true
      });
      console.log(`Set editor for problem ${problemIndex} to read-only mode`);
    }
    
    // Add selection change listener
    editor.onDidChangeCursorSelection((e) => {
      const selection = editor.getModel().getValueInRange(e.selection);
      if (selection) {
        setSelectedText(selection);
      }
    });

    // Add content change listener
    editor.onDidChangeModelContent(() => {
      if (isNavigating.current) return; // Skip if we're navigating
      
      const newValue = editor.getValue();
      
      // Update state
      setEditorContent(newValue);
      setCode(newValue);
      
      // Save to storage immediately - but only for saveable questions
      if (shouldSaveToStorage && problemIndex !== undefined) {
        localStorage.setItem(`editor-code-${problemIndex}`, newValue);
      }
      
      // Call parent handler
      if (onChange) {
        onChange(newValue);
      }
    });

    editor.updateOptions({
      scrollBeyondLastLine: false,
      minimap: { enabled: false },
      scrollbar: {
        horizontal: 'visible',
        vertical: 'visible',
        horizontalScrollbarSize: 12,
        verticalScrollbarSize: 12,
      },
      wordWrap: 'off',
      contextmenu: true,
    });

    // Add custom context menu action for code explanation
    editor.addAction({
      id: 'explain-code',
      label: 'Explain Code',
      contextMenuGroupId: 'navigation',
      contextMenuOrder: 1.5,
      run: function(ed) {
        const selection = ed.getSelection();
        const selectedText = ed.getModel().getValueInRange(selection);
        if (selectedText) {
          handleExplainCode(selectedText);
        }
      }
    });
  };

  // Sync code changes from context to editor
  useEffect(() => {
    if (isNavigating.current) return; // Skip if we're navigating
    
    if (editorInstance && code !== undefined && code !== editorContent) {
      console.log('External code change detected, updating editor');
      editorInstance.setValue(code);
      setEditorContent(code);
      
      // Save to storage - but only for saveable questions
      if (shouldSaveToStorage && problemIndex !== undefined) {
        localStorage.setItem(`editor-code-${problemIndex}`, code);
      }
    }
  }, [code, editorInstance, editorContent, problemIndex, shouldSaveToStorage]);

  const handleExplainCode = async (text) => {
    try {
      // First, switch to ASK AI tab
      const switchEvent = new CustomEvent('switch-description-tab', {
        detail: { tab: 'ASK AI' }
      });
      window.dispatchEvent(switchEvent);

      // Wait a bit for the tab switch
      await new Promise(resolve => setTimeout(resolve, 100));

      // Then send the message
      const messageEvent = new CustomEvent('add-chat-message', {
        detail: {
          id: Date.now(),
          text: `Please explain this python code:\n\`\`\`\n${text}\n\`\`\``,
          isUser: true,
          timestamp: new Date()
        }
      });
      window.dispatchEvent(messageEvent);

    } catch (err) {
      console.error('Error handling code explanation:', err);
      setError('Failed to explain code');
    }
  };

  const handleRunCode = async () => {
    try {
      const response = await axios.post('http://localhost:8000/code/run-code', {
        code: editorContent,
      }, { withCredentials: true });
      if (response.data.error) {
        setError(response.data.error);
        setOutput('');
      } else {
        setOutput(response.data.output);
        setError('');
      }
    } catch (err) {
      console.log(err);
      setError('Error connecting to the server');
      setOutput('');
    }
  };

  const handleChange = (newValue) => {
    // Skip if we're navigating
    if (isNavigating.current) return;
    
    // Update local state
    setEditorContent(newValue);
    
    // Update context
    setCode(newValue);
    
    // Save to storage - but only for saveable questions
    if (shouldSaveToStorage) {
      if (problemIndex !== undefined) {
        localStorage.setItem(`editor-code-${problemIndex}`, newValue);
      } else {
        localStorage.setItem('editorCode', newValue);
      }
    }
    
    // Call parent onChange
    if (onChange) {
      onChange(newValue);
    }
  };

  return (
    <div className="editor-wrapper">
      <div className="monaco-editor-container">
        <MonacoEditor
          height="100%"
          width="100%"
          language="python"
          theme="transparentTheme"
          value={editorContent}
          onChange={handleChange}
          key={editorKey}
          options={{
            scrollBeyondLastLine: false,
            minimap: { enabled: false },
            scrollbar: {
              horizontal: 'visible',
              vertical: 'hidden',
              horizontalScrollbarSize: 12,
              verticalScrollbarSize: 12,
            },
            wordWrap: 'off',
            automaticLayout: true,
            lineNumbers: 'on',
            roundedSelection: true,
            selectOnLineNumbers: true,
            contextmenu: true,
            readOnly: !shouldSaveToStorage,
          }}
          onMount={handleEditorDidMount}
        />
      </div>
    </div>
  );
}