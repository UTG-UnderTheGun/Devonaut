'use client';
import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Data from '@/api/data';
import './coding.css';
import Editor from '@/components/editor';
import Terminal from '@/components/Terminal';
import Loading from "@/app/loading";
import StorageManager from '@/components/StorageManager';
import AIChatInterface from './ai-interface/ai-interface';
import CodingSkeleton from '@/components/skeletons/CodingSkeleton';
import CodeExplainer from './ai-interface/CodeExplainer';
import useAuth from '@/hook/useAuth';

export default function CodingPage() {
  useAuth();

  const [chat, setChat] = useState([]);
  const [user_id, setUser_id] = useState(null);
  const [prompt, setPrompt] = useState("");
  const [code, setCode] = useState("# write code here");
  const [title, setTitle] = useState("solution.py");
  const [description, setDescription] = useState("");
  const [isConsoleFolded, setIsConsoleFolded] = useState(false);
  const [isDescriptionFolded, setIsDescriptionFolded] = useState(false);
  const [selectedTab, setSelectedTab] = useState('solution');
  const [selectedDescriptionTab, setSelectedDescriptionTab] = useState('Description');
  const [consoleOutput, setConsoleOutput] = useState('');
  const [isClientLoaded, setIsClientLoaded] = useState(false);
  const [currentProblemIndex, setCurrentProblemIndex] = useState(0);
  const editorRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);
  const [testType, setTestType] = useState('code');
  const [answers, setAnswers] = useState({});

  const testTypes = [
    { value: 'code', label: 'เขียนโค้ดตามโจทย์' },
    { value: 'output', label: 'ทายผลลัพธ์ของโค้ด' },
    { value: 'fill', label: 'เติมโค้ดในช่องว่าง' }
  ];

  const [problems] = useState([
    {
      id: 1,
      type: 'output',
      title: 'Q1: What will the following program print out?',
      description: '',
      starterCode: `x = 3
y = 5
a = x + y * (5 + 1)
b = y + 16 // x
print(x, a, b)`,
      expectedOutput: '3 33 8'
    },
    {
      id: 2,
      type: 'fill',
      title: 'Q11: Fill in the blank to calculate the following equation z = (x+1)²/2(y-1)',
      description: '',
      starterCode: `x = int(input('Enter x: '))
y = int(input('Enter y: '))
z = [____]`,
      blanks: ['(x+1)**2/(2*(y-1))']
    },
    {
      id: 3,
      type: 'code',
      title: 'Basic Function',
      description: 'เขียนฟังก์ชันที่รับค่าตัวเลข 2 ตัวและคืนค่าผลบวก',
      starterCode: 'def add_numbers(a, b):\n    # เขียนโค้ดตรงนี้\n'
    }
  ]);

  const handlePreviousProblem = () => {
    if (currentProblemIndex > 0) {
      setCurrentProblemIndex(prev => prev - 1);
    }
  };

  const handleNextProblem = () => {
    if (currentProblemIndex < problems.length - 1) {
      setCurrentProblemIndex(prev => prev + 1);
    }
  };

  useEffect(() => {
    const currentProblem = problems[currentProblemIndex];
    setTitle(currentProblem.title);
    setDescription(currentProblem.description);
    setCode(currentProblem.starterCode);
    setTestType(currentProblem.type);
    setAnswers({});
  }, [currentProblemIndex, problems]);

  const handleImport = (importedData) => {
    console.log('Imported data:', importedData);
  }

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsClientLoaded(true);

      const storedTitle = localStorage.getItem('problem-title');
      const storedDescription = localStorage.getItem('problem-description');
      const storedCode = localStorage.getItem('editorCode');
      const storedConsoleFolded = localStorage.getItem('isConsoleFolded');
      const storedDescriptionFolded = localStorage.getItem('isDescriptionFolded');

      if (storedTitle) setTitle(storedTitle);
      if (storedDescription) setDescription(storedDescription);
      if (storedCode) setCode(storedCode);
      if (storedConsoleFolded) setIsConsoleFolded(storedConsoleFolded === 'true');
      if (storedDescriptionFolded) setIsDescriptionFolded(storedDescriptionFolded === 'true');
    }
  }, []);

  useEffect(() => {
    const handleImport = (event) => {
      const { title: newTitle, description: newDescription, code: newCode } = event.detail;

      if (newTitle) {
        setTitle(newTitle);
        localStorage.setItem('problem-title', newTitle);
      }

      if (newDescription) {
        setDescription(newDescription);
        localStorage.setItem('problem-description', newDescription);
      }

      if (newCode) {
        setCode(newCode);
        localStorage.setItem('editorCode', newCode);
      }
    };

    window.addEventListener('ide-data-import', handleImport);
    return () => window.removeEventListener('ide-data-import', handleImport);
  }, []);

  useEffect(() => {
    const initID = async () => {
      try {
        const responseData = await Data();
        setUser_id(responseData.user_id);
      } catch (err) {
        console.error(err);
      }
    };
    initID();
  }, []);

  useEffect(() => {
    if (isClientLoaded) {
      localStorage.setItem('editorCode', code);
      localStorage.setItem('isConsoleFolded', isConsoleFolded);
      localStorage.setItem('isDescriptionFolded', isDescriptionFolded);
      localStorage.setItem('problem-title', title);
      localStorage.setItem('problem-description', description);
    }
  }, [code, isConsoleFolded, isDescriptionFolded, title, description, isClientLoaded]);

  const handleCodeChange = (newCode) => {
    setCode(newCode);
    localStorage.setItem('editorCode', newCode);
  };

  const handleTitleChange = (e) => {
    const newTitle = e.target.value;
    setTitle(newTitle);
    localStorage.setItem('problem-title', newTitle);
  };

  const handleDescriptionChange = (e) => {
    const newDescription = e.target.value;
    setDescription(newDescription);
    localStorage.setItem('problem-description', newDescription);
  };

  // Add resize handler for Monaco Editor
  useEffect(() => {
    const handleResize = () => {
      if (editorRef.current?.editor) {
        editorRef.current.editor.layout();
      }
    };

    // Call layout when panels are toggled
    if (!isDescriptionFolded || !isConsoleFolded) {
      setTimeout(handleResize, 300); // Wait for animation to complete
    }

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isDescriptionFolded, isConsoleFolded]);

  useEffect(() => {
    // Simulate loading time
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (testType !== 'code') {
      setIsConsoleFolded(true);
      setSelectedDescriptionTab('ASK AI');
    } else {
      setIsConsoleFolded(false);
      setSelectedDescriptionTab('Description');
    }
  }, [testType]);

  if (isLoading) {
    return <CodingSkeleton />;
  }

  if (!isClientLoaded) {
    return <Loading />;
  }
  return (
    <div className="coding-container">
      <div className="main-content">
        <div className={`description-panel ${isDescriptionFolded ? 'folded' : ''}`}>
          <div className="panel-header">
            <div className="description-tabs">
              {testType === 'code' && (
                <button
                  className={`description-tab ${selectedDescriptionTab === 'Description' ? 'active' : ''}`}
                  onClick={() => setSelectedDescriptionTab('Description')}
                >
                  Description
                </button>
              )}
              <button
                className={`description-tab ${selectedDescriptionTab === 'ASK AI' ? 'active' : ''}`}
                onClick={() => setSelectedDescriptionTab('ASK AI')}
              >
                ASK AI
              </button>
            </div>
            <button
              className="fold-button"
              onClick={() => setIsDescriptionFolded(!isDescriptionFolded)}
            >
              {isDescriptionFolded ? '►' : '◄'}
            </button>
          </div>

          <div className="panel-content">
            {selectedDescriptionTab === 'Description' && testType === 'code' ? (
              <>
                <input
                  type="text"
                  value={title}
                  onChange={handleTitleChange}
                  className="problem-title"
                  placeholder="Enter problem title..."
                />
                <textarea
                  value={description}
                  onChange={handleDescriptionChange}
                  className="problem-description"
                  placeholder="Enter problem description..."
                />
              </>
            ) : (
              <div className="ask-ai-content">
                <AIChatInterface user_id={user_id} />
              </div>
            )}
          </div>
        </div>

        <div className="editor-container">
          <div className="code-editor">
            <div className="editor-header">
              <div className="file-section">
                <select 
                  value={testType}
                  onChange={(e) => setTestType(e.target.value)}
                  className="test-type-selector"
                >
                  {testTypes.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="right-section">
                <div className="import-section">
                  <StorageManager onImport={handleImport} />
                </div>

                <div className="navigation-section">
                  <span className="problem-count">Problem {currentProblemIndex + 1} of {problems.length}</span>
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

            {testType === 'code' && (
              <Editor
                ref={editorRef}
                isCodeQuestion={true}
                initialValue={code}
                onChange={handleCodeChange}
              />
            )}

            {testType === 'output' && (
              <div className="output-question">
                <div className="question-title">
                  {problems[currentProblemIndex].title}
                </div>
                <div className="code-display">
                  <pre>{problems[currentProblemIndex].starterCode}</pre>
                </div>
                <div className="answer-section">
                  <input
                    type="text"
                    placeholder="Enter your answer..."
                    className="output-input"
                    value={consoleOutput}
                    onChange={(e) => setConsoleOutput(e.target.value)}
                  />
                </div>
              </div>
            )}

            {testType === 'fill' && (
              <div className="fill-question">
                <div className="question-title">
                  {problems[currentProblemIndex].title}
                </div>
                <div className="code-display">
                  {problems[currentProblemIndex].starterCode.split('[____]').map((part, index, array) => (
                    <React.Fragment key={index}>
                      <span className="code-part">{part}</span>
                      {index < array.length - 1 && (
                        <input
                          type="text"
                          className="code-blank-inline"
                          placeholder="เติมคำตอบ..."
                          value={answers[`blank-${currentProblemIndex}-${index}`] || ''}
                          onChange={(e) => {
                            setAnswers(prev => ({
                              ...prev,
                              [`blank-${currentProblemIndex}-${index}`]: e.target.value
                            }));
                          }}
                        />
                      )}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className={`console ${isConsoleFolded || testType !== 'code' ? 'folded' : ''}`}>
            <div className="console-header">
              <span>Console</span>
              <button
                className="fold-button"
                onClick={() => setIsConsoleFolded(!isConsoleFolded)}
              >
                {isConsoleFolded ? '▲' : '▼'}
              </button>
            </div>
            <div className="console-content">
              <Terminal />
            </div>
          </div>
        </div>
      </div>
      <CodeExplainer />
    </div>
  );
}
