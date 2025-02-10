'use client';

import { useState, useEffect } from 'react';
import './coding.css';

const CodingPage = ({ assignment, onBack }) => {
  const [code, setCode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('editorCode') || assignment?.starterCode || `def solve():
    # Your solution here
    pass`;
    }
    return '';
  });
  
  const [consoleOutput, setConsoleOutput] = useState('');
  const [isConsoleFolded, setIsConsoleFolded] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('isConsoleFolded') === 'true';
    }
    return false;
  });
  
  const [isDescriptionFolded, setIsDescriptionFolded] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('isDescriptionFolded') === 'true';
    }
    return false;
  });

  const [selectedTab, setSelectedTab] = useState('solution');
  const [selectedDescriptionTab, setSelectedDescriptionTab] = useState('Description');

  useEffect(() => {
    localStorage.setItem('editorCode', code);
    localStorage.setItem('isConsoleFolded', isConsoleFolded);
    localStorage.setItem('isDescriptionFolded', isDescriptionFolded);
  }, [code, isConsoleFolded, isDescriptionFolded]);

  const handleCodeChange = (e) => {
    setCode(e.target.value);
  };

  const runCode = () => {
    setConsoleOutput(`> python solution.py\nRunning test cases...\nAll tests passed!`);
  };

  return (
    <div className="coding-container">
      <div className="main-content">
        <div className={`description-panel ${isDescriptionFolded ? 'folded' : ''}`}>
          <div className="panel-header">
            <div className="description-tabs">
              <button 
                className={`description-tab ${selectedDescriptionTab === 'Description' ? 'active' : ''}`}
                onClick={() => setSelectedDescriptionTab('Description')}
              >
                Description
              </button>
              <button 
                className={`description-tab ${selectedDescriptionTab === 'ASK AI' ? 'active' : ''}`}
                onClick={() => setSelectedDescriptionTab('ASK AI')}
              >
                ASK AI
              </button>
            </div>
            <button 
              className="back-button"
              onClick={onBack}
            >
              Back
            </button>
            <button 
              className="fold-button"
              onClick={() => setIsDescriptionFolded(!isDescriptionFolded)}
            >
              {isDescriptionFolded ? '►' : '◄'}
            </button>
          </div>
          
          <div className="panel-content">
            {selectedDescriptionTab === 'Description' ? (
              <>
                <h2>{assignment.title}</h2>
                <div className="assignment-metadata">
                  <span>Chapter: {assignment.chapter}</span>
                  <span>Due Date: {assignment.dueDate}</span>
                  <span>Points: {assignment.points}</span>
                </div>
                <div className="description-text">
                  <p>{assignment.description || "Complete the following programming exercise."}</p>
                </div>
                
                <div className="example">
                  <div>Example Input/Output:</div>
                  <pre>{assignment.examples || "Example test cases will be shown here."}</pre>
                </div>
              </>
            ) : (
              <div className="ask-ai-content">
                <p>Ask questions about this problem and get AI assistance!</p>
                <div className="chat-container">
                  <div className="chat-messages"></div>
                  <div className="chat-input">
                    <input type="text" placeholder="Type your question..." />
                    <button>Send</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="editor-container">
          <div className="code-editor">
            <div className="editor-header">
              <div className="file-tabs">
                <div 
                  className="tab"
                  aria-selected={selectedTab === 'solution'}
                  role="tab"
                  onClick={() => setSelectedTab('solution')}
                >
                  solution.py
                </div>
              </div>
              <button onClick={runCode} className="run-button">
                Run Code
              </button>
            </div>
            <textarea
              value={code}
              onChange={handleCodeChange}
              className="code-area"
              spellCheck="false"
            />
          </div>

          <div className={`console ${isConsoleFolded ? 'folded' : ''}`}>
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
              <pre>{consoleOutput}</pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CodingPage;