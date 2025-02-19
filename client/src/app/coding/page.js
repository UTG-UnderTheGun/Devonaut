'use client';
import { useState, useEffect, useRef } from 'react';
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

  const [problems] = useState([
    {
      id: 1,
      title: 'Two Sum',
      description: `Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.
You may assume that each input would have exactly one solution, and you may not use the same element twice.
You can return the answer in any order.

Example 1:
Input: nums = [2,7,11,15], target = 9
Output: [0,1]
Explanation: Because nums[0] + nums[1] == 9, we return [0, 1].`,
      starterCode: `class Solution:
    def twoSum(self, nums: List[int], target: int) -> List[int]:
        # Your code here`
    },
    {
      id: 2,
      title: 'Add Two Numbers',
      description: `You are given two non-empty linked lists representing two non-negative integers. The digits are stored in reverse order, and each of their nodes contains a single digit. Add the two numbers and return the sum as a linked list.

You may assume the two numbers do not contain any leading zero, except the number 0 itself.

Example:
Input: l1 = [2,4,3], l2 = [5,6,4]
Output: [7,0,8]
Explanation: 342 + 465 = 807.`,
      starterCode: `class Solution:
    def addTwoNumbers(self, l1: ListNode, l2: ListNode) -> ListNode:
        # Your code here`
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
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

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
                <div className="file-name">{title}</div>
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

            <Editor
              ref={editorRef}
              isCodeQuestion={true}
              initialValue={code}
              onChange={handleCodeChange}
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
              <Terminal />
            </div>
          </div>
        </div>
      </div>
      <CodeExplainer />
    </div>
  );
}
