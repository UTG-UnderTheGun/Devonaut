import dynamic from 'next/dynamic';
import { useState, useEffect } from 'react';
import GlassBox from './glass-box';
import { useCodeContext } from '@/app/context/CodeContext';
import axios from 'axios';
import './editor.css';

const MonacoEditor = dynamic(() => import('@monaco-editor/react'), { ssr: false });

export default function Editor({ isCodeQuestion }) {
  const [code, setCode] = useState('# write code here');
  const [editorHeight, setEditorHeight] = useState(100);
  const [textareaHeight, setTextareaHeight] = useState('auto'); // State for textarea height

  const { setOutput, setError, setOpenTerm, output, error } = useCodeContext();

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

  const handleRunCode = async () => {
    setOpenTerm(true);
    try {
      const response = await axios.post('http://localhost:8000/code/run-code', {
        code,
      });

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

  const handleTextareaInput = (event) => {
    const textarea = event.target;
    textarea.style.height = 'auto';
    textarea.style.height = `${textarea.scrollHeight}px`;
    setTextareaHeight(`${textarea.scrollHeight}px`);
  };

  return (
    <div className="content-container">
      <GlassBox size={{ width: '95%', borderRadius: '0 0 0.5rem 0.5rem', backgroundColor: "#2B2B2B" }}>
        <div className="code-question-content">
          {isCodeQuestion &&
            <div className='output-example'>
              <GlassBox size={{ width: '90%', borderRadius: '0 0 .5rem .5rem', backgroundColor: "#404040" }}>
                <div className='example-content-container'>
                  <div className='example-terminal'>
                    Terminal
                  </div>
                  <hr />
                  <div className='example-content'>
                    <textarea
                      className='example-input'
                      onInput={handleTextareaInput}
                      style={{ height: textareaHeight, overflow: 'hidden' }}
                    />
                  </div>
                </div>
              </GlassBox>
            </div>
          }
          <div className="editor" style={{ height: `${editorHeight}px`, overflow: 'hidden' }}>
            <div className='run-test-container'>
              <button className='run-button' onClick={handleRunCode}>Run</button>
              <button className='test-button'>Test</button>
            </div>
            <MonacoEditor
              height="100%"
              language="python"
              theme="transparentTheme"
              value={code}
              onChange={(value) => setCode(value)}
              options={{
                scrollBeyondLastLine: false,
                scrollbar: {
                  vertical: 'hidden',
                },
                minimap: { enabled: false },
                contextmenu: false,
                automaticLayout: true,
              }}
              onMount={handleEditorDidMount}
            />
          </div>
        </div>
      </GlassBox >
    </div >
  );
}
