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
  }, [currentProblemIndex, problems]);

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

  const handleRunCode = async () => {
    // If console is folded, unfold it before running code
    if (setConsoleOutput && isConsoleFolded) {
      setIsConsoleFolded(false);
    }
    
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
            <button onClick={handleResetAll} className="icon-button" title="Reset">Reset</button>
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
