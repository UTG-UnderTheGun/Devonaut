import dynamic from 'next/dynamic';
import { useState, useEffect } from 'react';
import { useCodeContext } from '@/app/context/CodeContext';
import axios from 'axios';
import './editor.css';
import { useRouter } from 'next/navigation';

const MonacoEditor = dynamic(() => import('@monaco-editor/react'), { ssr: false });

export default function Editor({ isCodeQuestion, initialValue, onChange, problemIndex, testType }) {
  const router = useRouter();
  const { setCode, setOutput, setError, setActiveProblem, codes } = useCodeContext();
  const [selectedText, setSelectedText] = useState('');
  const [editorInstance, setEditorInstance] = useState(null);
  const [localCode, setLocalCode] = useState(initialValue || '# write code here');

  // Get a unique storage key for this problem
  const getStorageKey = () => {
    if (problemIndex === undefined) {
      return 'editorCode';
    }
    
    // Include both problem index and type in the key to ensure uniqueness
    // This ensures questions with the same index but different types don't share code
    return `problem-code-${testType}-${problemIndex}`;
  };

  // Get code specific to this editor instance
  const getEditorCode = () => {
    if (problemIndex !== undefined && testType) {
      const key = `${testType}-${problemIndex}`;
      return codes[key] || localCode;
    }
    return localCode;
  };

  // Set the active problem when this editor mounts or changes problem
  useEffect(() => {
    if (problemIndex !== undefined && testType) {
      setActiveProblem(problemIndex, testType);
    }
  }, [problemIndex, testType, setActiveProblem]);

  // Load initial code for the specific problem
  useEffect(() => {
    // Skip loading if this is a result of a reset
    const wasReset = localStorage.getItem('editor_reset_timestamp');
    if (wasReset) {
      // If this was recently reset, don't load old code
      const resetTime = parseInt(wasReset);
      if (Date.now() - resetTime < 1000) {
        console.log("Editor was recently reset, skipping code load");
        return;
      }
    }

    if (problemIndex !== undefined) {
      // Create a unique key for each problem by combining type and index
      const storageKey = getStorageKey();
      console.log(`Loading code from storage key: ${storageKey}`);
      
      // Check if we're in an imported state
      const isImported = localStorage.getItem('is-imported') === 'true';
      const importComplete = localStorage.getItem('import-complete') === 'true';
      
      // For imported assignments, prioritize retrieving user answers
      if (isImported && testType === 'code') {
        let foundStudentCode = false;
        
        // Try multiple sources for the student code in order of preference
        
        // 1. First try problem-specific code with type-specific storage key
        const studentCodeKey = `problem-code-${testType}-${problemIndex}`;
        const studentCode = localStorage.getItem(studentCodeKey);
        
        if (studentCode) {
          console.log(`Found imported student code for ${studentCodeKey}`);
          setLocalCode(studentCode);
          setCode(studentCode, problemIndex, testType);
          foundStudentCode = true;
        }
        
        // 2. If not found, try to get from the codeAnswers structure in problem-answers
        if (!foundStudentCode) {
          try {
            const allAnswers = JSON.parse(localStorage.getItem('problem-answers') || '{}');
            
            // Check if we have a specific answer for this problem index
            if (allAnswers.codeAnswers && allAnswers.codeAnswers[problemIndex]) {
              console.log(`Found imported student code from problem-answers.codeAnswers[${problemIndex}]`);
              const code = allAnswers.codeAnswers[problemIndex];
              setLocalCode(code);
              setCode(code, problemIndex, testType);
              foundStudentCode = true;
            }
            // Check if there's a generic codeAnswer (older format)
            else if (allAnswers.codeAnswer && typeof allAnswers.codeAnswer === 'string') {
              console.log(`Found imported student code from problem-answers.codeAnswer`);
              setLocalCode(allAnswers.codeAnswer);
              setCode(allAnswers.codeAnswer, problemIndex, testType);
              foundStudentCode = true;
            }
          } catch (e) {
            console.error('Error parsing problem-answers:', e);
          }
        }
        
        // 3. Try the alternative storage format
        if (!foundStudentCode) {
          const altKey = `code-${testType}-${problemIndex}`;
          const altCode = localStorage.getItem(altKey);
          
          if (altCode) {
            console.log(`Found imported student code with alternative key ${altKey}`);
            setLocalCode(altCode);
            setCode(altCode, problemIndex, testType);
            foundStudentCode = true;
          }
        }
        
        // If we found student code, we're done
        if (foundStudentCode) {
          return;
        }
      }
      
      // If not imported or couldn't find specific student code, proceed with normal loading
      const savedCode = localStorage.getItem(storageKey);
      
      if (savedCode) {
        console.log(`Found saved code for ${storageKey}`);
        setLocalCode(savedCode);
        setCode(savedCode, problemIndex, testType);
      } else if (initialValue) {
        console.log(`Using initial value for ${storageKey}`);
        setLocalCode(initialValue);
        setCode(initialValue, problemIndex, testType);
        
        // Only store initial value if we're not during import processing
        if (!localStorage.getItem('import-timestamp') || 
            Date.now() - parseInt(localStorage.getItem('import-timestamp')) > 5000) {
          localStorage.setItem(storageKey, initialValue);
        }
      }
    } else {
      // Fallback for non-problem-specific code
      const savedCode = localStorage.getItem('editorCode');
      if (savedCode) {
        setLocalCode(savedCode);
        setCode(savedCode);
      } else if (initialValue) {
        setLocalCode(initialValue);
        setCode(initialValue);
      }
    }
  }, [initialValue, problemIndex, testType, setCode]);

  // Save code changes to localStorage - only store in ONE location to prevent duplicates
  useEffect(() => {
    const currentCode = getEditorCode();
    if (currentCode === undefined || currentCode === null) return;
    if (currentCode === '# write code here') return;
    
    // Check if we're in a reset state
    const wasReset = localStorage.getItem('editor_reset_timestamp');
    if (wasReset) {
      const resetTime = parseInt(wasReset);
      if (Date.now() - resetTime < 1000) {
        console.log("Editor was recently reset, skipping code save");
        return;
      }
    }

    // Only store with unique key that includes both problem index and type
    if (problemIndex !== undefined) {
      const storageKey = getStorageKey();
      console.log(`Saving code to storage key: ${storageKey}`);
      localStorage.setItem(storageKey, currentCode);
      
      // Remove old keys to prevent duplication and confusion
      localStorage.removeItem(`problem-code-${problemIndex}`);
      localStorage.removeItem(`code-code-${problemIndex}`);
      localStorage.removeItem(`code-${problemIndex}`);
    } else {
      localStorage.setItem('editorCode', currentCode);
    }
  }, [codes, problemIndex, testType]);

  useEffect(() => {
    const handleImport = (event) => {
      if (event.detail && event.detail.code) {
        const importedCode = event.detail.code;
        setLocalCode(importedCode);
        setCode(importedCode, problemIndex, testType);
        
        if (problemIndex !== undefined) {
          const storageKey = getStorageKey();
          console.log(`Importing code to storage key: ${storageKey}`);
          localStorage.setItem(storageKey, importedCode);
        }
      }
    };

    const handleStorageReset = (event) => {
      console.log("Storage reset detected in editor.js:", event.detail);
      
      // Set a reset timestamp to prevent immediate reloading
      localStorage.setItem('editor_reset_timestamp', Date.now().toString());
      
      // Reset the editor content immediately
      const emptyCode = '';
      setLocalCode(emptyCode);
      setCode(emptyCode, problemIndex, testType);
      
      if (editorInstance) {
        editorInstance.setValue(emptyCode);
      }
      
      // Clear problem-specific code if applicable
      if (problemIndex !== undefined) {
        const storageKey = getStorageKey();
        console.log(`Clearing storage key: ${storageKey}`);
        localStorage.removeItem(storageKey);
        
        // Also clear old format keys
        localStorage.removeItem(`problem-code-${problemIndex}`);
        localStorage.removeItem(`code-code-${problemIndex}`);
        localStorage.removeItem(`code-${problemIndex}`);
        localStorage.removeItem(`code-${testType}-${problemIndex}`);
      }
      
      // Create a full list of localStorage keys to ensure we don't miss any during iteration
      const allKeys = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          allKeys.push(key);
        }
      }
      
      // Now iterate through our safe copy to remove keys
      allKeys.forEach(key => {
        if (key && (
            key.startsWith('problem-code-') || 
            key.startsWith('code-code-') ||
            key.startsWith('code-') ||
            key === 'problem-code' ||
            key === 'editorCode'
        )) {
          console.log("Editor.js removing key:", key);
          localStorage.removeItem(key);
        }
      });

      // Force another editor refresh after a small delay
      setTimeout(() => {
        if (editorInstance) {
          editorInstance.setValue(emptyCode);
        }
      }, 50);
    };
    
    // Handle final reset verification
    const handleFinalReset = () => {
      // Perform a final verification that editor is actually empty
      console.log("Final reset verification in editor.js");
      
      // Empty the editor again to be sure
      const emptyCode = '';
      if (editorInstance) {
        editorInstance.setValue(emptyCode);
        
        // Also ensure our state is correct
        setLocalCode(emptyCode);
        setCode(emptyCode, problemIndex, testType);
      }
      
      // Verify no code-related localStorage items remain
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (
          key.startsWith('code-') || 
          key.startsWith('problem-code-') ||
          key === 'problem-code' ||
          key === 'editorCode'
        )) {
          console.warn(`Key ${key} found during final verification, removing it...`);
          localStorage.removeItem(key);
        }
      }
    };

    window.addEventListener('ide-data-import', handleImport);
    window.addEventListener('storage-reset', handleStorageReset);
    window.addEventListener('code-reset', handleStorageReset);
    window.addEventListener('final-reset', handleFinalReset);
    window.addEventListener('app-reset', handleStorageReset);
    
    return () => {
      window.removeEventListener('ide-data-import', handleImport);
      window.removeEventListener('storage-reset', handleStorageReset);
      window.removeEventListener('code-reset', handleStorageReset);
      window.removeEventListener('final-reset', handleFinalReset);
      window.removeEventListener('app-reset', handleStorageReset);
    };
  }, [editorInstance, problemIndex, testType, setCode]);

  const handleEditorDidMount = (editor, monaco) => {
    setEditorInstance(editor);
    
    // Add selection change listener
    editor.onDidChangeCursorSelection((e) => {
      const selection = editor.getModel().getValueInRange(e.selection);
      if (selection) {
        setSelectedText(selection);
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
        code,
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
    // Update both local state and context state
    setLocalCode(newValue);
    setCode(newValue, problemIndex, testType);
    
    // Save to problem-specific key with type-specific storage
    if (problemIndex !== undefined) {
      const storageKey = getStorageKey();
      console.log(`Saving code change to storage key: ${storageKey}`);
      localStorage.setItem(storageKey, newValue);
    }
    
    // Call parent onChange
    onChange(newValue);
  };

  return (
    <div className="editor-wrapper">
      <div className="monaco-editor-container">
        <MonacoEditor
          height="100%"
          width="100%"
          language="python"
          theme="transparentTheme"
          value={getEditorCode()} // Use our local getter to get code specific to this editor
          onChange={handleChange}
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
