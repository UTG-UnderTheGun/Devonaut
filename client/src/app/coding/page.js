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
  const [outputAnswers, setOutputAnswers] = useState({});
  const [problemCodes, setProblemCodes] = useState({});
  const editorRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);
  const [aiChatKey, setAiChatKey] = useState(Date.now()); // Used to force re-render of AIChatInterface
  const [importTimestamp, setImportTimestamp] = useState(Date.now()); // Added to force re-renders on import
  const [problems, setProblems] = useState([
    {
      id: 1,
      type: 'code',
      title: '',
      description: '',
      starterCode: ''
    }
  ]);

  // Debug helper function to analyze user answers
  const debugUserAnswers = (data) => {
    console.group('Debug User Answers');
    
    if (Array.isArray(data)) {
      console.log('Input is an array with', data.length, 'problems');
      
      data.forEach((problem, index) => {
        console.group(`Problem ${index + 1} (ID: ${problem.id})`);
        console.log('Type:', problem.type);
        console.log('Title:', problem.title);
        
        if (problem.userAnswers) {
          console.log('Has userAnswers:', problem.userAnswers);
          
          if (problem.type === 'fill' && problem.userAnswers.fillAnswers) {
            console.log('Fill Answers:', problem.userAnswers.fillAnswers);
            
            // Extract structure of fill answers
            Object.entries(problem.userAnswers.fillAnswers).forEach(([key, value]) => {
              const [_, problemId, blankIndex] = key.split('-');
              console.log(`  Key format: problem ID=${problemId}, blank index=${blankIndex}, value=${value}`);
            });
          } else if (problem.type === 'output') {
            console.log('Output Answer:', problem.userAnswers.answer || 'Not set');
          }
        } else {
          console.log('No userAnswers data');
        }
        console.groupEnd();
      });
    } else {
      console.log('Input is a single problem object');
      console.log('Type:', data.type);
      console.log('Has userAnswers:', !!data.userAnswers);
    }
    
    console.groupEnd();
  };

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

  const handleImport = async (data, forceReset = false) => {
    console.log("Importing data:", data);
    if (!data) {
      console.error("No data to import");
      return;
    }

    // Debug user answers in the imported data
    debugUserAnswers(data);

    // Clear existing data before import
    // Reset relevant states to ensure clean start
    setCode("");
    setConsoleOutput("");

    // Clear chat history if this is a new file import
    if (user_id && forceReset) {
      await handleClearImport();
    }

    // Process problems data and update state/localStorage
    let validData = [];
    let extractedAnswers = {};
    let extractedOutputAnswers = {};

    if (Array.isArray(data)) {
      if (data.length === 0) {
        console.error("Empty problem array");
        return;
      }

      validData = data.map((problem, index) => {
        // Extract user answers if they exist
        if (problem.userAnswers) {
          // For 'fill' type questions, get the fillAnswers
          if (problem.type === 'fill' && problem.userAnswers.fillAnswers) {
            Object.entries(problem.userAnswers.fillAnswers).forEach(([key, value]) => {
              extractedAnswers[key] = value;
            });
          }
          // For 'output' type questions, store the answer
          else if (problem.type === 'output') {
            // Handle both possible property names: answer and outputAnswer
            if (problem.userAnswers.answer) {
              extractedOutputAnswers[index] = problem.userAnswers.answer;
            } else if (problem.userAnswers.outputAnswer) {
              extractedOutputAnswers[index] = problem.userAnswers.outputAnswer;
            }
          }
        }

        return {
          ...problem,
          id: problem.id || index + 1,
          type: problem.type || 'code',
          title: problem.title || `Problem ${index + 1}`,
          description: problem.description || '',
          starterCode: problem.starterCode || problem.code || ''
        };
      });
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
      
      // Extract user answers from the single problem
      if (data.userAnswers) {
        if (data.type === 'fill' && data.userAnswers.fillAnswers) {
          Object.entries(data.userAnswers.fillAnswers).forEach(([key, value]) => {
            extractedAnswers[key] = value;
          });
        }
        else if (data.type === 'output') {
          if (data.userAnswers.answer) {
            extractedOutputAnswers[0] = data.userAnswers.answer;
          } else if (data.userAnswers.outputAnswer) {
            extractedOutputAnswers[0] = data.userAnswers.outputAnswer;
          }
        }
      }
      
      validData = [validProblem];
    }

    // Update problems state
    setProblems(validData);
    setCurrentProblemIndex(0);
    
    // Update answers with the extracted data
    if (Object.keys(extractedAnswers).length > 0) {
      console.log('Setting fill answers:', extractedAnswers);
      setAnswers(extractedAnswers);
      localStorage.setItem('problem-answers', JSON.stringify(extractedAnswers));
    }

    // Update output answers if any were found
    if (Object.keys(extractedOutputAnswers).length > 0) {
      console.log('Setting output answers:', extractedOutputAnswers);
      setOutputAnswers(extractedOutputAnswers);
      localStorage.setItem('problem-outputs', JSON.stringify(extractedOutputAnswers));
    }

    // Set type based on the first problem
    if (validData[0] && validData[0].type) {
      setTestType(validData[0].type);
    }

    // Set initial code from starterCode if available
    if (validData[0] && validData[0].starterCode) {
      setCode(validData[0].starterCode);

      // If editor reference exists, update it directly as well
      if (editorRef.current) {
        editorRef.current.setValue(validData[0].starterCode);
      }

      // Save to localStorage for the specific problem
      const codeKey = `code-${validData[0].type || 'code'}-0`;
      localStorage.setItem(codeKey, validData[0].starterCode);

      // Update problemCodes state
      setProblemCodes(prev => ({
        ...prev,
        [codeKey]: validData[0].starterCode
      }));
    }

    // Set initial title and description
    if (validData[0]) {
      setTitle(validData[0].title || '');
      setDescription(validData[0].description || '');

      // Update localStorage
      localStorage.setItem('problem-title', validData[0].title || '');
      localStorage.setItem('problem-description', validData[0].description || '');
    }

    // Upload exercises data for quota tracking if user_id is available
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

    // Save problems data to localStorage
    localStorage.setItem('saved-problems', JSON.stringify(validData));
    localStorage.setItem('problemsImported', 'true');

    // Force re-render of AI chat interface
    setAiChatKey(Date.now());
    
    // Force re-render of the entire component tree by updating importTimestamp
    setImportTimestamp(Date.now());

    // Set appropriate tabs based on the problem type
    if (validData[0] && validData[0].type !== 'code') {
      setIsConsoleFolded(true);
      setSelectedDescriptionTab('ASK AI');
    } else {
      setIsConsoleFolded(false);
      setSelectedDescriptionTab('Description');
    }

    // Dispatch event for any components that need to update
    window.dispatchEvent(new CustomEvent('problems-imported', {
      detail: {
        timestamp: Date.now(),
        problemCount: validData.length
      }
    }));
    
    // Add a new event: import-complete to signal final completion
    window.dispatchEvent(new CustomEvent('import-complete', {
      detail: {
        timestamp: Date.now(),
        problemCount: validData.length
      }
    }));

    // Provide user feedback
    setConsoleOutput("Problems imported successfully.");

    // Optionally show toast notification
    if (window.showToast) {
      window.showToast(`Successfully imported ${validData.length} problem(s)`);
    }

    console.log(`Import complete. Loaded ${validData.length} problem(s).`);
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
      
      // Update the import timestamp to force re-render throughout the app
      setImportTimestamp(Date.now());
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
      const storedAnswers = localStorage.getItem('problem-answers');
      const storedOutputs = localStorage.getItem('problem-outputs');

      if (storedTitle) setTitle(storedTitle);
      if (storedDescription) setDescription(storedDescription);
      if (storedCode) setCode(storedCode);
      if (storedConsoleFolded) setIsConsoleFolded(storedConsoleFolded === 'true');
      if (storedDescriptionFolded) setIsDescriptionFolded(storedDescriptionFolded === 'true');
      
      if (storedAnswers) {
        try {
          setAnswers(JSON.parse(storedAnswers));
        } catch (error) {
          console.error('Error parsing stored answers:', error);
        }
      }
      
      if (storedOutputs) {
        try {
          setOutputAnswers(JSON.parse(storedOutputs));
        } catch (error) {
          console.error('Error parsing stored outputs:', error);
        }
      }

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

  const handleReset = async () => {
    console.log("Starting complete reset of the application state");
    
    // Create a reset timestamp that we'll use throughout the reset process
    const resetTimestamp = Date.now();
    localStorage.setItem('reset_timestamp', resetTimestamp.toString());
    localStorage.setItem('editor_reset_timestamp', resetTimestamp.toString());
    
    // Reset in-memory state first (important to prevent references to old state)
    setTitle('');
    setDescription('');
    setConsoleOutput('');
    setCode('');
    setProblemCodes({});
    setAnswers({});
    setOutputAnswers({});
    
    // Reset problems array with a default empty problem before clearing localStorage
    // This ensures we have a clean state to start with
    const defaultProblems = [{
      id: 1,
      type: 'code',
      title: '',
      description: '',
      starterCode: ''
    }];
    
    setProblems(defaultProblems);
    setCurrentProblemIndex(0);
    
    // Take a full snapshot of localStorage keys first to avoid iteration issues
    const allKeys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        allKeys.push(key);
      }
    }
    
    // Define all patterns to be cleared
    const patternsToRemove = [
      /^problem-title-/,
      /^problem-description-/,
      /^problem-code-/,
      /^code-code-/,
      /^code-output-/,
      /^code-fill-/,
      /^code-/,
      /^starter-code-/,
      /^editor-code-/,
      /^problem-title$/,
      /^problem-description$/,
      /^problem-answers$/,
      /^problem-outputs$/,
      /^problem-code$/,
      /^editorCode$/,
      /^saved-problems$/,
      /^is-imported$/,
      /^problemsImported$/,
      /^chat_/ // Add pattern to clear chat history in localStorage
    ];
    
    // Filter keys that match our patterns
    const keysToRemove = allKeys.filter(key => 
      patternsToRemove.some(pattern => pattern.test(key))
    );
    
    console.log(`Removing ${keysToRemove.length} localStorage items:`, keysToRemove);
    
    // Remove all identified keys
    keysToRemove.forEach(key => {
      try {
        localStorage.removeItem(key);
      } catch (error) {
        console.error(`Failed to remove key: ${key}`, error);
      }
    });
    
    // Explicitly reset critical localStorage items to empty values or remove them
    localStorage.removeItem('saved-problems');
    localStorage.removeItem('problemsImported');
    localStorage.removeItem('problem-code');
    localStorage.removeItem('editorCode');
    localStorage.setItem('problem-outputs', JSON.stringify({}));
    localStorage.setItem('problem-answers', JSON.stringify({}));
    
    // Second verification pass to ensure all critical keys are removed
    const criticalKeys = [
      'saved-problems', 'problemsImported', 'is-imported',
      'problem-code', 'editorCode'
    ];
    
    criticalKeys.forEach(key => {
      if (localStorage.getItem(key)) {
        console.warn(`Critical key ${key} still exists after cleanup, forcing removal...`);
        localStorage.removeItem(key);
      }
    });
    
    // Reset the editor instance if it exists
    if (editorRef.current) {
      try {
        editorRef.current.setValue('');
        console.log("Editor content reset successfully");
      } catch (error) {
        console.error("Error resetting editor content:", error);
      }
    }
    
    // Clear AI chat history on the server if user_id is available
    if (user_id) {
      try {
        console.log("Clearing AI chat history from server");
        
        // Clear the backend conversation history
        await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/ai/conversations/${user_id}`, {
          method: 'DELETE',
        });
        console.log(`Cleared conversation history for user ${user_id}`);
        
        // Dispatch reset event for AI chat listeners
        window.dispatchEvent(new CustomEvent('reset-chat-history'));
        console.log("Dispatched reset-chat-history event");
      } catch (error) {
        console.error('Error clearing AI conversation history:', error);
      }
    }
    
    // Force re-render of AI chat interface with new key
    setAiChatKey(resetTimestamp.toString());
    
    // Force re-render of the entire component tree
    setImportTimestamp(resetTimestamp.toString());
    
    // Broadcast events to all components that need to respond to the reset
    // First fire storage-reset which is captured by StorageManager and Editor
    window.dispatchEvent(new CustomEvent('storage-reset', { 
      detail: { 
        source: 'reset-button', 
        complete: true, 
        timestamp: resetTimestamp 
      } 
    }));
    
    // Then code-reset for any code-specific handlers
    window.dispatchEvent(new CustomEvent('code-reset', { 
      detail: { 
        problemIndex: 0, 
        timestamp: resetTimestamp 
      } 
    }));
    
    // Finally app-reset for any remaining components
    window.dispatchEvent(new CustomEvent('app-reset', { 
      detail: { 
        timestamp: resetTimestamp 
      } 
    }));
    
    // Reset CodeContext state through the resetState method
    try {
      const { resetState } = useCodeContext();
      if (typeof resetState === 'function') {
        resetState();
        console.log("CodeContext state reset successfully");
      }
    } catch (error) {
      console.error("Error resetting CodeContext state:", error);
    }
    
    // Display feedback to the user
    setConsoleOutput("All problems and chat history have been reset successfully.");
    
    console.log(`Reset complete. Cleared ${keysToRemove.length} localStorage items.`);
    
    // Show a toast notification if available
    if (window.showToast) {
      window.showToast("All problems and chat history have been reset successfully");
    }
    
    // After a small delay, force a final update to ensure editor is really empty
    setTimeout(() => {
      if (editorRef.current) {
        editorRef.current.setValue('');
      }
      // Trigger a final reset event to catch any components that may not have updated
      window.dispatchEvent(new CustomEvent('final-reset', { 
        detail: { timestamp: resetTimestamp } 
      }));
    }, 100);
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
    outputAnswers,
    setOutputAnswers, // Make sure this is included
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
          <EditorSection 
            {...editorProps} 
            key={`editor-section-${currentProblemIndex}-${importTimestamp}`} // Key forces re-render on problem change or import
          />
          <ConsoleSection {...consoleProps} />
        </div>
      </div>
      <CodeExplainer key={`code-explainer-${aiChatKey}`} />
    </div>
  );
}
