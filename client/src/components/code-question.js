import './code-question.css';
import dynamic from 'next/dynamic';
import { useState, useEffect } from 'react';
import GlassBox from './glass-box';

const MonacoEditor = dynamic(() => import('@monaco-editor/react'), { ssr: false });

export default function CodeQuestion({ children }) {
  const [question, setQuestion] = useState('');
  const [code, setCode] = useState('// write code here');
  const [editorHeight, setEditorHeight] = useState(100); // Initial height in pixels

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

  const calculateEditorHeight = (lineCount) => {
    const lineHeight = 18; // Average line height in pixels
    const calculatedHeight = lineCount * lineHeight;

    // Set the editor height based on calculated height or max height
    setEditorHeight(calculatedHeight);
  };

  useEffect(() => {
    const lineCount = code.split('\n').length; // Count lines based on the current code
    calculateEditorHeight(lineCount);
  }, [code]); // Recalculate height when code changes

  return (
    <div className="home-question-container">
      <div className="inner-codequestion-container">
        <div className="question-content">
          <input
            className="input-question"
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Input question here"
          />
        </div>
        <div className="content-container">
          <GlassBox size={{ width: '95%', borderRadius: '0 0 0.5rem 0.5rem' }}>
            <div className="code-question-content">
              <div className="editor" style={{ height: `${editorHeight}px`, overflow: 'hidden' }}>
                <MonacoEditor
                  className='editor'
                  height="100%" // Keep this 100% to fill the container
                  language="python"
                  theme="transparentTheme"
                  value={code}
                  onChange={(value) => setCode(value)}
                  options={{
                    automaticLayout: true,
                    scrollBeyondLastLine: false, // Disable scrolling beyond the last line
                  }}
                  onMount={handleEditorDidMount}
                />
              </div>
            </div>
          </GlassBox>
        </div>
      </div>
    </div>
  );
}
