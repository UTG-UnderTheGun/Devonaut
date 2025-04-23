import React, { useState, useEffect, useCallback } from 'react';
import Editor from '@/components/editor';
import StorageManager from '@/components/StorageManager';
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

  // This wrapper is used when StorageManager calls onImport.
  const handleImportWrapper = async (data) => {
    handleClearImport();
    localStorage.setItem('saved-problems', JSON.stringify(data));
    handleImport(data);

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

  // Load saved problems and other data from localStorage on mount.
  // IMPORTANT: We removed the call to handleImport here to avoid double importing.
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
          // Check for output answers in the problem's userAnswers
          if (problem.userAnswers && problem.userAnswers.outputAnswer) {
            newOutputAnswers[index] = problem.userAnswers.outputAnswer;
            console.log(`Loaded output answer for problem ${index}:`, problem.userAnswers.outputAnswer);
          }
          // Also check for expectedOutput for backward compatibility
          else if (problem.expectedOutput && !newOutputAnswers[index]) {
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
      const parsedOutputs = JSON.parse(savedOutputs);
      setOutputAnswers(parsedOutputs);
    }

    // Check if problems are imported in the initial useEffect
    const isImportedFlag = localStorage.getItem('is-imported');

    if (isImportedFlag === 'true') {
      setIsImported(true);
    }

    // We intentionally use an empty dependency array so this runs only once.
  }, []);

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

  useEffect(() => {
    // Make sure to save current code before switching problems
    if (code && testType) {
      const previousKey = `code-${testType}-${currentProblemIndex}`;
      console.log(`Saving code for problem ${currentProblemIndex} with key ${previousKey}`);
      localStorage.setItem(previousKey, code);
    }
    
    // Now load code for the new problem
    const loadProblemCode = () => {
      if (!problems || !problems[currentProblemIndex]) return;
      
      const currentProblem = problems[currentProblemIndex];
      const effectiveType = mapExerciseType(currentProblem.type || testType);
      
      // Try to load saved code specifically for this problem
      const key = `code-${effectiveType}-${currentProblemIndex}`;
      const savedCode = localStorage.getItem(key);
      
      console.log(`Attempting to load code for problem ${currentProblemIndex} of type ${effectiveType}`);
      console.log(`Looking for key: ${key}`);
      
      if (savedCode) {
        console.log(`Found saved code for problem ${currentProblemIndex} from ${key}`);
        handleCodeChange(savedCode);
        if (editorRef.current) {
          editorRef.current.setValue(savedCode);
        }
      } else if (currentProblem.code) {
        // If no saved code, use the problem's original code
        console.log(`Using original code for problem ${currentProblemIndex}`);
        handleCodeChange(currentProblem.code);
        if (editorRef.current) {
          editorRef.current.setValue(currentProblem.code);
        }
        // Save this code to localStorage for future
        localStorage.setItem(key, currentProblem.code);
      } else if (currentProblem.starterCode) {
        // Fall back to starter code if no saved code and no original code
        console.log(`Using starter code for problem ${currentProblemIndex}`);
        handleCodeChange(currentProblem.starterCode);
        if (editorRef.current) {
          editorRef.current.setValue(currentProblem.starterCode);
        }
        // Save this code to localStorage for future
        localStorage.setItem(key, currentProblem.starterCode);
      }
    };
    
    loadProblemCode();
  }, [currentProblemIndex, problems, testType]);

  // Create a debounced function to save keystrokes
  const debouncedSaveKeystrokes = useCallback(
    _.debounce(async (code, cursorPosition) => {
      try {
        const keystrokeData = {
          code: code,
          problem_index: currentProblemIndex,
          test_type: testType,
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
    [currentProblemIndex, testType]
  );

  // Update the handleEditorChange function
  const handleEditorChange = (value) => {
    setEditorCodes(prev => ({
      ...prev,
      [currentProblemIndex]: value
    }));

    // Get the current problem type
    const currentProblem = problems && problems[currentProblemIndex];
    const currentType = currentProblem ? currentProblem.type || testType : testType;
    
    // Save code with the correct type and index
    const key = `code-${currentType}-${currentProblemIndex}`;
    localStorage.setItem(key, value);
    console.log(`Saving code for problem ${currentProblemIndex} with key ${key}`);

    if (typeof handleCodeChange === 'function') {
      handleCodeChange(value);
    }

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

    // Track keystrokes with debouncing
    const now = Date.now();
    if (!lastKeystrokeTime || now - lastKeystrokeTime >= KEYSTROKE_DEBOUNCE_TIME) {
      debouncedSaveKeystrokes(value, cursorPosition);
      setLastKeystrokeTime(now);
    }
  };

  const handleResetAll = () => {
    console.log("=== PERFORMING COMPLETE RESET ===");

    // Set a reset timestamp to prevent immediate reloading
    localStorage.setItem('editor_reset_timestamp', Date.now().toString());

    // Reset UI state first
    setShowEmptyState(true);
    setIsImported(false);
    localStorage.removeItem('is-imported');

    // Clear ALL localStorage items related to code
    // This ensures we don't have any lingering items regardless of naming pattern
    const allKeys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        allKeys.push(key);
      }
    }

    // Define all patterns that could match code storage
    const patternsToRemove = [
      /^code-/,           // code-*
      /^editor-code-/,    // editor-code-*
      /^problem-code-/,   // problem-code-*
      /^starter-code-/,   // starter-code-*
      /^problem-title-/,  // problem-title-*
      /^problem-description-/, // problem-description-*
      /^output-/,         // output-*
      /^editorCode$/,     // editorCode (exact match)
      /^problem-code$/,   // problem-code (exact match)
      /^problem-outputs$/,// problem-outputs (exact match)
      /^problem-answers$/,// problem-answers (exact match)
      /^problem-title$/,  // problem-title (exact match)
      /^problem-description$/,// problem-description (exact match)
      /^is-imported$/,    // is-imported (exact match)
      /^saved-problems$/, // saved-problems (exact match)
    ];

    // Filter keys that match any pattern
    const keysToRemove = allKeys.filter(key =>
      patternsToRemove.some(pattern => pattern.test(key))
    );

    console.log("EditorSection: Clearing ALL localStorage keys:", keysToRemove);

    // Remove all matched keys
    keysToRemove.forEach(key => {
      try {
        localStorage.removeItem(key);
      } catch (error) {
        console.error(`Failed to remove key: ${key}`, error);
      }
    });

    // Clear editor content using multiple approaches to ensure it works
    if (editorRef.current) {
      try {
        // First try: direct setValue
        editorRef.current.setValue('');

        // Second try: with a small delay
        setTimeout(() => {
          if (editorRef.current) {
            editorRef.current.setValue('');

            // Some Monaco editor instances may need this
            if (editorRef.current.getModel) {
              const model = editorRef.current.getModel();
              if (model) {
                model.setValue('');
              }
            }
          }
        }, 10);
      } catch (error) {
        console.error("Error clearing editor:", error);
      }
    }

    // Reset all state variables
    setEditorCodes({});
    setOutputAnswers({});
    setTitle('');
    setDescription('');
    setConsoleOutput('');
    setAnswers({});
    setSelectedDescriptionTab('Description');

    // Explicitly update the code through the parent handler
    if (typeof handleCodeChange === 'function') {
      handleCodeChange('');
    }

    // Do a final verification that problem-code-* entries are gone
    setTimeout(() => {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (
          key.startsWith('problem-code-') ||
          key === 'problem-code' ||
          key.startsWith('code-code-')
        )) {
          console.warn(`Key ${key} still exists after cleanup, forcing removal...`);
          localStorage.removeItem(key);
        }
      }

      // Dispatch reset events AFTER cleanup is complete
      const resetEvent = new CustomEvent('code-reset', {
        detail: {
          problemIndex: currentProblemIndex,
          complete: true,
          priority: true,
          timestamp: Date.now()
        }
      });
      window.dispatchEvent(resetEvent);

      const storageResetEvent = new CustomEvent('storage-reset', {
        detail: {
          source: 'reset-button',
          complete: true,
          priority: true,
          timestamp: Date.now()
        }
      });
      window.dispatchEvent(storageResetEvent);

      // Call parent reset handler if provided
      if (handleReset) {
        handleReset();
      }

      console.log("Reset complete for problem", currentProblemIndex);
    }, 20);

    // Force final re-render after a delay as a final fallback
    setTimeout(() => {
      if (editorRef.current) {
        editorRef.current.setValue('');
      }
    }, 100);
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
      // Clear all editor codes in state
      setEditorCodes({});
      setOutputAnswers({});

      // Ensure editor content is cleared
      if (editorRef.current) {
        editorRef.current.setValue('');

        // Force a refresh of the editor content
        setTimeout(() => {
          if (editorRef.current) {
            editorRef.current.setValue('');
          }
        }, 0);
      }

      // If we have a complete reset, make sure to update parent state
      if (event.detail?.complete && typeof handleCodeChange === 'function') {
        handleCodeChange('');
      }
    };

    window.addEventListener('storage-reset', handleStorageReset);
    window.addEventListener('code-reset', handleStorageReset);

    return () => {
      window.removeEventListener('storage-reset', handleStorageReset);
      window.removeEventListener('code-reset', handleStorageReset);
    };
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

  // Add new useEffect to handle output answers when problem changes
  useEffect(() => {
    if (problems && problems[currentProblemIndex]) {
      const currentProblem = problems[currentProblemIndex];
      // Check for saved output answer in the problem's userAnswers
      if (currentProblem.userAnswers && currentProblem.userAnswers.outputAnswer) {
        const savedOutputAnswer = currentProblem.userAnswers.outputAnswer;
        console.log(`Loading saved output answer for problem ${currentProblemIndex}:`, savedOutputAnswer);
        // Update outputAnswers state and localStorage
        setOutputAnswers(prev => {
          const newOutputAnswers = { ...prev, [currentProblemIndex]: savedOutputAnswer };
          localStorage.setItem('problem-outputs', JSON.stringify(newOutputAnswers));
          return newOutputAnswers;
        });
      }
    }
  }, [currentProblemIndex, problems]);

  const handleRunCode = async () => {
    // If console is folded, unfold it before running code
    if (setConsoleOutput && isConsoleFolded) {
      setIsConsoleFolded(false);
    }

    // Get the current code directly from the editor
    const currentCode = editorRef.current ? editorRef.current.getValue() : code;

    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/code/run-code`, 
        { code: currentCode }, 
        { withCredentials: true }
      );
      
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
          code: currentCode,
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

  // Add new effect to sync initial code state
  useEffect(() => {
    if (editorRef.current && code) {
      const currentValue = editorRef.current.getValue();
      if (currentValue !== code) {
        console.log('Syncing initial code state');
        editorRef.current.setValue(code);
      }
    }
  }, [code, editorRef.current]);

  const handleSubmitCode = async () => {
    console.log('Submitting code...');

    try {
      // We should preserve this code since submission is a special type of history
      // that the backend run-code endpoint doesn't handle automatically

      // First run the code to get output
      const runResponse = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/code/run-code`,
        { code },
        { withCredentials: true }
      );

      // Then save the submission history with the special is_submission flag
      const historyData = {
        code: code,
        problem_index: currentProblemIndex,
        test_type: testType,
        output: runResponse.data.output || '',
        error: runResponse.data.error || '',
        is_submission: true,
        action_type: 'submit'
      };

      // This is still needed because the backend run-code endpoint 
      // doesn't mark submissions differently
      await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/code/save-code-history`,
        historyData,
        { withCredentials: true }
      );
      console.log('Code submission history saved successfully');
    } catch (err) {
      console.error('Error saving code submission history:', err);
    }
  };

  const mapExerciseType = (type) => {
    // Map assignment exercise types to editor types, but maintain consistency
    // to avoid infinite loops between "coding" and "code"
    switch(type) {
      case 'coding': return 'code';
      case 'explain': return 'output';
      case 'fill': return 'fill';
      // Don't map "code" back to "coding" to avoid infinite loop
      case 'code': return 'code';
      case 'output': return 'output';
      default: return type;
    }
  };

  useEffect(() => {
    if (editorRef.current && editorRef.current.editor) {
      // Create global reference to monaco editors if it doesn't exist
      if (!window.monacoEditors) {
        window.monacoEditors = [];
      }
      
      // Add this editor instance to the global list if not already there
      if (!window.monacoEditors.includes(editorRef.current.editor)) {
        window.monacoEditors.push(editorRef.current.editor);
        console.log("Added editor to global monaco editors list");
      }
      
      return () => {
        // Remove editor from global list on component unmount
        if (window.monacoEditors) {
          window.monacoEditors = window.monacoEditors.filter(
            editor => editor !== editorRef.current.editor
          );
        }
      };
    }
  }, [editorRef.current]);

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
            <button onClick={handleResetAll} className="icon-button" title="Reset">Reset</button>
          </div>
          {!showEmptyState && problems && problems.length > 0 && problems[0].title && (
            <div className="navigation-section">
              <span className="problem-count">
                Problem {currentProblemIndex + 1} of {problems.length}
              </span>
              <div className="nav-arrows">
                <button className="nav-button prev-button" onClick={handlePreviousProblem} disabled={currentProblemIndex === 0}>
                  <span className="arrow-icon">←</span>
                </button>
                <button className="nav-button next-button" onClick={handleNextProblem} disabled={currentProblemIndex === problems.length - 1}>
                  <span className="arrow-icon">→</span>
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
    
    // Map the problem type for consistency
    const effectiveTestType = mapExerciseType(currentProblem.type || testType);
    console.log("Effective test type:", effectiveTestType);

    // Only update type if the mapped values are different
    if (effectiveTestType !== testType && setTestType && 
        !(
          (testType === 'code' && currentProblem.type === 'coding') || 
          (testType === 'output' && currentProblem.type === 'explain')
        )) {
      console.log("Updating test type to", effectiveTestType);
      setTestType(effectiveTestType);
    }

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

      // Try various localStorage keys
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

      // Fall back to problem definition
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
        // Always use the current problem's code for output type
        const outputCode = currentProblem.code || '';
        console.log(`Using code directly from problem ${currentProblemIndex}:`, outputCode);
        
        return (
          <div className="output-question">
            <div className="question-title">{currentProblem.title || ''}</div>
            <div className="question-description">{currentProblem.description || ''}</div>
            <div className="code-display">
              <SyntaxHighlighter language="python" style={vs} customStyle={{ margin: 0, padding: '1rem', background: 'transparent', fontSize: '14px', lineHeight: '1.6' }}>
                {outputCode}
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
