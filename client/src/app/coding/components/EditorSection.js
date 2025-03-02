import React, { useState, useEffect } from 'react';
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
  const [showEmptyState, setShowEmptyState] = useState(true);
  const [outputAnswers, setOutputAnswers] = useState({});
  const [editorCodes, setEditorCodes] = useState({});

  const handleImportWrapper = (data) => {
    localStorage.setItem('saved-problems', JSON.stringify(data));
    handleImport(data);
  };

  useEffect(() => {
    const savedProblems = localStorage.getItem('saved-problems');
    const savedAnswers = localStorage.getItem('problem-answers');
    const savedCode = localStorage.getItem(`code-${testType}-${currentProblemIndex}`);
    const savedOutputs = localStorage.getItem('problem-outputs');

    if (savedProblems) {
      const parsedProblems = JSON.parse(savedProblems);
      if (parsedProblems.length > 0) {
        setShowEmptyState(false);
        if (typeof handleImport === 'function') {
          handleImport(parsedProblems);
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
  }, []);

  useEffect(() => {
    const loadProblemData = () => {
      if (!problems || !problems[currentProblemIndex]) return;
      
      // ตรวจสอบ type ของโปรเบลมปัจจุบัน
      const currentProblem = problems[currentProblemIndex];
      const currentType = currentProblem.type || testType;
      
      // กำหนด testType ให้ตรงกับโปรเบลมปัจจุบัน
      if (setTestType && currentType !== testType) {
        setTestType(currentType);
      }
      
      // ลองค้นหาโค้ดจากหลายๆ รูปแบบของ key
      const keysToTry = [
        `code-${currentType}-${currentProblemIndex}`,
        `editor-code-${currentType}-${currentProblemIndex}`,
        `code-${testType}-${currentProblemIndex}`,
        `starter-code-${currentProblemIndex}`
      ];
      
      let foundCode = null;
      
      // ค้นหาโค้ดจาก localStorage
      for (const key of keysToTry) {
        const savedCode = localStorage.getItem(key);
        if (savedCode) {
          foundCode = savedCode;
          console.log(`Found code for problem ${currentProblemIndex + 1} with key: ${key}`);
          break;
        }
      }
      
      // ถ้าไม่พบ ใช้ starterCode จาก problem object
      if (!foundCode && currentProblem.starterCode) {
        foundCode = currentProblem.starterCode;
        console.log(`Using starter code for problem ${currentProblemIndex + 1}`);
      }
      
      // อัพเดท editorCodes state
      if (foundCode) {
        setEditorCodes(prev => ({
          ...prev,
          [currentProblemIndex]: foundCode
        }));
        
        // อัพเดทค่าใน editor
        if (editorRef.current) {
          editorRef.current.setValue(foundCode);
        }
        
        // อัพเดท code state ถ้ามี handler
        if (handleCodeChange) {
          handleCodeChange(foundCode);
        }
      }
    };
    
    // โหลดข้อมูลเมื่อเปลี่ยน problem
    loadProblemData();
  }, [currentProblemIndex, problems, testType]);

  const handleEditorChange = (value) => {
    // เก็บโค้ดใน state
    setEditorCodes(prev => ({
      ...prev,
      [currentProblemIndex]: value
    }));
    
    // หา type ที่ถูกต้องของโปรเบลมปัจจุบัน
    const currentProblem = problems && problems[currentProblemIndex];
    const currentType = currentProblem ? currentProblem.type || testType : testType;
    
    // บันทึกลง localStorage ด้วย key ที่ถูกต้อง
    localStorage.setItem(`code-${currentType}-${currentProblemIndex}`, value);
    
    // ถ้ามี handleCodeChange จาก props ก็เรียกใช้
    if (typeof handleCodeChange === 'function') {
      handleCodeChange(value);
    }
  };

  const handleResetAll = () => {
    setShowEmptyState(true);
    
    // ล้างค่าใน editor
    if (editorRef.current) {
      editorRef.current.setValue('');
    }

    // ล้างค่าใน state
    setEditorCodes({});
    setOutputAnswers({});
    setTitle('');
    setDescription('');
    setConsoleOutput('');
    setAnswers({});
    setSelectedDescriptionTab('Description');

    // ล้างค่าใน localStorage แบบเฉพาะเจาะจงมากขึ้น
    // ล้างทั้ง problem ปัจจุบันและทุก problem
    const keysToRemove = [];
    
    // ล้างทุก key ที่เกี่ยวข้องกับ code
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        // ล้าง key ทั่วไป
        if (key.startsWith('code-') || 
            key.startsWith('editor-code-') || 
            key === 'editorCode' ||
            key.startsWith('starter-code-')) {
          keysToRemove.push(key);
        }
        
        // ล้าง key เฉพาะ problem ปัจจุบัน
        if (key.includes(`-${currentProblemIndex}`)) {
          keysToRemove.push(key);
        }
        
        // ล้าง key ใน output และ fill
        if (key === 'problem-outputs' || 
            key === 'problem-answers' ||
            key === 'problem-title' ||
            key === 'problem-description') {
          keysToRemove.push(key);
        }
      }
    }
    
    // ล้าง key ทั้งหมดที่รวบรวมไว้
    console.log("Removing keys:", keysToRemove);
    keysToRemove.forEach(key => localStorage.removeItem(key));
    
    // ล้าง key เฉพาะ output
    const outputKey = `output-${currentProblemIndex}`;
    localStorage.removeItem(outputKey);
    localStorage.removeItem('problem-outputs');
    
    // เรียกใช้ handler จาก props
    if (handleReset) {
      handleReset();
    }
    
    // ส่ง event ให้ parent component รู้ว่ามีการ reset
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
    
    if (problems && problems.length > 0 && 
        problems[currentProblemIndex] && 
        (problems[currentProblemIndex].title || problems[currentProblemIndex].description)) {
      setShowEmptyState(false);
    } else {
      setShowEmptyState(true);
    }
  }, [problems, currentProblemIndex, testType]);

  // Add event listener for storage reset
  useEffect(() => {
    const handleStorageReset = (event) => {
      console.log("Storage reset detected:", event.detail);
      
      // Reset editor codes state
      setEditorCodes({});
      
      // Reset output answers
      setOutputAnswers({});
      
      // Reset editor content if we have a reference
      if (editorRef.current) {
        editorRef.current.setValue('');
      }
      
      // If this was triggered by an import, we don't need to clear localStorage
      // as it was already cleared by the StorageManager
    };
    
    window.addEventListener('storage-reset', handleStorageReset);
    return () => window.removeEventListener('storage-reset', handleStorageReset);
  }, []);

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
    
    // ตรวจสอบว่ามีปัญหาที่เลือกไว้จริงๆ หรือไม่
    if (!problems || !problems[currentProblemIndex]) {
      console.log("No problem found at index", currentProblemIndex);
      return <div className="empty-problem">ไม่พบข้อมูลของโจทย์ โปรดตรวจสอบการนำเข้าข้อมูล</div>;
    }
    
    const currentProblem = problems[currentProblemIndex];
    console.log("Current problem:", currentProblem);
    
    // ใช้ type จาก problem object ถ้ามี
    const effectiveTestType = currentProblem.type || testType;
    console.log("Effective test type:", effectiveTestType);
    
    // ถ้า type ไม่ตรงกับที่เก็บใน state ให้อัพเดท
    if (effectiveTestType !== testType && setTestType) {
      console.log("Updating test type to", effectiveTestType);
      setTestType(effectiveTestType);
    }
    
    const getSavedCode = () => {
      // ตรวจสอบจาก editorCodes state ก่อน
      const stateCode = editorCodes[currentProblemIndex];
      if (stateCode) {
        console.log("Found code in state");
        return stateCode;
      }
      
      // ลองค้นหาจาก localStorage ด้วยหลาย key pattern
      const keysToTry = [
        `code-${effectiveTestType}-${currentProblemIndex}`,
        `editor-code-${effectiveTestType}-${currentProblemIndex}`,
        `code-code-${currentProblemIndex}`,
        `starter-code-${currentProblemIndex}`
      ];
      
      for (const key of keysToTry) {
        const savedCode = localStorage.getItem(key);
        if (savedCode) {
          console.log(`Found code with key: ${key}`);
          return savedCode;
        }
      }
      
      // ใช้ starterCode จาก problem object
      if (currentProblem.starterCode) {
        console.log("Using starter code from problem");
        return currentProblem.starterCode;
      }
      
      // ใช้ code จาก problem object (บางครั้งใช้ key นี้แทน starterCode)
      if (currentProblem.code) {
        console.log("Using code from problem");
        return currentProblem.code;
      }
      
      console.log("No code found, returning empty string");
      return '';
    };

    // แยกการรับโค้ดออกมาป้องกันปัญหา
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
            <div className="question-title">
              {currentProblem.title || ''}
            </div>
            <div className="question-description">
              {currentProblem.description || ''}
            </div>
            <div className="code-display">
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
        
        // ป้องกันข้อผิดพลาดเมื่อ split code
        let codeParts = [];
        try {
          codeParts = currentCode.split('____');
        } catch (error) {
          console.error("Error splitting code:", error);
          return <div className="error">เกิดข้อผิดพลาดในการแบ่งโค้ด: {error.message}</div>;
        }
        
        return (
          <div className="fill-question">
            <div className="question-title">
              {currentProblem.title || ''}
            </div>
            <div className="question-description">
              {currentProblem.description || ''}
            </div>
            <div className="code-display">
              <pre style={{ margin: 0, background: 'transparent' }}>
                {codeParts.map((part, index, array) => (
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
        console.warn("Unknown test type:", effectiveTestType);
        return <div className="unknown-type">ไม่รู้จักประเภทโจทย์: {effectiveTestType}</div>;
    }
  }
};

export default EditorSection; 