import dynamic from 'next/dynamic';
import { useState, useEffect } from 'react';
import { useCodeContext } from '@/app/context/CodeContext';
import axios from 'axios';
import './editor.css';
import { useRouter } from 'next/navigation';

const MonacoEditor = dynamic(() => import('@monaco-editor/react'), { ssr: false });

export default function Editor({ isCodeQuestion, initialValue, onChange, problemIndex, testType }) {
  const router = useRouter();
  const { code, setCode, setOutput, setError } = useCodeContext();
  const [selectedText, setSelectedText] = useState('');
  const [editorInstance, setEditorInstance] = useState(null);

  // Load initial code for the specific problem
  useEffect(() => {
    if (problemIndex !== undefined) {
      const savedCode = localStorage.getItem(`problem-code-${problemIndex}`);
      if (savedCode) {
        setCode(savedCode);
      } else if (initialValue) {
        setCode(initialValue);
        localStorage.setItem(`problem-code-${problemIndex}`, initialValue);
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
  }, [initialValue, problemIndex]);

  // Save code changes to localStorage
  useEffect(() => {
    if (code !== '# write code here') {
      if (problemIndex !== undefined) {
        // Save problem-specific code
        localStorage.setItem(`problem-code-${problemIndex}`, code);
      } else {
        // Save general code
        localStorage.setItem('editorCode', code);
      }
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

    const handleStorageReset = () => {
      // Reset the editor content
      setCode('');
      if (editorInstance) {
        editorInstance.setValue('');
      }
      // Clear problem-specific code if applicable
      if (problemIndex !== undefined) {
        localStorage.removeItem(`problem-code-${problemIndex}`);
      }
    };

    window.addEventListener('ide-data-import', handleImport);
    window.addEventListener('storage-reset', handleStorageReset);
    
    return () => {
      window.removeEventListener('ide-data-import', handleImport);
      window.removeEventListener('storage-reset', handleStorageReset);
    };
  }, [editorInstance, problemIndex]);

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
      const userMessageObject = {
        id: Date.now(),
        text: `Please explain this python code:\n\`\`\`\n${text}\n\`\`\``,
        isUser: true,
        timestamp: new Date()
      };

      const event = new CustomEvent('add-chat-message', {
        detail: userMessageObject
      });
      window.dispatchEvent(event);
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