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
import StudentAssignment from '@/components/assignment/student-assignment';
import { useProblemState } from './hooks/useProblemState';
import DescriptionPanel from './components/DescriptionPanel';
import EditorSection from './components/EditorSection';
import ConsoleSection from './components/ConsoleSection';

export default function CodingPage() {
  useAuth();
  const problemState = useProblemState();

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
  const [testType, setTestType] = useState('code');
  const [answers, setAnswers] = useState({});
  const [problemCodes, setProblemCodes] = useState({});
  const editorRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);
  const [problems, setProblems] = useState([
    {
      id: 1,
      type: 'code',
      title: 'Basic Function',
      description: 'เขียนฟังก์ชันที่รับค่าตัวเลข 2 ตัวและคืนค่าผลบวก',
      starterCode: 'def add_numbers(a, b):\n    # เขียนโค้ดตรงนี้\n'
    }
  ]);

  const testTypes = [
    { value: 'code', label: 'เขียนโค้ดตามโจทย์' },
    { value: 'output', label: 'ทายผลลัพธ์ของโค้ด' },
    { value: 'fill', label: 'เติมโค้ดในช่องว่าง' }
  ];

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
    // โหลดโค้ดที่บันทึกไว้ทั้งหมดเมื่อเริ่มต้น
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

  const handleImport = (importedData) => {
    try {
      // แปลงข้อมูลให้ถูกต้องก่อนเก็บใน problems
      const processedData = Array.isArray(importedData) 
        ? importedData.map(problem => ({
            ...problem,
            starterCode: problem.code || problem.starterCode
          }))
        : {
            ...importedData,
            starterCode: importedData.code || importedData.starterCode
          };

      // แปลงเป็น array ถ้าเป็น object เดี่ยว
      const newProblems = Array.isArray(processedData) ? processedData : [processedData];

      // ล้างข้อมูลที่บันทึกไว้ทั้งหมด
      localStorage.removeItem('problem-answers');
      localStorage.removeItem('problem-codes');
      setAnswers({});
      setProblemCodes({});

      // อัพเดท problems ทั้งหมด
      setProblems(newProblems);
      
      // เซ็ต current problem เป็นข้อแรก
      setCurrentProblemIndex(0);

      // อัพเดท state ต่างๆ ตาม current problem
      const currentProblem = newProblems[0];
      setTitle(currentProblem.title);
      setDescription(currentProblem.description);
      setCode(currentProblem.code || currentProblem.starterCode);
      setTestType(currentProblem.type);

      // บันทึกข้อมูลพื้นฐานลง localStorage
      localStorage.setItem('current-problem-id', currentProblem.id);
      localStorage.setItem('problem-title', currentProblem.title);
      localStorage.setItem('problem-description', currentProblem.description);
      localStorage.setItem('editorCode', currentProblem.code || currentProblem.starterCode);
      localStorage.setItem('problem-type', currentProblem.type);
      localStorage.setItem('problem-blanks', JSON.stringify(currentProblem.blanks || []));
      localStorage.setItem('problem-expected-output', currentProblem.expectedOutput || '');
      
      // ล้าง localStorage ของโค้ดเก่า
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('code-') || key.startsWith('starter-code-')) {
          localStorage.removeItem(key);
        }
      });

      // บันทึก starterCode ของแต่ละโจทย์ลง localStorage
      newProblems.forEach((problem, index) => {
        localStorage.setItem(`starter-code-${index}`, problem.starterCode);
      });

    } catch (error) {
      console.error('Error handling import:', error);
      alert('Failed to process imported data');
    }
  };

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
    const key = `code-${testType}-${currentProblemIndex}`;
    
    // เก็บโค้ดใน state
    setProblemCodes(prev => ({
      ...prev,
      [key]: newCode
    }));
    
    // เก็บลง localStorage
    localStorage.setItem(key, newCode);
    
    // อัพเดท current code
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

  // เพิ่ม useEffect เพื่อโหลดคำตอบจาก localStorage เมื่อเริ่มต้น
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedAnswers = localStorage.getItem('problem-answers');
      if (savedAnswers) {
        setAnswers(JSON.parse(savedAnswers));
      }
    }
  }, []);

  // เพิ่ม useEffect เพื่อบันทึกคำตอบลง localStorage เมื่อมีการเปลี่ยนแปลง
  useEffect(() => {
    if (answers && Object.keys(answers).length > 0) {
      localStorage.setItem('problem-answers', JSON.stringify(answers));
    }
  }, [answers]);

  // เพิ่ม useEffect เพื่อโหลดโค้ดจาก localStorage เมื่อเริ่มต้น
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedCodes = localStorage.getItem('problem-codes');
      if (savedCodes) {
        setProblemCodes(JSON.parse(savedCodes));
      }
    }
  }, []);

  // แก้ไข useEffect ที่ทำงานเมื่อเปลี่ยน problem
  useEffect(() => {
    const currentProblem = problems[currentProblemIndex];
    setTitle(currentProblem.title);
    setDescription(currentProblem.description);
    
    const key = `code-${testType}-${currentProblemIndex}`;
    const savedCode = problemCodes[key];
    
    if (savedCode) {
      setCode(savedCode);
    } else {
      // ถ้าไม่มีโค้ดที่บันทึกไว้ ใช้ starterCode
      const starterCode = localStorage.getItem(`starter-code-${currentProblemIndex}`);
      setCode(starterCode || currentProblem.starterCode);
    }
    
    setTestType(currentProblem.type);
  }, [currentProblemIndex, problems, testType, problemCodes]);

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
    user_id
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
    setConsoleOutput
  };

  const consoleProps = {
    isConsoleFolded,
    setIsConsoleFolded,
    testType
  };

  return (
    <div className="coding-container">
      <div className="main-content">
        <DescriptionPanel {...descriptionProps} />
        <div className="editor-container">
          <EditorSection {...editorProps} />
          <ConsoleSection {...consoleProps} />
        </div>
      </div>
      <CodeExplainer />
    </div>
  );
}
