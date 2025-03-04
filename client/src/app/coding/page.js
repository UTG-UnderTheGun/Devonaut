'use client';
import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Data from '@/api/data';
import './coding.css';
import Editor from '@/components/editor';
import Terminal from '@/components/Terminal';
import Loading from '@/app/loading';
import StorageManager from '@/components/StorageManager';
import AIChatInterface from './ai-interface/ai-interface';
import CodingSkeleton from '@/components/skeletons/CodingSkeleton';
import CodeExplainer from './ai-interface/CodeExplainer';
import useAuth from '@/hook/useAuth';
import StudentAssignment from '@/components/assignment/student-assignment';
import { useProblemState } from './hooks/useProblemState';
import DescriptionPanel from './components/DescriptionPanel';
import EditorSection from './components/EditorSection';
import ConsoleSection from './components/ConsoleSection';
import useAntiCopyPaste from '@/hook/useAntiCopyPaste';

export default function CodingPage() {
  useAuth();
  useAntiCopyPaste();

  const problemState = useProblemState();

  const [user_id, setUser_id] = useState(null);
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
  const [testType, setTestType] = useState('code');
  const [answers, setAnswers] = useState({});
  const [problemCodes, setProblemCodes] = useState({});
  const editorRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);
  const [aiChatKey, setAiChatKey] = useState(Date.now()); // Used to force re-render of AIChatInterface
  const [problems, setProblems] = useState([
    {
      id: 1,
      type: 'code',
      title: '',
      description: '',
      starterCode: ''
    }
  ]);

  // Complete clearing of conversation history and interface state
  const handleClearImport = async () => {
    if (!user_id) return;

    try {
      console.log("Import detected - clearing all conversation histories");

      // Clear the backend conversation history (both global and exercise-specific)
      await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/ai/conversations/${user_id}`, {
        method: 'DELETE',
      });
      console.log(`Cleared conversation history for user ${user_id}`);

      // Clear any localStorage chat history for this user
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith(`chat_${user_id}`)) {
          localStorage.removeItem(key);
          console.log(`Cleared localStorage for key: ${key}`);
        }
      });

      // Force re-render of AIChatInterface by updating its key
      setAiChatKey(Date.now());

      // Dispatch reset event for any listeners
      window.dispatchEvent(new CustomEvent('reset-chat-history'));
      console.log("Dispatched reset-chat-history event");
    } catch (error) {
      console.error('Error clearing conversation history:', error);
    }
  };
  
  // Handle file imports, with option to force reset chat
  const handleImport = async (data, forceReset = false) => {
    console.log("Importing data:", data);
    if (!data) {
      console.error("No data to import");
      return;
    }

    // Clear chat history if this is a new file import
    if (user_id && forceReset) {
      await handleClearImport();
    }

    // Process problems data and update state/localStorage
    if (Array.isArray(data)) {
      if (data.length === 0) {
        console.error("Empty problem array");
        return;
      }
      const validData = data.map((problem, index) => ({
        ...problem,
        id: problem.id || index + 1,
        type: problem.type || 'code',
        title: problem.title || `Problem ${index + 1}`,
        description: problem.description || '',
        starterCode: problem.starterCode || problem.code || ''
      }));
      setProblems(validData);
      setCurrentProblemIndex(0);

      // Upload exercises data for quota tracking if user_id is available.
      if (user_id) {
        try {
          const exercisesData = JSON.stringify(validData);
          const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/ai/upload-exercises`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id, exercises_data: exercisesData }),
          });
          if (!response.ok) throw new Error('Failed to upload exercises data');
          const result = await response.json();
          console.log('Exercises upload result:', result);
        } catch (error) {
          console.error('Error uploading exercises data:', error);
        }
      }
    } else {
      // Process a single problem object
      const validProblem = {
        ...data,
        id: data.id || 1,
        type: data.type || 'code',
        title: data.title || 'Problem',
        description: data.description || '',
        starterCode: data.starterCode || data.code || ''
      };
      setProblems([validProblem]);
      setCurrentProblemIndex(0);
      if (user_id) {
        try {
          const exercisesData = JSON.stringify([validProblem]);
          const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/ai/upload-exercises`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id, exercises_data: exercisesData }),
          });
          if (!response.ok) throw new Error('Failed to upload exercise data');
          const result = await response.json();
          console.log('Exercise upload result:', result);
        } catch (error) {
          console.error('Error uploading exercise data:', error);
        }
      }
    }

    // Save problems data to localStorage
    localStorage.setItem('saved-problems', JSON.stringify(Array.isArray(data) ? data : [data]));
  };

  // Listen for "file-import" events
  useEffect(() => {
    const onFileImportEvent = async (event) => {
      const data = event.detail; // new file data (problems array or single object)
      console.log("Received file-import event with data:", data);
      
      // Remove flag so that this new import is treated as a new file
      localStorage.removeItem('problemsImported');
      
      // Force reset chat on new file import (true parameter)
      await handleImport(data, true);
      
      // Force re-render the AIChatInterface by updating its key
      setAiChatKey(Date.now());
    };
    
    window.addEventListener('file-import', onFileImportEvent);
    return () => window.removeEventListener('file-import', onFileImportEvent);
  }, [user_id]);

  // Initial load: load problems and related data
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsClientLoaded(true);
      const storedTitle = localStorage.getItem('problem-title');
      const storedDescription = localStorage.getItem('problem-description');
      const storedCode = localStorage.getItem('editorCode');
      const storedConsoleFolded = localStorage.getItem('isConsoleFolded');
      const storedDescriptionFolded = localStorage.getItem('isDescriptionFolded');
      const storedProblems = localStorage.getItem('saved-problems');

      if (storedTitle) setTitle(storedTitle);
      if (storedDescription) setDescription(storedDescription);
      if (storedCode) setCode(storedCode);
      if (storedConsoleFolded) setIsConsoleFolded(storedConsoleFolded === 'true');
      if (storedDescriptionFolded) setIsDescriptionFolded(storedDescriptionFolded === 'true');

      if (storedProblems) {
        try {
          const parsedProblems = JSON.parse(storedProblems);
          if (Array.isArray(parsedProblems) && parsedProblems.length > 0) {
            setProblems(parsedProblems);
            
            // On refresh we load the problems but do not force a chat reset
            if (user_id && !localStorage.getItem('problemsImported')) {
              // This will upload exercise data to backend but not reset chat
              handleImport(parsedProblems, false);
              localStorage.setItem('problemsImported', 'true');
            }
          }
        } catch (error) {
          console.error('Error parsing saved problems:', error);
        }
      }
    }
  }, [user_id]);

  // Load saved code snippets
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const keys = Object.keys(localStorage);
      const savedCodes = {};
      keys.forEach(key => {
        if (key.startsWith('code-')) {
          savedCodes[key] = localStorage.getItem(key);
        }
      });
      setProblemCodes(savedCodes);
    }
  }, []);

  // Update window.currentProblemIndex when currentProblemIndex changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.currentProblemIndex = currentProblemIndex;
      if (problems && problems[currentProblemIndex]) {
        const currentProblemId = String(problems[currentProblemIndex].id);
        console.log(`Problem changed to index ${currentProblemIndex}, id ${currentProblemId}`);
        const problemChangeEvent = new CustomEvent('problem-changed', { detail: { problemId: currentProblemId } });
        window.dispatchEvent(problemChangeEvent);
      }
    }
  }, [currentProblemIndex, problems]);

  // Initialize user ID
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

  // Save data to localStorage when it changes
  useEffect(() => {
    if (isClientLoaded) {
      localStorage.setItem('isConsoleFolded', isConsoleFolded);
      localStorage.setItem('isDescriptionFolded', isDescriptionFolded);
      localStorage.setItem('problem-title', title);
      localStorage.setItem('problem-description', description);
    }
  }, [isConsoleFolded, isDescriptionFolded, title, description, isClientLoaded]);

  // Set up editor resizing
  useEffect(() => {
    const handleResize = () => {
      if (editorRef.current?.editor) {
        editorRef.current.editor.layout();
      }
    };
    if (!isDescriptionFolded || !isConsoleFolded) {
      setTimeout(handleResize, 300);
    }
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isDescriptionFolded, isConsoleFolded]);

  // Loading effect
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  // Change console and description tab based on test type
  useEffect(() => {
    if (testType !== 'code') {
      setIsConsoleFolded(true);
      setSelectedDescriptionTab('ASK AI');
    } else {
      setIsConsoleFolded(false);
      setSelectedDescriptionTab('Description');
    }
  }, [testType]);

  // Load answers from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedAnswers = localStorage.getItem('problem-answers');
      if (savedAnswers) {
        setAnswers(JSON.parse(savedAnswers));
      }
    }
  }, []);

  // Save answers to localStorage when they change
  useEffect(() => {
    if (answers && Object.keys(answers).length > 0) {
      localStorage.setItem('problem-answers', JSON.stringify(answers));
    }
  }, [answers]);

  // Set test type based on the current problem
  useEffect(() => {
    if (problems && problems[currentProblemIndex] && problems[currentProblemIndex].type) {
      setTestType(problems[currentProblemIndex].type);
    }
  }, [currentProblemIndex, problems]);

  // Listen for "ide-data-import" events
  useEffect(() => {
    const handleImportEvent = (event) => {
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

    window.addEventListener('ide-data-import', handleImportEvent);
    return () => window.removeEventListener('ide-data-import', handleImportEvent);
  }, []);

  // Listen for "switch-description-tab" events
  useEffect(() => {
    const handleSwitchTab = (event) => {
      const { tab, pendingMessage } = event.detail;
      setSelectedDescriptionTab(tab);
      if (pendingMessage) {
        requestAnimationFrame(() => {
          const messageEvent = new CustomEvent('add-chat-message', {
            detail: pendingMessage
          });
          window.dispatchEvent(messageEvent);
        });
      }
    };

    window.addEventListener('switch-description-tab', handleSwitchTab);
    return () => window.removeEventListener('switch-description-tab', handleSwitchTab);
  }, []);

  // Listen for code reset events
  useEffect(() => {
    const handleCodeReset = (event) => {
      const { problemIndex } = event.detail;
      console.log("Received code reset event for problem", problemIndex);
      setProblemCodes(prev => {
        const newCodes = { ...prev };
        Object.keys(newCodes).forEach(key => {
          if (key.includes(`-${problemIndex}`)) {
            delete newCodes[key];
          }
        });
        return newCodes;
      });
      if (problemIndex === currentProblemIndex) {
        setCode('');
      }
    };

    window.addEventListener('code-reset', handleCodeReset);
    return () => window.removeEventListener('code-reset', handleCodeReset);
  }, [currentProblemIndex]);

  const handleCodeChange = (newCode) => {
    const key = `code-${testType}-${currentProblemIndex}`;
    setProblemCodes(prev => ({
      ...prev,
      [key]: newCode
    }));
    localStorage.setItem(key, newCode);
    setCode(newCode);
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

  const handleReset = () => {
    if (editorRef.current) {
      editorRef.current.setValue('');
    }
    setTitle('');
    setDescription('');
    setConsoleOutput('');
    setCode('');
    setProblemCodes(prev => {
      const newCodes = { ...prev };
      Object.keys(newCodes).forEach(key => {
        if (key.includes(`-${currentProblemIndex}`)) {
          delete newCodes[key];
        }
      });
      return newCodes;
    });
    const newOutputAnswers = JSON.parse(localStorage.getItem('problem-outputs') || '{}');
    if (newOutputAnswers[currentProblemIndex]) {
      delete newOutputAnswers[currentProblemIndex];
      localStorage.setItem('problem-outputs', JSON.stringify(newOutputAnswers));
    }
    localStorage.removeItem('problem-title');
    localStorage.removeItem('problem-description');
    const typesToClear = ['code', 'output', 'fill'];
    typesToClear.forEach(type => {
      localStorage.removeItem(`code-${type}-${currentProblemIndex}`);
      localStorage.removeItem(`editor-code-${type}-${currentProblemIndex}`);
    });
    console.log("Reset handler executed for problem", currentProblemIndex);
  };

  const getCurrentProblemId = () => {
    if (problems && problems[currentProblemIndex]) {
      return String(problems[currentProblemIndex].id);
    }
    return null;
  };

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

  if (isLoading) {
    return <CodingSkeleton />;
  }

  if (!isClientLoaded) {
    return <Loading />;
  }

  const descriptionProps = {
    isDescriptionFolded,
    setIsDescriptionFolded,
    testType,
    selectedDescriptionTab,
    setSelectedDescriptionTab,
    title,
    description,
    handleTitleChange,
    handleDescriptionChange,
    user_id,
    exercise_id: getCurrentProblemId(), // For exercise-specific AI quota
    aiChatKey // Pass the key to force re-render when needed
  };

  const editorProps = {
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
    handleClearImport
  };

  const consoleProps = {
    isConsoleFolded,
    setIsConsoleFolded,
    testType,
    consoleOutput
  };

  return (
    <div className="coding-container">
      <div className="main-content">
        <DescriptionPanel
          {...descriptionProps}
          exercise_id={getCurrentProblemId()}
          key={`desc-panel-${getCurrentProblemId() || 'global'}-${aiChatKey}`}
        />
        <div className="editor-container">
          <EditorSection {...editorProps} />
          <ConsoleSection {...consoleProps} />
        </div>
      </div>
      <CodeExplainer key={`code-explainer-${aiChatKey}`} />
    </div>
  );
}
