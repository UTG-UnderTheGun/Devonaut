import dynamic from 'next/dynamic';
import { useState, useEffect } from 'react';
import { useCodeContext } from '@/app/context/CodeContext';
import axios from 'axios';
import './editor.css';
import { useRouter } from 'next/navigation';

const MonacoEditor = dynamic(
  () => import('@monaco-editor/react').then(mod => mod.default),
  { 
    ssr: false,
    loading: () => <div className="monaco-editor-loading">Loading editor...</div>
  }
);

export default function Editor({ isCodeQuestion, initialValue, onChange, problemIndex, testType }) {
  const router = useRouter();
  const { code, setCode, setOutput, setError } = useCodeContext();
  const [selectedText, setSelectedText] = useState('');
  const [editorInstance, setEditorInstance] = useState(null);

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
      // Generate a unique, consistent key for this problem
      const problemKey = `problem-code-${problemIndex}`;
      console.log(`Loading code for problem: ${problemKey}`);
      
      // First try problem-specific code
      const savedCode = localStorage.getItem(problemKey);
      if (savedCode) {
        console.log(`Found saved code for ${problemKey}:`, savedCode);
        setCode(savedCode);
      } else if (initialValue) {
        console.log(`Setting initial value for ${problemKey}:`, initialValue);
        setCode(initialValue);
        // Store initial value
        localStorage.setItem(problemKey, initialValue);
      }
    } else {
      // Fallback for non-problem-specific code
      const savedCode = localStorage.getItem('editorCode');
      if (savedCode) {
        setCode(savedCode);
      } else if (initialValue) {
        setCode(initialValue);
      }
    }
  }, [initialValue, problemIndex, setCode]);

  // Save code changes to localStorage - only store in ONE location to prevent duplicates
  useEffect(() => {
    if (code === undefined || code === null) return;
    if (code === '# write code here') return;
    
    // Check if we're in a reset state
    const wasReset = localStorage.getItem('editor_reset_timestamp');
    if (wasReset) {
      const resetTime = parseInt(wasReset);
      if (Date.now() - resetTime < 1000) {
        console.log("Editor was recently reset, skipping code save");
        return;
      }
    }

    // Only store in problem-code-* format
    if (problemIndex !== undefined) {
      const problemKey = `problem-code-${problemIndex}`;
      console.log(`Saving code for ${problemKey}:`, code);
      localStorage.setItem(problemKey, code);
      
      // Clean up old key formats
      const oldKeys = [
        `code-code-${problemIndex}`,
        `code-${problemIndex}`,
        `code-fill-${problemIndex}`
      ];
      
      oldKeys.forEach(key => {
        if (localStorage.getItem(key)) {
          console.log(`Removing old key: ${key}`);
          localStorage.removeItem(key);
        }
      });
    } else {
      localStorage.setItem('editorCode', code);
    }
  }, [code, problemIndex]);

  useEffect(() => {
    const handleImport = (event) => {
      if (event.detail && event.detail.code) {
        setCode(event.detail.code);
        if (problemIndex !== undefined) {
          localStorage.setItem(`problem-code-${problemIndex}`, event.detail.code);
        }
      }
    };

    const handleStorageReset = (event) => {
      console.log("Storage reset detected in editor.js:", event.detail);
      
      // Set a reset timestamp to prevent immediate reloading
      localStorage.setItem('editor_reset_timestamp', Date.now().toString());
      
      // Reset the editor content immediately
      setCode('');
      if (editorInstance) {
        editorInstance.setValue('');
      }
      
      // Clear problem-specific code if applicable
      if (problemIndex !== undefined) {
        const problemKey = `problem-code-${problemIndex}`;
        console.log(`Removing problem key: ${problemKey}`);
        localStorage.removeItem(problemKey);
      }
      
      // Clear all problem-code-* items for complete reset
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (
            key.startsWith('problem-code-') || 
            key.startsWith('code-code-') ||
            key.startsWith('code-fill-') ||
            key === 'problem-code' ||
            key === 'editorCode'
        )) {
          keysToRemove.push(key);
        }
      }
      
      // Remove keys separately to avoid indexing issues while iterating
      keysToRemove.forEach(key => {
        console.log("Editor.js removing key:", key);
        localStorage.removeItem(key);
      });

      // Force another editor refresh after a small delay
      setTimeout(() => {
        if (editorInstance) {
          editorInstance.setValue('');
        }
      }, 50);
    };

    window.addEventListener('ide-data-import', handleImport);
    window.addEventListener('storage-reset', handleStorageReset);
    window.addEventListener('code-reset', handleStorageReset);
    
    return () => {
      window.removeEventListener('ide-data-import', handleImport);
      window.removeEventListener('storage-reset', handleStorageReset);
      window.removeEventListener('code-reset', handleStorageReset);
    };
  }, [editorInstance, problemIndex]);

  const handleEditorDidMount = (editor, monaco) => {
    setEditorInstance(editor);
    
    // Set initial code value if available
    if (code) {
      editor.setValue(code);
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

  // Add effect to sync code changes
  useEffect(() => {
    if (editorInstance && code !== undefined) {
      const currentValue = editorInstance.getValue();
      if (currentValue !== code) {
        console.log('Syncing editor value with code prop');
        editorInstance.setValue(code);
      }
    }
  }, [code, editorInstance]);

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
    setCode(newValue);
    // Save to problem-specific key
    if (problemIndex !== undefined) {
      localStorage.setItem(`problem-code-${problemIndex}`, newValue);
    }
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
          value={code}
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