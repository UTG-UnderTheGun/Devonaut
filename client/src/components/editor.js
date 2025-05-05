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

  // CRITICAL: Force editor remount when problem changes
  useEffect(() => {
    if (previousProblemIndexRef.current !== problemIndex) {
      // Set navigating flag to prevent unwanted resets
      isNavigating.current = true;
      
      // Save current content before switching
      if (previousProblemIndexRef.current !== undefined && editorInstance) {
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
      console.log(`Navigating from problem ${previousProblemIndexRef.current} to ${problemIndex}`);
      previousProblemIndexRef.current = problemIndex;
      
      // Pre-load content for the new problem before remounting
      const newContent = preloadProblemContent();
      if (newContent) {
        setEditorContent(newContent);
        setCode(newContent);
      }
      
      // Force editor remount with new key
      setEditorKey(`editor-${problemIndex || 'default'}-${Date.now()}`);
      
      // Ensure editor content is loaded after remount
      setTimeout(() => {
        // Load content again to ensure it's set correctly after remount
        loadProblemContent();
        
        // Reset navigation flag after a longer delay to ensure all operations complete
        setTimeout(() => {
          isNavigating.current = false;
        }, 200);
      }, 50);
    }
  }, [problemIndex, editorInstance]);

  // Function to preload problem content and return it without updating the editor
  const preloadProblemContent = () => {
    if (problemIndex === undefined) return null;
    
    // Try to get saved content first
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
      console.log(`Preloaded content for problem ${problemIndex}:`, 
        savedContent.substring(0, 30) + (savedContent.length > 30 ? '...' : ''));
      return savedContent;
    }
    
    return null;
  };

  // Function to load problem content
  const loadProblemContent = () => {
    if (problemIndex === undefined) return;
    
    // Try to get saved content first
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
      
      // Update all states at once to ensure consistency
      setEditorContent(savedContent);
      setCode(savedContent);
      
      if (editorInstance) {
        // Force a direct editor update
        editorInstance.setValue(savedContent);
        
        // Double-check the update after a small delay
        setTimeout(() => {
          const currentValue = editorInstance.getValue();
          if (currentValue !== savedContent) {
            console.log('Editor value mismatch after load, forcing update');
            editorInstance.setValue(savedContent);
          }
        }, 50);
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
      }
    });
  };

  // Load initial content on mount
  useEffect(() => {
    // Only run once on mount
    loadProblemContent();
    
    // Set up localStorage intercept to catch legacy keys
    const originalSetItem = localStorage.setItem;
    localStorage.setItem = function(key, value) {
      // Call original implementation
      originalSetItem.apply(this, arguments);
      
      // Check if this is a legacy key
      const match = key && key.match(/^(problem-code-|code-code-|code-fill-|code-output-|code-)(\d+)$/);
      if (match && !key.startsWith('editor-code-')) {
        const index = parseInt(match[2]);
        const newKey = `editor-code-${index}`;
        
        console.log(`Intercepted write to legacy key ${key}, migrating to ${newKey}`);
        originalSetItem.call(localStorage, newKey, value);
      }
    };
    
    // Clean up any existing legacy keys for all problems
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key) continue;
        
        const match = key.match(/^(problem-code-|code-code-|code-fill-|code-output-|code-)(\d+)$/);
        if (match && !key.startsWith('editor-code-')) {
          const index = parseInt(match[2]);
          const value = localStorage.getItem(key);
          
          if (value) {
            const newKey = `editor-code-${index}`;
            localStorage.setItem(newKey, value);
            console.log(`Initial migration: ${key} -> ${newKey}`);
          }
        }
      }
    } catch (err) {
      console.error('Error during initial key migration:', err);
    }
    
    // Clean up function
    return () => {
      // Clear any pending timers
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  // Handle import events
  useEffect(() => {
    const handleImport = (event) => {
      if (event.detail && event.detail.code) {
        const importedCode = event.detail.code;
        
        // Update state
        setEditorContent(importedCode);
        setCode(importedCode);
        
        // Save to storage
        if (problemIndex !== undefined) {
          localStorage.setItem(`editor-code-${problemIndex}`, importedCode);
        }
        
        // Update editor
        if (editorInstance) {
          editorInstance.setValue(importedCode);
        }
      }
    };

    const handleReset = (event) => {
      console.log(`Reset request for problem ${problemIndex}`);
      
      // Clear state and storage
      setEditorContent('');
      setCode('');
      
      if (problemIndex !== undefined) {
        localStorage.removeItem(`editor-code-${problemIndex}`);
        cleanupLegacyKeys(problemIndex);
      }
      
      // Clear editor
      if (editorInstance) {
        editorInstance.setValue('');
      }
      
      // If it's a complete reset, clear all code-related keys
      if (event.detail && (event.detail.complete || !problemIndex)) {
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && (
              key.startsWith('editor-code-') || 
              key.startsWith('problem-code-') || 
              key.startsWith('code-code-') ||
              key.startsWith('code-fill-') ||
              key.startsWith('code-output-') ||
              key === 'editorCode'
          )) {
            keysToRemove.push(key);
          }
        }
        
        keysToRemove.forEach(key => {
          localStorage.removeItem(key);
          console.log(`Removed key during reset: ${key}`);
        });
      }
    };

    window.addEventListener('ide-data-import', handleImport);
    window.addEventListener('storage-reset', handleReset);
    window.addEventListener('code-reset', handleReset);
    
    return () => {
      window.removeEventListener('ide-data-import', handleImport);
      window.removeEventListener('storage-reset', handleReset);
      window.removeEventListener('code-reset', handleReset);
    };
  }, [editorInstance, problemIndex, setCode]);

  // Setup editor when mounted
  const handleEditorDidMount = (editor, monaco) => {
    console.log(`Editor mounted for problem ${problemIndex}`);
    setEditorInstance(editor);
    
    // First set the content from our state
    if (editorContent) {
      editor.setValue(editorContent);
      
      // Double-check that the content is set correctly
      const currentValue = editor.getValue();
      if (currentValue !== editorContent) {
        console.log('Editor value not set correctly on mount, forcing update');
        setTimeout(() => editor.setValue(editorContent), 0);
      }
    } else if (code) {
      editor.setValue(code);
    } else {
      // If no content is available, try to load it again
      loadProblemContent();
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
      
      // Save to storage immediately
      if (problemIndex !== undefined) {
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
      
      // Save to storage
      if (problemIndex !== undefined) {
        localStorage.setItem(`editor-code-${problemIndex}`, code);
      }
    }
  }, [code, editorInstance, editorContent, problemIndex]);

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
    
    // Save to storage
    if (problemIndex !== undefined) {
      localStorage.setItem(`editor-code-${problemIndex}`, newValue);
    } else {
      localStorage.setItem('editorCode', newValue);
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
          }}
          onMount={handleEditorDidMount}
        />
      </div>
    </div>
  );
}