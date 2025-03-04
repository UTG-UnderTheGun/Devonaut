import React, { useState, useEffect } from 'react';
import Editor from '@/components/editor';
import StorageManager from '@/components/StorageManager';
import Header from '@/components/header';
import { PrismLight as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vs } from 'react-syntax-highlighter/dist/cjs/styles/prism';
import python from 'react-syntax-highlighter/dist/cjs/languages/prism/python';
import './EditorSection.css';
import { useCodeContext } from '@/app/context/CodeContext';
import axios from 'axios';

// Register Python language
SyntaxHighlighter.registerLanguage('python', python);

const EditorSection = ({
  testType,
  problems,
  currentProblemIndex,
  problemCodes,
  code,
  handleCodeChange,
  editorRef,
  setTestType,
  handleImport,
  handlePreviousProblem,
  handleNextProblem,
  answers,
  setAnswers,
  consoleOutput,
  setConsoleOutput,
  handleReset,
  title,
  setTitle,
  description,
  setDescription,
  setSelectedDescriptionTab,
  handleClearImport
}) => {
  const [showEmptyState, setShowEmptyState] = useState(true);
  const [outputAnswers, setOutputAnswers] = useState({});
  const [editorCodes, setEditorCodes] = useState({});
  const { setOutput, setError } = useCodeContext();
  const [isImport, setIsImport] = useState(false)

  // This wrapper is used when StorageManager calls onImport.
  const handleImportWrapper = async (data) => {
    handleClearImport()
    localStorage.setItem('saved-problems', JSON.stringify(data));
    handleImport(data);
  };

  // Load saved problems and other data from localStorage on mount.
  // IMPORTANT: We removed the call to handleImport here to avoid double importing.
  useEffect(() => {
    const savedProblems = localStorage.getItem('saved-problems');
    const savedAnswers = localStorage.getItem('problem-answers');
    const savedCode = localStorage.getItem(`code-${testType}-${currentProblemIndex}`);
    const savedOutputs = localStorage.getItem('problem-outputs');

    if (savedProblems) {
      const parsedProblems = JSON.parse(savedProblems);
      if (parsedProblems.length > 0) {
        setShowEmptyState(false);
        // Instead of calling handleImport(parsedProblems) here,
        // we assume the parent already imported problems on initial load.
        // However, we still update outputAnswers if expectedOutput is found.
        const newOutputAnswers = { ...outputAnswers };
        parsedProblems.forEach((problem, index) => {
          if (problem.expectedOutput && !newOutputAnswers[index]) {
            newOutputAnswers[index] = problem.expectedOutput;
          }
        });
        if (Object.keys(newOutputAnswers).length > 0) {
          setOutputAnswers(newOutputAnswers);
          localStorage.setItem('problem-outputs', JSON.stringify(newOutputAnswers));
        }
      }
    }

    if (savedAnswers) {
      setAnswers(JSON.parse(savedAnswers));
    }

    if (savedCode) {
      handleCodeChange(savedCode);
    }

    if (savedOutputs) {
      setOutputAnswers(JSON.parse(savedOutputs));
    }
    // We intentionally use an empty dependency array so this runs only once.
  }, []);

  useEffect(() => {
    const loadProblemData = () => {
      if (!problems || !problems[currentProblemIndex]) return;

      const currentProblem = problems[currentProblemIndex];
      const currentType = currentProblem.type || testType;

      if (setTestType && currentType !== testType) {
        setTestType(currentType);
      }

      const keysToTry = [
        `code-${currentType}-${currentProblemIndex}`,
        `editor-code-${currentType}-${currentProblemIndex}`,
        `code-${testType}-${currentProblemIndex}`,
        `starter-code-${currentProblemIndex}`
      ];

      let foundCode = null;
      for (const key of keysToTry) {
        const savedCode = localStorage.getItem(key);
        if (savedCode) {
          foundCode = savedCode;
          console.log(`Found code for problem ${currentProblemIndex + 1} with key: ${key}`);
          break;
        }
      }

      if (!foundCode && currentProblem.starterCode) {
        foundCode = currentProblem.starterCode;
        console.log(`Using starter code for problem ${currentProblemIndex + 1}`);
      }

      if (foundCode) {
        setEditorCodes(prev => ({
          ...prev,
          [currentProblemIndex]: foundCode
        }));
        if (editorRef.current) {
          editorRef.current.setValue(foundCode);
        }
        if (handleCodeChange) {
          handleCodeChange(foundCode);
        }
      }
    };

    loadProblemData();
  }, [currentProblemIndex, problems, testType]);

  const handleEditorChange = (value) => {
    setEditorCodes(prev => ({
      ...prev,
      [currentProblemIndex]: value
    }));
    const currentProblem = problems && problems[currentProblemIndex];
    const currentType = currentProblem ? currentProblem.type || testType : testType;
    localStorage.setItem(`code-${currentType}-${currentProblemIndex}`, value);
    if (typeof handleCodeChange === 'function') {
      handleCodeChange(value);
    }
  };

  const handleResetAll = () => {
    setShowEmptyState(true);
    if (editorRef.current) {
      editorRef.current.setValue('');
    }
    setEditorCodes({});
    setOutputAnswers({});
    setTitle('');
    setDescription('');
    setConsoleOutput('');
    setAnswers({});
    setSelectedDescriptionTab('Description');

    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        if (
          key.startsWith('code-') ||
          key.startsWith('editor-code-') ||
          key === 'editorCode' ||
          key.startsWith('starter-code-')
        ) {
          keysToRemove.push(key);
        }
        if (key.includes(`-${currentProblemIndex}`)) {
          keysToRemove.push(key);
        }
        if (
          key === 'problem-outputs' ||
          key === 'problem-answers' ||
          key === 'problem-title' ||
          key === 'problem-description'
        ) {
          keysToRemove.push(key);
        }
      }
    }
    console.log("Removing keys:", keysToRemove);
    keysToRemove.forEach(key => localStorage.removeItem(key));
    const outputKey = `output-${currentProblemIndex}`;
    localStorage.removeItem(outputKey);
    localStorage.removeItem('problem-outputs');

    if (handleReset) {
      handleReset();
    }
    const resetEvent = new CustomEvent('code-reset', {
      detail: { problemIndex: currentProblemIndex }
    });
    window.dispatchEvent(resetEvent);
    console.log("Reset complete for problem", currentProblemIndex);
  };

  useEffect(() => {
    console.log("Problems:", problems);
    console.log("Current problem:", problems[currentProblemIndex]);
    console.log("Test type:", testType);
    if (problems && problems.length > 0 && problems[currentProblemIndex] &&
      (problems[currentProblemIndex].title || problems[currentProblemIndex].description)) {
      setShowEmptyState(false);
    } else {
      setShowEmptyState(true);
    }
  }, [problems, currentProblemIndex, testType]);

  useEffect(() => {
    const handleStorageReset = (event) => {
      console.log("Storage reset detected:", event.detail);
      setEditorCodes({});
      setOutputAnswers({});
      if (editorRef.current) {
        editorRef.current.setValue('');
      }
    };
    window.addEventListener('storage-reset', handleStorageReset);
    return () => window.removeEventListener('storage-reset', handleStorageReset);
  }, []);

  useEffect(() => {
    if (problems && problems.length > 0 && problems[currentProblemIndex] && testType === 'output') {
      const currentProblem = problems[currentProblemIndex];
      if (currentProblem.expectedOutput && currentProblem.expectedOutput.trim() !== '') {
        setOutputAnswers(prev => {
          const newOutputAnswers = { ...prev };
          if (!newOutputAnswers[currentProblemIndex]) {
            newOutputAnswers[currentProblemIndex] = currentProblem.expectedOutput;
            localStorage.setItem('problem-outputs', JSON.stringify(newOutputAnswers));
            console.log(`Set output answer for problem ${currentProblemIndex} to: ${currentProblem.expectedOutput}`);
          }
          return newOutputAnswers;
        });
      }
    }
  }, [problems, currentProblemIndex, testType]);

  const handleRunCode = async () => {
    try {
      const response = await axios.post('http://localhost:8000/code/run-code', { code }, { withCredentials: true });
      if (response.data.error) {
        setError(response.data.error);
        setOutput('');
        setConsoleOutput('');
      } else {
        setOutput(response.data.output);
        setError('');
        setConsoleOutput(response.data.output);
      }
    } catch (err) {
      console.log(err);
      setError('Error connecting to the server');
      setOutput('');
      setConsoleOutput('');
    }
  };

  const handleSubmitCode = () => {
    console.log('Submitting code...');
  };

  return (
    <div className="code-editor">
      <div className="editor-header">
        <Header />
        <div className="file-section">{/* Test type selector removed */}</div>
        <div className="right-section">
          <div className="coding-actions">
            <button onClick={handleRunCode} className="btn-compact">
              <span className="action-icon">▶</span>
              Run
            </button>
          </div>
          <div className="import-section">
            <StorageManager onImport={handleImportWrapper} currentProblemIndex={currentProblemIndex} testType={testType} />
            <button onClick={handleResetAll} className="icon-button" title="Reset"></button>
          </div>
          {!showEmptyState && problems && problems.length > 0 && problems[0].title && (
            <div className="navigation-section">
              <span className="problem-count">
                Problem {currentProblemIndex + 1} of {problems.length}
              </span>
              <div className="nav-arrows">
                <button className="nav-button" onClick={handlePreviousProblem} disabled={currentProblemIndex === 0}>
                  ←
                </button>
                <button className="nav-button" onClick={handleNextProblem} disabled={currentProblemIndex === problems.length - 1}>
                  →
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {showEmptyState ? (
        <div className="empty-state">
          <Editor
            ref={editorRef}
            isCodeQuestion={true}
            initialValue=""
            onChange={handleEditorChange}
            problemIndex={currentProblemIndex}
            testType={testType}
          />
        </div>
      ) : (
        renderEditorContent()
      )}
    </div>
  );

  function renderEditorContent() {
    console.log("Rendering with type:", testType);
    if (!problems || !problems[currentProblemIndex]) {
      console.log("No problem found at index", currentProblemIndex);
      return <div className="empty-problem">ไม่พบข้อมูลของโจทย์ โปรดตรวจสอบการนำเข้าข้อมูล</div>;
    }
    const currentProblem = problems[currentProblemIndex];
    console.log("Current problem:", currentProblem);
    const effectiveTestType = currentProblem.type || testType;
    console.log("Effective test type:", effectiveTestType);
    if (effectiveTestType !== testType && setTestType) {
      console.log("Updating test type to", effectiveTestType);
      setTestType(effectiveTestType);
    }
    const getSavedCode = () => {
      const stateCode = editorCodes[currentProblemIndex];
      if (stateCode) {
        console.log("Found code in state");
        return stateCode;
      }
      const keysToTry = [
        `code-${effectiveTestType}-${currentProblemIndex}`,
        `editor-code-${effectiveTestType}-${currentProblemIndex}`,
        `code-${testType}-${currentProblemIndex}`,
        `starter-code-${currentProblemIndex}`
      ];
      for (const key of keysToTry) {
        const savedCode = localStorage.getItem(key);
        if (savedCode) {
          console.log(`Found code with key: ${key}`);
          return savedCode;
        }
      }
      if (currentProblem.starterCode) {
        console.log("Using starter code from problem");
        return currentProblem.starterCode;
      }
      if (currentProblem.code) {
        console.log("Using code from problem");
        return currentProblem.code;
      }
      console.log("No code found, returning empty string");
      return '';
    };

    let currentCode = '';
    try {
      currentCode = getSavedCode() || '';
      console.log("Code loaded:", currentCode.substring(0, 50) + "...");
    } catch (error) {
      console.error("Error getting code:", error);
      return <div className="error">เกิดข้อผิดพลาดในการโหลดโค้ด: {error.message}</div>;
    }

    switch (effectiveTestType) {
      case 'code':
        console.log("Rendering code type");
        return (
          <Editor
            ref={editorRef}
            isCodeQuestion={true}
            initialValue={currentCode}
            onChange={handleEditorChange}
            problemIndex={currentProblemIndex}
            testType={effectiveTestType}
          />
        );
      case 'output':
        console.log("Rendering output type");
        return (
          <div className="output-question">
            <div className="question-title">{currentProblem.title || ''}</div>
            <div className="question-description">{currentProblem.description || ''}</div>
            <div className="code-display">
              <SyntaxHighlighter language="python" style={vs} customStyle={{ margin: 0, padding: '1rem', background: 'transparent', fontSize: '14px', lineHeight: '1.6' }}>
                {currentCode}
              </SyntaxHighlighter>
            </div>
            <div className="answer-section">
              <textarea
                placeholder="ใส่คำตอบของคุณ..."
                className="output-input"
                value={outputAnswers[currentProblemIndex] || ''}
                onChange={(e) => {
                  const newOutputAnswers = { ...outputAnswers, [currentProblemIndex]: e.target.value };
                  setOutputAnswers(newOutputAnswers);
                  localStorage.setItem('problem-outputs', JSON.stringify(newOutputAnswers));
                  console.log(`Updated output answer for problem ${currentProblemIndex} to: ${e.target.value}`);
                }}
                rows={1}
                onInput={(e) => {
                  e.target.style.height = 'auto';
                  e.target.style.height = e.target.scrollHeight + 'px';
                }}
              />
            </div>
          </div>
        );
      case 'fill':
        console.log("Rendering fill type");
        if (!currentCode) {
          return <div className="fill-question empty">ไม่พบข้อมูลสำหรับโจทย์นี้</div>;
        }
        let codeParts = [];
        try {
          codeParts = currentCode.split('____');
        } catch (error) {
          console.error("Error splitting code:", error);
          return <div className="error">เกิดข้อผิดพลาดในการแบ่งโค้ด: {error.message}</div>;
        }
        return (
          <div className="fill-question">
            <div className="question-title">{currentProblem.title || ''}</div>
            <div className="question-description">{currentProblem.description || ''}</div>
            <div className="code-display">
              <pre style={{ margin: 0, background: 'transparent' }}>
                {codeParts.map((part, index, array) => (
                  <React.Fragment key={index}>
                    <SyntaxHighlighter
                      language="python"
                      style={vs}
                      customStyle={{ margin: 0, padding: 0, background: 'transparent', display: 'inline', fontSize: '14px', lineHeight: '1.6' }}
                      PreTag="span"
                    >
                      {part}
                    </SyntaxHighlighter>
                    {index < array.length - 1 && (
                      <input
                        type="text"
                        className="code-blank-inline"
                        placeholder="เติมคำตอบ..."
                        value={answers[`blank-${currentProblemIndex + 1}-${index}`] || ''}
                        onChange={(e) => {
                          const newAnswers = { ...answers, [`blank-${currentProblemIndex + 1}-${index}`]: e.target.value };
                          setAnswers(newAnswers);
                          localStorage.setItem('problem-answers', JSON.stringify(newAnswers));
                        }}
                      />
                    )}
                  </React.Fragment>
                ))}
              </pre>
            </div>
          </div>
        );
      default:
        console.warn("Unknown test type:", effectiveTestType);
        return <div className="unknown-type">ไม่รู้จักประเภทโจทย์: {effectiveTestType}</div>;
    }
  }
};

export default EditorSection;
