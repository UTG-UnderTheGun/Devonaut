import dynamic from 'next/dynamic';
import { useState, useEffect } from 'react';
import GlassBox from './glass-box';
import { useCodeContext } from '@/app/context/CodeContext';
import axios from 'axios';
import './editor.css';
import { useRouter } from 'next/navigation';

const MonacoEditor = dynamic(() => import('@monaco-editor/react'), { ssr: false });

export default function Editor({ isCodeQuestion }) {
  const [editorHeight, setEditorHeight] = useState(100);
  const [user, setUser] = useState(null);
  const [textareaHeight, setTextareaHeight] = useState('auto');
  const router = useRouter();
  const { code, setCode, setOutput, setError, setOpenTerm, output, error } = useCodeContext();

  useEffect(() => {
    const savedCode = localStorage.getItem('editorCode');
    if (savedCode) {
      setCode(savedCode);
    }
  }, []);

  useEffect(() => {
    if (code !== '# write code here') { // Only save if it's not the default value
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
    monaco.editor.defineTheme('transparentTheme', {
      base: 'vs-dark',
      inherit: true,
      rules: [],
      minimap: { enabled: false },
      colors: {
        'editor.background': '#00000000',
        'minimap.background': '#00000000',
        'scrollbarSlider.background': '#ffffff30',
        'scrollbarSlider.hoverBackground': '#ffffff50',
        'scrollbarSlider.activeBackground': '#ffffff70',
      },
    });
    editor.updateOptions({ theme: 'transparentTheme' });
  };

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await axios.get('http://localhost:8000/users/me', {
          withCredentials: true,
        });
        setUser(response.data);
      } catch (err) {
        console.error('Error fetching user:', err);
        setError('Not authenticated');
        router.push('/auth/signin');
      }
    };
    fetchUser();
  }, [router]);

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

  const calculateEditorHeight = (lineCount) => {
    const lineHeight = 18;
    const calculatedHeight = lineCount * lineHeight;
    setEditorHeight(calculatedHeight);
  };

  useEffect(() => {
    const lineCount = code.split('\n').length;
    calculateEditorHeight(lineCount);
  }, [code]);

  const handleEditorChange = (value) => {
    setCode(value);
  };

  return (
    <div className="content-container">
      <div className="code-question-content">
        <div className="editor" style={{ height: "500px" }}>
          <MonacoEditor
            height="100%"
            width="100%"
            language="python"
            theme="transparentTheme"
            value={code}
            onChange={handleEditorChange}
            options={{
              scrollBeyondLastLine: false,
              minimap: { enabled: false },
              contextmenu: false,
              automaticLayout: true,
            }}
            onMount={handleEditorDidMount}
          />
        </div>
      </div>
    </div>
  );
}
