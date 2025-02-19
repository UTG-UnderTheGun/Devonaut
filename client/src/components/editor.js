import dynamic from 'next/dynamic';
import { useState, useEffect } from 'react';
import { useCodeContext } from '@/app/context/CodeContext';
import axios from 'axios';
import './editor.css';
import { useRouter } from 'next/navigation';

const MonacoEditor = dynamic(() => import('@monaco-editor/react'), { ssr: false });

export default function Editor({ isCodeQuestion }) {
  const router = useRouter();
  const { code, setCode, setOutput, setError } = useCodeContext();
  const [selectedText, setSelectedText] = useState('');
  const [editorInstance, setEditorInstance] = useState(null);

  useEffect(() => {
    const savedCode = localStorage.getItem('editorCode');
    if (savedCode) {
      setCode(savedCode);
    }
  }, []);

  useEffect(() => {
    if (code !== '# write code here') {
      localStorage.setItem('editorCode', code);
    }
  }, [code]);

  useEffect(() => {
    const handleImport = (event) => {
      if (event.detail && event.detail.code) {
        setCode(event.detail.code);
      }
    };

    window.addEventListener('ide-data-import', handleImport);
    return () => window.removeEventListener('ide-data-import', handleImport);
  }, []);

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
      contextmenu: true, // Enable context menu
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
      // Create a user message object
      const userMessageObject = {
        id: Date.now(),
        text: `Please explain this code:\n\`\`\`python\n${text}\n\`\`\``,
        isUser: true,
        timestamp: new Date()
      };

      // Dispatch a custom event that the AI interface will listen for
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

  const handleEditorChange = (value) => {
    setCode(value);
  };

  return (
    <div className="editor-wrapper">
      <div className="monaco-editor-container">
        <MonacoEditor
          height="100%"
          width="100%"
          language="python"
          theme="light" // Using the default light theme
          value={code}
          onChange={handleEditorChange}
          options={{
            scrollBeyondLastLine: false,
            minimap: { enabled: false },
            scrollbar: {
              horizontal: 'visible',
              vertical: 'visible',
              horizontalScrollbarSize: 12,
              verticalScrollbarSize: 12,
            },
            wordWrap: 'off',
            automaticLayout: true,
            lineNumbers: 'on',
            roundedSelection: true,
            selectOnLineNumbers: true,
          }}
          onMount={handleEditorDidMount}
        />
      </div>
    </div>
  );
}