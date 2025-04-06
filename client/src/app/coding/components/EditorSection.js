import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Editor from '@/components/editor';
import StorageManager from '@/components/StorageManager';
import QuestionManager from '@/app/coding/components/QuestionManager'; // Import the new component
import Header from '@/components/header';
import { PrismLight as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vs } from 'react-syntax-highlighter/dist/cjs/styles/prism';
import python from 'react-syntax-highlighter/dist/cjs/languages/prism/python';
import './EditorSection.css';
import { useCodeContext } from '@/app/context/CodeContext';
import axios from 'axios';
import _ from 'lodash';

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
  user_id,
  handleClearImport,
  isConsoleFolded,
  setIsConsoleFolded
}) => {
  const [showEmptyState, setShowEmptyState] = useState(true);
  const [outputAnswers, setOutputAnswers] = useState({});
  const [editorCodes, setEditorCodes] = useState({});
  const { setOutput, setError } = useCodeContext();
  const [isImport, setIsImport] = useState(false);
  const [isImported, setIsImported] = useState(false);
  const [lastKeystrokeTime, setLastKeystrokeTime] = useState(null);
  const KEYSTROKE_DEBOUNCE_TIME = 1000; // 1 second

  // IMPORTANT: Move the debounced function to component level using useMemo
  const debouncedSaveKeystrokes = useMemo(() =>
    _.debounce(async (code, cursorPosition, problemIndex, type) => {
      try {
        const keystrokeData = {
          code: code,
          problem_index: problemIndex,
          test_type: type,
          cursor_position: cursorPosition,
          timestamp: new Date().toISOString()
        };

        await axios.post(
          `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/code/track-keystrokes`,
          keystrokeData,
          { withCredentials: true }
        );
        console.log('Keystrokes tracked successfully');
      } catch (err) {
        console.error('Error tracking keystrokes:', err);
      }
    }, KEYSTROKE_DEBOUNCE_TIME),
    [] // Empty dependency array ensures it's created once
  );

  // Handle import from QuestionManager
  const handleQuestionImport = (questionsData) => {
    // Make sure we have valid data
    if (Array.isArray(questionsData) && questionsData.length > 0) {
      // Call the existing import handler with the force reset parameter
      handleImportWrapper(questionsData, true);
    }
  };

  // This wrapper is used when StorageManager or QuestionManager calls onImport
  const handleImportWrapper = async (data, forceReset = false) => {
    // If forceReset is true, we want to clear chat history
    if (forceReset) {
      await handleClearImport();
    }

    localStorage.setItem('saved-problems', JSON.stringify(data));
    handleImport(data, forceReset);

    // Set the imported flag
    setIsImported(true);
    localStorage.setItem('is-imported', 'true');

    // If we have a valid current problem, update the title and description
    if (data && Array.isArray(data) && data[currentProblemIndex]) {
      const currentProblem = data[currentProblemIndex];
      if (currentProblem.title && setTitle) {
        setTitle(currentProblem.title);
      }
      if (currentProblem.description && setDescription) {
        setDescription(currentProblem.description);
      }
    }
  };

  // Load saved problems and other data from localStorage on mount
  useEffect(() => {
    const savedProblems = localStorage.getItem('saved-problems');
    const savedAnswers = localStorage.getItem('problem-answers');
    const savedCode = localStorage.getItem(`code-${testType}-${currentProblemIndex}`);
    const savedOutputs = localStorage.getItem('problem-outputs');

    // Load problem-specific title and description from localStorage
    const savedTitle = localStorage.getItem(`problem-title-${currentProblemIndex}`);
    const savedDescription = localStorage.getItem(`problem-description-${currentProblemIndex}`);

    if (savedTitle && setTitle) {
      setTitle(savedTitle);
    }

    if (savedDescription && setDescription) {
      setDescription(savedDescription);
    }

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

    // Check if problems are imported in the initial useEffect
    const isImportedFlag = localStorage.getItem('is-imported');

    if (isImportedFlag === 'true') {
      setIsImported(true);
    }

    // We intentionally use an empty dependency array so this runs only once.
  }, []);

  // Track problem access
  const trackProblemAccess = async () => {
    try {
      const historyData = {
        code: code || '',
        problem_index: currentProblemIndex,
        test_type: testType,
        action_type: 'access'
      };

      await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/code/track-code-access`,
        historyData,
        { withCredentials: true }
      );
      console.log(`Access to problem ${currentProblemIndex + 1} tracked`);
    } catch (err) {
      console.error('Error tracking problem access:', err);
    }
  };

  // Load problem-specific title and description when currentProblemIndex changes
  useEffect(() => {
    const savedTitle = localStorage.getItem(`problem-title-${currentProblemIndex}`);
    const savedDescription = localStorage.getItem(`problem-description-${currentProblemIndex}`);

    // Always try to get title and description from localStorage first
    if (savedTitle && setTitle) {
      console.log(`Loading title for problem ${currentProblemIndex} from localStorage: ${savedTitle}`);
      setTitle(savedTitle);
    } else if (problems && problems[currentProblemIndex] && problems[currentProblemIndex].title && setTitle) {
      // Fall back to problems array if localStorage doesn't have it
      console.log(`Loading title for problem ${currentProblemIndex} from problems array: ${problems[currentProblemIndex].title}`);
      setTitle(problems[currentProblemIndex].title);
      // Save to localStorage for future
      localStorage.setItem(`problem-title-${currentProblemIndex}`, problems[currentProblemIndex].title);
    }

    if (savedDescription && setDescription) {
      console.log(`Loading description for problem ${currentProblemIndex} from localStorage: ${savedDescription.substring(0, 30)}...`);
      setDescription(savedDescription);
    } else if (problems && problems[currentProblemIndex] && problems[currentProblemIndex].description && setDescription) {
      // Fall back to problems array if localStorage doesn't have it
      console.log(`Loading description for problem ${currentProblemIndex} from problems array: ${problems[currentProblemIndex].description.substring(0, 30)}...`);
      setDescription(problems[currentProblemIndex].description);
      // Save to localStorage for future
      localStorage.setItem(`problem-description-${currentProblemIndex}`, problems[currentProblemIndex].description);
    }

    // Track problem access
    if (problems && problems[currentProblemIndex]) {
      trackProblemAccess();
    }
  }, [currentProblemIndex, problems]);

  const handleRunCode = async () => {
    // If console is folded, unfold it before running code
    if (setConsoleOutput && isConsoleFolded) {
      setIsConsoleFolded(false);
    }

    try {
      const response = await axios.post(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/code/run-code`, { code }, { withCredentials: true });
      if (response.data.error) {
        setError(response.data.error);
        setOutput('');
        setConsoleOutput('');
      } else {
        setOutput(response.data.output);
        setError('');
        setConsoleOutput(response.data.output);
      }

      // Save code history with problem index
      try {
        const historyData = {
          code: code,
          problem_index: currentProblemIndex,
          test_type: testType,
          output: response.data.output || '',
          error: response.data.error || '',
          is_submission: false,
          action_type: 'run'
        };

        // Explicitly save history with all the data we want to track
        await axios.post(
          `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/code/save-code-history`,
          historyData,
          { withCredentials: true }
        );
        console.log('Code history saved successfully with problem index:', currentProblemIndex);
      } catch (historyError) {
        console.error('Error saving code history:', historyError);
      }

    } catch (err) {
      console.log(err);
      setError('Error connecting to the server');
      setOutput('');
      setConsoleOutput('');
    }
  };

  // Handle editor change
  const handleEditorChange = (value) => {
    setEditorCodes(prev => ({
      ...prev,
      [currentProblemIndex]: value
    }));

    // Save to localStorage
    if (problems && problems[currentProblemIndex]) {
      const currentType = problems[currentProblemIndex].type || testType;
      localStorage.setItem(`code-${currentType}-${currentProblemIndex}`, value);
    }

    // Call parent handler if provided
    if (typeof handleCodeChange === 'function') {
      handleCodeChange(value);
    }

    // Track keystrokes with debouncing
    const now = Date.now();
    if (!lastKeystrokeTime || now - lastKeystrokeTime >= KEYSTROKE_DEBOUNCE_TIME) {
      // Get cursor position if editor reference is available
      let cursorPosition = null;
      if (editorRef.current) {
        const model = editorRef.current.getModel();
        const selection = editorRef.current.getSelection();
        if (model && selection) {
          cursorPosition = {
            lineNumber: selection.positionLineNumber,
            column: selection.positionColumn
          };
        }
      }

      // Call debounced keystroke tracking
      debouncedSaveKeystrokes(value, cursorPosition, currentProblemIndex, testType);
      setLastKeystrokeTime(now);
    }
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

            {/* Add Question Manager component here */}
            <QuestionManager onImport={handleQuestionImport} />

          </div>
          <div className="import-section">
            <StorageManager onImport={handleImportWrapper} currentProblemIndex={currentProblemIndex} testType={testType} />
            <button onClick={handleReset} className="icon-button" title="Reset">Reset</button>
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

  // renderEditorContent function to display the appropriate editor based on question type
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

    // Get saved code for the current problem
    const getSavedCode = () => {
      // Check if we're in a reset state first
      const isResetState = showEmptyState || !localStorage.getItem('saved-problems');
      if (isResetState) {
        console.log("In reset state, returning empty code");
        return '';
      }

      // Check component state first
      const stateCode = editorCodes[currentProblemIndex];
      if (stateCode) {
        console.log("Found code in state");
        return stateCode;
      }

      // Try various localStorage keys - prioritize the new format
      const keysToTry = [
        // New key format (most specific first)
        `problem-code-${effectiveTestType}-${currentProblemIndex}`,
        
        // Legacy key formats for backward compatibility
        `code-${effectiveTestType}-${currentProblemIndex}`,
        `editor-code-${effectiveTestType}-${currentProblemIndex}`,
        `code-${testType}-${currentProblemIndex}`,
        `problem-code-${currentProblemIndex}`,
        `starter-code-${currentProblemIndex}`
      ];

      for (const key of keysToTry) {
        const savedCode = localStorage.getItem(key);
        if (savedCode) {
          console.log(`Found code with key: ${key}`);
          // If we found code with an old key format, migrate it to the new format
          if (key !== `problem-code-${effectiveTestType}-${currentProblemIndex}`) {
            console.log(`Migrating code from ${key} to problem-code-${effectiveTestType}-${currentProblemIndex}`);
            localStorage.setItem(`problem-code-${effectiveTestType}-${currentProblemIndex}`, savedCode);
          }
          return savedCode;
        }
      }

      // Fall back to problem definition
      if (currentProblem.starterCode) {
        console.log("Using starter code from problem");
        // Store this as the initial code for this problem and type
        localStorage.setItem(`problem-code-${effectiveTestType}-${currentProblemIndex}`, currentProblem.starterCode);
        return currentProblem.starterCode;
      }

      if (currentProblem.code) {
        console.log("Using code from problem");
        // Store this as the initial code for this problem and type
        localStorage.setItem(`problem-code-${effectiveTestType}-${currentProblemIndex}`, currentProblem.code);
        return currentProblem.code;
      }

      console.log("No code found, returning empty string");
      return '';
    };

    // Get the current code
    let currentCode = '';
    try {
      currentCode = getSavedCode() || '';
      console.log("Code loaded:", currentCode.substring(0, 50) + "...");
    } catch (error) {
      console.error("Error getting code:", error);
      return <div className="error">เกิดข้อผิดพลาดในการโหลดโค้ด: {error.message}</div>;
    }

    // Render appropriate editor based on test type
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
                  const newValue = e.target.value;
                  const newOutputAnswers = { ...outputAnswers, [currentProblemIndex]: newValue };
                  setOutputAnswers(newOutputAnswers);
                  localStorage.setItem('problem-outputs', JSON.stringify(newOutputAnswers));
                  
                  // If we have an imported problem, also update its userAnswers properties
                  if (problems && problems[currentProblemIndex] && problems[currentProblemIndex].userAnswers) {
                    problems[currentProblemIndex].userAnswers.answer = newValue;
                    problems[currentProblemIndex].userAnswers.outputAnswer = newValue;
                    
                    // Update in localStorage to persist
                    localStorage.setItem('saved-problems', JSON.stringify(problems));
                  }
                  
                  console.log(`Updated output answer for problem ${currentProblemIndex} to: ${newValue}`);
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
