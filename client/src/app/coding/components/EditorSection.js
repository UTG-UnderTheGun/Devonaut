import React from 'react';
import Editor from '@/components/editor';
import StorageManager from '@/components/StorageManager';
import { PrismLight as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vs } from 'react-syntax-highlighter/dist/cjs/styles/prism';
import python from 'react-syntax-highlighter/dist/cjs/languages/prism/python';

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
  setConsoleOutput
}) => {
  return (
    <div className="code-editor">
      <div className="editor-header">
        <div className="file-section">
          <select 
            value={testType}
            onChange={(e) => setTestType(e.target.value)}
            className="test-type-selector"
          >
            <option value="code">เขียนโค้ดตามโจทย์</option>
            <option value="output">ทายผลลัพธ์ของโค้ด</option>
            <option value="fill">เติมโค้ดในช่องว่าง</option>
          </select>
        </div>

        <div className="right-section">
          <div className="import-section">
            <StorageManager 
              onImport={handleImport}
              currentProblemIndex={currentProblemIndex}
              testType={testType}
            />
          </div>

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
        </div>
      </div>

      {/* แสดงส่วนของ Editor ตาม type */}
      {renderEditorContent()}
    </div>
  );

  function renderEditorContent() {
    const getSavedCode = () => {
      const savedCode = localStorage.getItem(`code-${testType}-${currentProblemIndex}`);
      if (savedCode) return savedCode;
      const starterCode = localStorage.getItem(`starter-code-${currentProblemIndex}`);
      return starterCode || problems[currentProblemIndex].starterCode;
    };

    const renderHighlightedCode = (code) => (
      <SyntaxHighlighter
        language="python"
        style={vs}
        customStyle={{
          margin: 0,
          padding: '1rem',
          background: '#f8f9fa',
          borderRadius: '4px',
          fontSize: '0.875rem',
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
            <div className="code-display">
              {renderHighlightedCode(getSavedCode())}
            </div>
            <div className="answer-section">
              <textarea
                placeholder="Enter your answer..."
                className="output-input"
                value={consoleOutput}
                onChange={(e) => {
                  setConsoleOutput(e.target.value);
                  localStorage.setItem(`output-${currentProblemIndex}`, e.target.value);
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