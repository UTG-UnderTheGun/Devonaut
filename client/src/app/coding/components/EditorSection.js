import React from 'react';
import Editor from '@/components/editor';
import StorageManager from '@/components/StorageManager';
import { PrismLight as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vs } from 'react-syntax-highlighter/dist/cjs/styles/prism';
import python from 'react-syntax-highlighter/dist/cjs/languages/prism/python';
import { BiRefresh } from "react-icons/bi";
import './EditorSection.css';

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
  setSelectedDescriptionTab
}) => {
  const [showEmptyState, setShowEmptyState] = React.useState(true);
  const [outputAnswers, setOutputAnswers] = React.useState({});
  const [isImported, setIsImported] = React.useState(false);

  const handleImportWrapper = (data) => {
    // Set flag that we're using imported data
    setIsImported(true);
    
    // Clear any existing code in localStorage for this problem
    for (let i = 0; i < 100; i++) {
      localStorage.removeItem(`code-code-${i}`);
      localStorage.removeItem(`code-output-${i}`);
      localStorage.removeItem(`code-fill-${i}`);
      localStorage.removeItem(`starter-code-${i}`);
    }
    
    // Store the imported data
    localStorage.setItem('saved-problems', JSON.stringify(data));
    
    // Call the original import handler
    handleImport(data);
    
    // If the imported data has code, update the editor directly
    if (Array.isArray(data)) {
      if (data[currentProblemIndex] && data[currentProblemIndex].code) {
        // Update the editor with the imported code
        if (editorRef.current) {
          editorRef.current.setValue(data[currentProblemIndex].code);
        }
        handleCodeChange(data[currentProblemIndex].code);
      }
    } else if (data.code) {
      // Update the editor with the imported code
      if (editorRef.current) {
        editorRef.current.setValue(data.code);
      }
      handleCodeChange(data.code);
    }
    
    // Force a re-render
    setShowEmptyState(false);
  };

  React.useEffect(() => {
    const savedProblems = localStorage.getItem('saved-problems');
    const savedAnswers = localStorage.getItem('problem-answers');
    const savedOutputs = localStorage.getItem('problem-outputs');

    if (savedProblems) {
      const parsedProblems = JSON.parse(savedProblems);
      if (parsedProblems.length > 0) {
        setShowEmptyState(false);
        setIsImported(true);
        if (typeof handleImport === 'function') {
          handleImport(parsedProblems);
        }
      }
    }

    if (savedAnswers) {
      setAnswers(JSON.parse(savedAnswers));
    }

    if (savedOutputs) {
      setOutputAnswers(JSON.parse(savedOutputs));
    }
    
    // Only load code from localStorage if we haven't imported data
    if (!isImported) {
      const savedCode = localStorage.getItem(`code-${testType}-${currentProblemIndex}`);
      if (savedCode) {
        handleCodeChange(savedCode);
      }
    }
  }, []);

  const handleResetAll = () => {
    setShowEmptyState(true);
    setIsImported(false);
    
    if (editorRef.current) {
      editorRef.current.setValue('');
    }

    // Clear all localStorage items
    localStorage.removeItem('saved-problems');
    localStorage.removeItem('problem-answers');
    localStorage.removeItem('problem-outputs');
    
    // Clear all code-related localStorage items
    for (let i = 0; i < 100; i++) {
      localStorage.removeItem(`code-code-${i}`);
      localStorage.removeItem(`code-output-${i}`);
      localStorage.removeItem(`code-fill-${i}`);
      localStorage.removeItem(`starter-code-${i}`);
    }
    
    setOutputAnswers({});
    setTitle('');
    setDescription('');
    setConsoleOutput('');
    setAnswers({});
    setSelectedDescriptionTab('Description');

    if (handleReset) {
      handleReset();
    }
  };

  React.useEffect(() => {
    if (problems && problems.length > 0 && problems[0].title) {
      setShowEmptyState(false);
    } else {
      setShowEmptyState(true);
    }
  }, [problems]);

  return (
    <div className="code-editor">
      <div className="editor-header">
        <div className="file-section">
          {/* Test type selector removed */}
        </div>

        <div className="right-section">
          <div className="import-section">
            <StorageManager 
              onImport={handleImportWrapper}
              currentProblemIndex={currentProblemIndex}
              testType={testType}
            />
            <button 
              onClick={handleResetAll} 
              className="icon-button"
              title="Reset"
            >
              <BiRefresh size={18} />
            </button>
          </div>
          {/* Only show navigation when problems exist and not in empty state */}
          {!showEmptyState && problems && problems.length > 0 && problems[0].title && (
            <div className="navigation-section">
              <span className="problem-count">
                Problem {currentProblemIndex + 1} of {problems.length}
              </span>
              <div className="nav-arrows">
                <button
                  className="nav-button"
                  onClick={handlePreviousProblem}
                  disabled={currentProblemIndex === 0}
                >
                  ←
                </button>
                <button
                  className="nav-button"
                  onClick={handleNextProblem}
                  disabled={currentProblemIndex === problems.length - 1}
                >
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
            onChange={(value) => {
              if (value.trim() !== '') {
                localStorage.setItem('editorCode', value);
              }
              handleCodeChange(value);
            }}
          />
        </div>
      ) : (
        renderEditorContent()
      )}
    </div>
  );

  function getSavedCode() {
    // If we're using imported data, prioritize the code from problems array
    if (isImported && problems && problems[currentProblemIndex]) {
      // ตรวจสอบว่ามี code ใน problems หรือไม่
      if (problems[currentProblemIndex].code) {
        return problems[currentProblemIndex].code;
      }
      // ถ้าไม่มี code ให้ใช้ starterCode
      return problems[currentProblemIndex].starterCode || '';
    }
    
    // Otherwise check localStorage
    const savedCode = localStorage.getItem(`code-${testType}-${currentProblemIndex}`);
    if (savedCode) return savedCode;
    
    const starterCode = localStorage.getItem(`starter-code-${currentProblemIndex}`);
    return starterCode || (problems[currentProblemIndex] ? 
      (problems[currentProblemIndex].code || problems[currentProblemIndex].starterCode) : '');
  }

  function renderEditorContent() {
    const renderHighlightedCode = (code) => (
      <SyntaxHighlighter
        language="python"
        style={vs}
        customStyle={{
          margin: 0,
          padding: '1rem',
          background: 'transparent',
          fontSize: '14px',
          lineHeight: '1.6'
        }}
      >
        {code}
      </SyntaxHighlighter>
    );

    switch (testType) {
      case 'code':
        return (
          <Editor
            ref={editorRef}
            isCodeQuestion={true}
            initialValue={getSavedCode()}
            onChange={handleCodeChange}
          />
        );
      case 'output':
        return (
          <div className="output-question">
            <div className="question-title">
              {problems[currentProblemIndex].title}
            </div>
            {problems[currentProblemIndex].description && (
              <div className="question-description">
                {problems[currentProblemIndex].description}
              </div>
            )}
            <div className="code-display">
              {renderHighlightedCode(getSavedCode())}
            </div>
            <div className="answer-section">
              <textarea
                placeholder="Enter your answer..."
                className="output-input"
                value={outputAnswers[currentProblemIndex] || ''}
                onChange={(e) => {
                  const newOutputAnswers = {
                    ...outputAnswers,
                    [currentProblemIndex]: e.target.value
                  };
                  setOutputAnswers(newOutputAnswers);
                  localStorage.setItem('problem-outputs', JSON.stringify(newOutputAnswers));
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
        return (
          <div className="fill-question">
            <div className="question-title">
              {problems[currentProblemIndex].title}
            </div>
            {problems[currentProblemIndex].description && (
              <div className="question-description">
                {problems[currentProblemIndex].description}
              </div>
            )}
            <div className="code-display">
              <pre style={{ margin: 0, background: 'transparent' }}>
                {getSavedCode().split('____').map((part, index, array) => (
                  <React.Fragment key={index}>
                    <SyntaxHighlighter
                      language="python"
                      style={vs}
                      customStyle={{
                        margin: 0,
                        padding: 0,
                        background: 'transparent',
                        display: 'inline',
                        fontSize: '14px',
                        lineHeight: '1.6'
                      }}
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
                          const newAnswers = {
                            ...answers,
                            [`blank-${currentProblemIndex + 1}-${index}`]: e.target.value
                          };
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
        return null;
    }
  }
};

export default EditorSection; 