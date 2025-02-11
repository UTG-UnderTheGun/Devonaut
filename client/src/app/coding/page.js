'use client';

import { useState, useEffect } from 'react';
import './coding.css';
import AIChatInterface from './ai-interface/ai-interface';

export default function CodingPage() {
  const [code, setCode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('editorCode') || `# Definition for singly-linked list.
# class ListNode(object):
#     def __init__(self, val=0, next=None):
#         self.val = val
#         self.next = next
class Solution(object):
    def addTwoNumbers(self, l1, l2):
        """
        :type l1: Optional[ListNode]
        :type l2: Optional[ListNode]
        :rtype: Optional[ListNode]
        """
        # Your solution here`;
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
    setConsoleOutput(`> python solution.py
Input: [2,4,3], [5,6,4]
Output: [7,0,8]
Explanation: 342 + 465 = 807`);
  };

  const handleSubmit = () => {
    console.log('Code submitted');
  };

  useEffect(() => {
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

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
                    className="fold-button"
                    onClick={() => setIsDescriptionFolded(!isDescriptionFolded)}
                    >
                    {isDescriptionFolded ? '►' : '◄'}
                    </button>
            </div>
          
          <div className="panel-content">
            {selectedDescriptionTab === 'Description' ? (
              <>
                <h2>Add Two Numbers</h2>
                <br></br>
                <p>You are given two <strong>non-empty</strong> linked lists representing two non-negative integers. The digits are stored in <strong>reverse order</strong>, and each of their nodes contains a single digit. Add the two numbers and return the sum as a linked list.</p>
                <p>You may assume the two numbers do not contain any leading zero, except the number 0 itself.</p>
                
                <div className="example">
                  <div>Input: l1 = [2,4,3], l2 = [5,6,4]</div>
                  <div>Output: [7,0,8]</div>
                  <div>Explanation: 342 + 465 = 807.</div>
                </div>
              </>
            ) : (
              <div className="ask-ai-content">
                <p>Ask questions about this problem and get AI assistance!</p>
                <AIChatInterface />
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
                  tabIndex={0}
                  onClick={() => setSelectedTab('solution')}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      setSelectedTab('solution');
                    }
                  }}
                >
                  Solution.py
                </div>
              </div>
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
}