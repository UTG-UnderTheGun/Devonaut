import dynamic from 'next/dynamic';
import { useState, useEffect, useRef } from 'react';
import { useCodeContext } from '@/app/context/CodeContext';
import axios from 'axios';
import './editor.css';
import { useRouter } from 'next/navigation';

// Force the editor to be client-side only with more explicit loading
const MonacoEditor = dynamic(
  () => import('@monaco-editor/react').then(mod => mod.default),
  { 
    ssr: false,
    loading: () => <div className="monaco-editor-loading">Loading editor...</div>
  }
);

// Generate a consistent key for storing code based on problem index
const generateStorageKey = (problemIndex, testType = null) => {
  if (problemIndex === undefined || problemIndex === null) {
    return 'editorCode';
  }
  return `problem-code-${problemIndex}`;
};

// Helper to generate all possible legacy keys for a problem
const getAllLegacyKeys = (problemIndex, testType = null) => {
  if (problemIndex === undefined || problemIndex === null) {
    return ['editorCode'];
  }
  
  return [
    `problem-code-${problemIndex}`,
    `code-${testType || 'code'}-${problemIndex}`,
    `code-code-${problemIndex}`,
    `code-${problemIndex}`,
    `code-fill-${problemIndex}`,
  ];
};

export default function Editor({ isCodeQuestion, initialValue, onChange, problemIndex, testType }) {
  const router = useRouter();
  const { code, setCode, setOutput, setError } = useCodeContext();
  const [selectedText, setSelectedText] = useState('');
  const [editorInstance, setEditorInstance] = useState(null);
  const previousProblemIndexRef = useRef(problemIndex);
  const [localCode, setLocalCode] = useState('');
  const isInitialLoad = useRef(true);
  const codeIsolationCompleted = useRef(false);
  const currentProblemRef = useRef(problemIndex);
  const [editorKey, setEditorKey] = useState(`editor-${problemIndex}`); // Key for forcing remounts
  const lastNavigationTime = useRef(Date.now());

  // Track current problem to prevent data leakage
  useEffect(() => {
    currentProblemRef.current = problemIndex;
  }, [problemIndex]);

  // Force editor refresh when problem changes
  useEffect(() => {
    if (previousProblemIndexRef.current !== problemIndex && problemIndex !== undefined) {
      console.log(`Problem index changed from ${previousProblemIndexRef.current} to ${problemIndex}`);
      
      // Update timestamp for last navigation
      lastNavigationTime.current = Date.now();
      
      // Force editor remount by changing key
      setEditorKey(`editor-${problemIndex}-${Date.now()}`);
      
      // Track the new problem index
      previousProblemIndexRef.current = problemIndex;
      
      // Early clear of editor
      if (editorInstance) {
        try {
          editorInstance.setValue('');
        } catch (err) {
          console.warn('Error clearing editor:', err);
        }
      }
      
      // Clear states
      setLocalCode('');
      setCode('');
      
      // Small delay to ensure UI updates before loading new code
      setTimeout(() => {
        // Load the correct content for this problem
        const savedCode = loadProblemCode(problemIndex, initialValue);
        
        if (savedCode) {
          console.log(`Loading saved code for problem ${problemIndex}:`, savedCode);
          setLocalCode(savedCode);
          setCode(savedCode);
          
          if (editorInstance) {
            try {
              editorInstance.setValue(savedCode);
            } catch (err) {
              console.warn('Error setting editor value:', err);
              // Fallback: force editor remount again
              setEditorKey(`editor-${problemIndex}-${Date.now()}-retry`);
            }
          }
        } else if (initialValue) {
          console.log(`Using initial value for problem ${problemIndex}:`, initialValue);
          setLocalCode(initialValue);
          setCode(initialValue);
          
          if (editorInstance) {
            try {
              editorInstance.setValue(initialValue);
            } catch (err) {
              console.warn('Error setting editor initial value:', err);
              // Fallback: force editor remount again
              setEditorKey(`editor-${problemIndex}-${Date.now()}-retry`);
            }
          }
          
          // Store initial value
          saveProblemCode(problemIndex, initialValue);
        }
      }, 50);
      
      // Mark this as not an initial load
      isInitialLoad.current = false;
    }
  }, [problemIndex, initialValue, editorInstance, testType, setCode]);

  // One-time function to isolate code between sub-questions
  useEffect(() => {
    if (codeIsolationCompleted.current) return;

    const migrateAndIsolateQuestionCode = () => {
      console.log('Starting code isolation and migration process');
      
      // Get all localStorage keys
      const keys = [];
      for (let i = 0; i < localStorage.length; i++) {
        keys.push(localStorage.key(i));
      }

      // Map to track all values by problem index
      const codeByProblemIndex = {};
      
      // First, collect all code from various key formats
      keys.forEach(key => {
        // Extract problem index from different key formats
        let index = null;
        
        if (key.startsWith('problem-code-')) {
          index = key.replace('problem-code-', '');
        } else if (key.startsWith('code-code-')) {
          index = key.replace('code-code-', '');
        } else if (key.startsWith('code-fill-')) {
          index = key.replace('code-fill-', '');
        } else if (key.match(/^code-\d+$/)) {
          index = key.replace('code-', '');
        } else if (key.match(/^code-[a-z]+-\d+$/)) {
          // Handle formats like code-output-1, code-fill-2
          const parts = key.split('-');
          if (parts.length === 3 && !isNaN(parseInt(parts[2]))) {
            index = parts[2];
          }
        }
        
        // If we found a valid index and the key has a value
        if (index !== null && !isNaN(parseInt(index))) {
          const numericIndex = parseInt(index);
          const value = localStorage.getItem(key);
          
          if (value) {
            if (!codeByProblemIndex[numericIndex]) {
              codeByProblemIndex[numericIndex] = { value, sources: [] };
            }
            codeByProblemIndex[numericIndex].sources.push(key);
          }
        }
      });
      
      console.log('Found problem code data:', Object.keys(codeByProblemIndex).length);
      
      // Now save each unique value to the new format and clean up old keys
      Object.entries(codeByProblemIndex).forEach(([index, data]) => {
        const numericIndex = parseInt(index);
        const newKey = `problem-code-${numericIndex}`;
        
        // Save to the new key format
        localStorage.setItem(newKey, data.value);
        console.log(`Migrated code for problem ${numericIndex} to ${newKey}`);
        
        // Also save to testType-specific key for compatibility
        if (testType) {
          const secondaryKey = `code-${testType}-${numericIndex}`;
          localStorage.setItem(secondaryKey, data.value);
        }
        
        // Clean up old keys, except the ones we just set
        data.sources.forEach(oldKey => {
          if (oldKey !== newKey && (!testType || oldKey !== `code-${testType}-${numericIndex}`)) {
            console.log(`Removing old key: ${oldKey}`);
            localStorage.removeItem(oldKey);
          }
        });
      });
    };
    
    try {
      // Run the migration
      migrateAndIsolateQuestionCode();
    } catch (err) {
      console.error("Error during code isolation:", err);
    }
    
    codeIsolationCompleted.current = true;
  }, [testType]);

  // Function to safely load problem-specific code from storage
  const loadProblemCode = (index, defaultValue = '') => {
    if (index === undefined || index === null) return defaultValue;
    
    try {
      // Try all possible storage keys for this problem
      const allKeys = getAllLegacyKeys(index, testType);
      
      // Try each key until we find a value
      for (const key of allKeys) {
        const savedCode = localStorage.getItem(key);
        if (savedCode) {
          console.log(`Found code for problem ${index} in key ${key}`);
          return savedCode;
        }
      }
    } catch (err) {
      console.error(`Error loading code for problem ${index}:`, err);
    }
    
    return defaultValue;
  };

  // Function to safely save problem-specific code
  const saveProblemCode = (index, codeValue) => {
    if (index === undefined || index === null || codeValue === undefined) return;
    
    try {
      // Primary key - the main one we'll use going forward
      const primaryKey = generateStorageKey(index);
      localStorage.setItem(primaryKey, codeValue);
      
      // Secondary key for compatibility with other components
      if (testType) {
        localStorage.setItem(`code-${testType}-${index}`, codeValue);
      }
      
      // Clean up all other keys for this problem 
      const allKeys = getAllLegacyKeys(index, testType);
      allKeys.forEach(key => {
        if (key !== primaryKey && (!testType || key !== `code-${testType}-${index}`)) {
          localStorage.removeItem(key);
        }
      });
      
      console.log(`Saved code for problem ${index} to ${primaryKey}`);
      return true;
    } catch (err) {
      console.error(`Error saving code for problem ${index}:`, err);
      return false;
    }
  };

  // Listen for navigation events
  useEffect(() => {
    const handleNavigation = (event) => {
      // Check if this is relevant to our component
      if (event.detail && event.detail.problemIndex !== undefined) {
        const { problemIndex: newIndex } = event.detail;
        console.log(`Navigation event detected to problem ${newIndex}`);
        
        // Force editor remount by changing key
        setEditorKey(`editor-${newIndex}-${Date.now()}`);
        
        // Update timestamp for last navigation
        lastNavigationTime.current = Date.now();
        
        // Force immediate state update
        if (newIndex !== currentProblemRef.current) {
          currentProblemRef.current = newIndex;
          
          // Load the code for the new problem
          const savedCode = loadProblemCode(newIndex, initialValue);
          if (savedCode) {
            setLocalCode(savedCode);
            setCode(savedCode);
            
            if (editorInstance) {
              try {
                editorInstance.setValue(savedCode);
              } catch (err) {
                console.warn('Error setting editor value during navigation:', err);
              }
            }
          } else if (initialValue) {
            setLocalCode(initialValue);
            setCode(initialValue);
            
            if (editorInstance) {
              try {
                editorInstance.setValue(initialValue);
              } catch (err) {
                console.warn('Error setting editor initial value during navigation:', err);
              }
            }
          } else {
            setLocalCode('');
            setCode('');
            
            if (editorInstance) {
              try {
                editorInstance.setValue('');
              } catch (err) {
                console.warn('Error clearing editor during navigation:', err);
              }
            }
          }
        }
      }
    };
    
    // Listen for problem-changed event (sent when navigation occurs)
    window.addEventListener('problem-changed', handleNavigation);
    // Also listen for navigation events
    window.addEventListener('navigation', handleNavigation);
    
    return () => {
      window.removeEventListener('problem-changed', handleNavigation);
      window.removeEventListener('navigation', handleNavigation);
    };
  }, [initialValue, editorInstance, setCode, testType]);

  // Load initial code for the very first load
  useEffect(() => {
    if (!isInitialLoad.current) return;
    
    // Skip loading if this is a result of a reset
    const wasReset = localStorage.getItem('editor_reset_timestamp');
    if (wasReset) {
      const resetTime = parseInt(wasReset);
      if (Date.now() - resetTime < 1000) {
        console.log("Editor was recently reset, skipping code load");
        return;
      }
    }

    // Load initial code
    if (problemIndex !== undefined) {
      const savedCode = loadProblemCode(problemIndex, initialValue);
      
      if (savedCode) {
        console.log(`Initial load for problem ${problemIndex}:`, savedCode);
        setLocalCode(savedCode);
        setCode(savedCode);
      } else if (initialValue) {
        console.log(`Setting initial value for problem ${problemIndex}:`, initialValue);
        setLocalCode(initialValue);
        setCode(initialValue);
        
        // Store initial value
        saveProblemCode(problemIndex, initialValue);
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
    
    // Mark initial load as complete
    isInitialLoad.current = false;
  }, [initialValue, setCode, problemIndex, testType]);

  // Save code changes to localStorage 
  useEffect(() => {
    if (localCode === undefined || localCode === null || isInitialLoad.current) return;
    
    // Check if we're in a reset state
    const wasReset = localStorage.getItem('editor_reset_timestamp');
    if (wasReset) {
      const resetTime = parseInt(wasReset);
      if (Date.now() - resetTime < 1000) {
        console.log("Editor was recently reset, skipping code save");
        return;
      }
    }

    // Only save if we have a valid problemIndex and it matches the current ref
    if (problemIndex !== undefined && problemIndex === currentProblemRef.current) {
      saveProblemCode(problemIndex, localCode);
    } else if (problemIndex === undefined) {
      localStorage.setItem('editorCode', localCode);
    }
  }, [localCode, problemIndex]);

  useEffect(() => {
    const handleImport = (event) => {
      if (event.detail && event.detail.code) {
        const newCode = event.detail.code;
        
        // Only apply if this is the current active problem
        if (problemIndex === currentProblemRef.current) {
          setLocalCode(newCode);
          setCode(newCode);
          
          if (problemIndex !== undefined) {
            saveProblemCode(problemIndex, newCode);
          }
          
          if (editorInstance) {
            editorInstance.setValue(newCode);
          }
        }
      }
    };

    const handleStorageReset = (event) => {
      // Check if reset applies to this problem
      const resetProblemIndex = event.detail && event.detail.problemIndex;
      const shouldResetThis = 
        !resetProblemIndex || // Global reset
        resetProblemIndex === problemIndex; // Specific reset for this problem
      
      if (!shouldResetThis) return;
      
      console.log(`Storage reset for problem ${problemIndex || 'all'}`);
      
      // Set a reset timestamp to prevent immediate reloading
      localStorage.setItem('editor_reset_timestamp', Date.now().toString());
      
      // Reset the editor content immediately
      setLocalCode('');
      setCode('');
      if (editorInstance) {
        editorInstance.setValue('');
      }
      
      // Clear problem-specific code if applicable
      if (problemIndex !== undefined) {
        // Remove all possible keys for this problem
        getAllLegacyKeys(problemIndex, testType).forEach(key => {
          localStorage.removeItem(key);
        });
      }
      
      // For complete reset, clear all problem-code-* items
      if (!resetProblemIndex) {
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && (
              key.startsWith('problem-code-') || 
              key.startsWith('code-code-') ||
              key.startsWith('code-fill-') ||
              key.startsWith('code-') ||
              key === 'problem-code' ||
              key === 'editorCode'
          )) {
            keysToRemove.push(key);
          }
        }
        
        // Remove keys separately to avoid indexing issues while iterating
        keysToRemove.forEach(key => {
          console.log(`Removing key: ${key}`);
          localStorage.removeItem(key);
        });
      }

      // Force editor remount
      setEditorKey(`editor-${problemIndex}-reset-${Date.now()}`);
    };

    window.addEventListener('ide-data-import', handleImport);
    window.addEventListener('storage-reset', handleStorageReset);
    window.addEventListener('code-reset', handleStorageReset);
    
    return () => {
      window.removeEventListener('ide-data-import', handleImport);
      window.removeEventListener('storage-reset', handleStorageReset);
      window.removeEventListener('code-reset', handleStorageReset);
    };
  }, [editorInstance, problemIndex, testType, setCode]);

  const handleEditorDidMount = (editor, monaco) => {
    setEditorInstance(editor);
    
    // Alert that editor is mounted
    console.log(`Editor mounted for problem ${problemIndex}, key: ${editorKey}`);
    
    // Check if we navigated recently, if so, ensure we load the right code
    const timeSinceNavigation = Date.now() - lastNavigationTime.current;
    if (timeSinceNavigation < 1000) {
      // We recently navigated, so make sure to load the code for the current problem
      const codeToLoad = loadProblemCode(problemIndex, initialValue || '');
      editor.setValue(codeToLoad);
      setLocalCode(codeToLoad);
      setCode(codeToLoad);
    } else {
      // Set initial code value if available
      if (localCode) {
        editor.setValue(localCode);
      } else if (code) {
        editor.setValue(code);
      }
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
      const newValue = editor.getValue();
      
      // Only process changes if they are for the current problem
      if (problemIndex !== currentProblemRef.current) {
        return;
      }
      
      if (onChange) {
        onChange(newValue);
      }
      
      // Manual code update to ensure sync
      setLocalCode(newValue);
      
      // Save to proper storage
      if (problemIndex !== undefined) {
        saveProblemCode(problemIndex, newValue);
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

  // Add effect to sync code changes from context
  useEffect(() => {
    // Only sync if code is defined and different from local code
    // AND only if this is for the current problem (prevent cross-question pollution)
    if (
      editorInstance && 
      code !== undefined && 
      code !== localCode && 
      problemIndex === currentProblemRef.current
    ) {
      const currentValue = editorInstance.getValue();
      if (currentValue !== code) {
        console.log(`Syncing editor value with code prop for problem ${problemIndex}`);
        editorInstance.setValue(code);
        setLocalCode(code);
      }
    }
  }, [code, editorInstance, localCode, problemIndex]);

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
        code: localCode, // Use localCode instead of code
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
    // Only process changes if they are for the current problem
    if (problemIndex !== currentProblemRef.current) {
      console.warn(`Ignoring code change for incorrect problem: ${problemIndex} vs ${currentProblemRef.current}`);
      return;
    }
    
    // Update local state first
    setLocalCode(newValue);
    
    // Always associate the code with the current problemIndex
    if (problemIndex !== undefined) {
      saveProblemCode(problemIndex, newValue);
    } else {
      localStorage.setItem('editorCode', newValue);
    }
    
    // Update context state
    setCode(newValue);
    
    // Call parent onChange if provided
    if (onChange) {
      onChange(newValue);
    }
  };

  // Dynamically create an announcement for screen readers when problem changes
  useEffect(() => {
    if (previousProblemIndexRef.current !== problemIndex && problemIndex !== undefined) {
      // Create and announce the problem change
      const announcement = document.createElement('div');
      announcement.setAttribute('aria-live', 'assertive');
      announcement.setAttribute('role', 'status');
      announcement.className = 'sr-only';
      announcement.textContent = `Switched to problem ${problemIndex + 1}`;
      document.body.appendChild(announcement);
      
      // Remove after announcement is read
      setTimeout(() => {
        document.body.removeChild(announcement);
      }, 1000);
    }
  }, [problemIndex]);

  return (
    <div className="editor-wrapper">
      <div className="monaco-editor-container">
        <MonacoEditor
          height="100%"
          width="100%"
          language="python"
          theme="transparentTheme"
          value={localCode || code} // Prioritize localCode
          onChange={handleChange}
          key={editorKey} // Force re-mount when problem changes using dynamic key
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