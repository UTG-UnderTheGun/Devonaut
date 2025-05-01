// student-assignment.js
'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import './student-assignment.css';

// Mock data to use when API calls fail
const mockAssignment = {
  id: 'assign123',
  title: 'Python Programming Assignment',
  chapter: 'Chapter 6: Control Structures',
  dueDate: '2025-02-14T23:59:00',
  points: 50,
  created_by: 'teacher1',
  exercises: [
    {
      id: 1,
      title: 'การคำนวณและการแสดงผลตัวแปร',
      description: 'โปรแกรมต่อไปนี้จะแสดงผลลัพธ์อะไร?',
      type: 'output',
      points: 5,
      code: "x = 3\ny = 5\na = x + y * (5 + 1)\nb = y + 16 // x\nprint(x, a, b)"
    },
    {
      id: 2,
      title: 'การรับอินพุตและฟอร์แมตสตริง',
      description: 'โปรแกรมต่อไปนี้จะแสดงผลลัพธ์อะไร? สมมติว่าผู้ใช้ป้อนค่า 1 และ 5 ตามลำดับ',
      type: 'output',
      points: 5,
      code: "x = int(input('Enter x: '))\ny = int(input('Enter y: '))\nprint(f'{x+10*5:.2f}', end='-')\nx = 3\nprint(f'{x+y**2:.2f}')"
    },
    {
      id: 11,
      title: 'การคำนวณสมการทางคณิตศาสตร์',
      description: 'เติมโค้ดในช่องว่างเพื่อคำนวณสมการ z = (x+1)²/2(y-1)³',
      type: 'fill',
      points: 10,
      code: "x = int(input('Enter x: '))\ny = int(input('Enter y: '))\nz = ____"
    },
    {
      id: 12,
      title: 'พื้นที่และเส้นรอบวงของวงกลม',
      description: 'เขียนโปรแกรมเพื่อคำนวณหาพื้นที่ของวงกลม (πr²) และเส้นรอบวง (2πr) โดยกำหนดให้ π มีค่าเท่ากับ 3.14 ต้องใช้ Named Constants และแสดงผลลัพธ์เป็นทศนิยม 3 ตำแหน่ง',
      type: 'coding',
      points: 15,
      code: "# เขียนโค้ดของคุณที่นี่"
    }
  ]
};

const mockSubmission = {
  id: 'sub456',
  assignment_id: 'assign123',
  user_id: 'student123',
  username: 'Wuttiphut Devonaut',
  section: '760001',
  status: 'pending',
  submitted_at: '2025-02-04T21:34:00',
  answers: {
    1: "3 33 8",
    2: "51.00-28.00",
    11: "(x+1)**2/(2*(y-1)**3)",
    12: "PI = 3.14\nr = float(input('Enter radius: '))\narea = PI * r * r\ncircumference = 2 * PI * r\nprint(f'Area: {area:.3f}')\nprint(f'Circumference: {circumference:.3f}')"
  },
  comments: []
};

const mockCodeHistory = [
  {
    id: 'hist1',
    user_id: 'student123',
    problem_index: 'assign123',
    action_type: 'run',
    code: "x = 3\ny = 5\na = x + y * (5 + 1)\nb = y + 16 // x\nprint(x, a, b)",
    created_at: '2025-02-04T20:30:00'
  },
  {
    id: 'hist2',
    user_id: 'student123',
    problem_index: 'assign123',
    action_type: 'run',
    code: "x = int(input('Enter x: '))\ny = int(input('Enter y: '))\nprint(f'{x+10*5:.2f}', end='-')\nx = 3\nprint(f'{x+y**2:.2f}')",
    created_at: '2025-02-04T20:45:00'
  },
  {
    id: 'hist3',
    user_id: 'student123',
    problem_index: 'assign123',
    action_type: 'run',
    code: "x = int(input('Enter x: '))\ny = int(input('Enter y: '))\nz = (x+1)**2/(2*(y-1)**3)",
    created_at: '2025-02-04T21:00:00'
  },
  {
    id: 'hist4',
    user_id: 'student123',
    problem_index: 'assign123',
    action_type: 'run',
    code: "PI = 3.14\nr = float(input('Enter radius: '))\narea = PI * r * r\ncircumference = 2 * PI * r\nprint(f'Area: {area:.3f}')\nprint(f'Circumference: {circumference:.3f}')",
    created_at: '2025-02-04T21:20:00'
  },
  {
    id: 'hist5',
    user_id: 'student123',
    problem_index: 'assign123',
    action_type: 'submission',
    code: "PI = 3.14\nr = float(input('Enter radius: '))\narea = PI * r * r\ncircumference = 2 * PI * r\nprint(f'Area: {area:.3f}')\nprint(f'Circumference: {circumference:.3f}')",
    created_at: '2025-02-04T21:34:00'
  }
];

const mockKeystrokeHistory = [
  {
    day: '2025-02-01',
    count: 12,
    action_type: 'keystroke',
    problem_index: 'assign123'
  },
  {
    day: '2025-02-02',
    count: 5,
    action_type: 'run',
    problem_index: 'assign123'
  },
  {
    day: '2025-02-03',
    count: 8,
    action_type: 'keystroke',
    problem_index: 'assign123'
  },
  {
    day: '2025-02-04',
    count: 15,
    action_type: 'run',
    problem_index: 'assign123'
  },
  {
    day: '2025-02-04',
    count: 1,
    action_type: 'submission',
    problem_index: 'assign123'
  }
];

// Mock data for exercises
const mockExercises = [
  {
    id: 1,
    title: 'การคำนวณพื้นที่วงกลม',
    description: 'เขียนโปรแกรมคำนวณพื้นที่วงกลม โดยรับค่ารัศมีจากผู้ใช้ และแสดงผลพื้นที่เป็นทศนิยม 2 ตำแหน่ง',
    type: 'coding',
    points: 10,
    code: "PI = 3.14\nr = float(input('Enter radius: '))\narea = PI * r * r\nprint(f'Area: {area:.2f}')"
  },
  {
    id: 2,
    title: 'การแสดงผลลัพธ์',
    description: 'โปรแกรมต่อไปนี้จะแสดงผลลัพธ์อะไร?',
    type: 'output',
    points: 5,
    code: "x = 5\ny = 3\nprint(x + y * 2)\nprint((x + y) * 2)"
  },
  {
    id: 3,
    title: 'การเติมคำในช่องว่าง',
    description: 'เติมโค้ดในช่องว่างเพื่อให้โปรแกรมทำงานได้ถูกต้อง',
    type: 'fill',
    points: 8,
    code: "def calculate_average(numbers):\n    total = ____\n    for num in numbers:\n        total += num\n    return total / ____"
  }
];

// Mock data for student answers
const mockAnswers = {
  1: "PI = 3.14\nr = float(input('Enter radius: '))\narea = PI * r * r\nprint(f'Area: {area:.2f}')",
  2: "11\n16",
  3: "0\nlen(numbers)"
};

// Mock data for AI chat history by exercise
const mockAiChatHistory = {
  1: [
    {
      id: 1,
      timestamp: '2024-02-20T10:30:00',
      role: 'student',
      content: 'ช่วยอธิบายการคำนวณพื้นที่วงกลมหน่อยครับ'
    },
    {
      id: 2,
      timestamp: '2024-02-20T10:30:15',
      role: 'ai',
      content: 'พื้นที่วงกลมคำนวณจากสูตร πr² โดยที่ π มีค่าประมาณ 3.14 และ r คือรัศมีของวงกลม'
    },
    {
      id: 3,
      timestamp: '2024-02-20T10:35:00',
      role: 'student',
      content: 'แล้วการแสดงผลทศนิยม 2 ตำแหน่งทำยังไงครับ?'
    },
    {
      id: 4,
      timestamp: '2024-02-20T10:35:10',
      role: 'ai',
      content: 'ใช้ f-string กับ format specifier เช่น f\'{number:.2f}\' จะแสดงทศนิยม 2 ตำแหน่ง'
    }
  ],
  2: [
    {
      id: 5,
      timestamp: '2024-02-20T10:40:00',
      role: 'student',
      content: 'ลำดับการคำนวณในโจทย์นี้เป็นยังไงครับ?'
    },
    {
      id: 6,
      timestamp: '2024-02-20T10:40:15',
      role: 'ai',
      content: 'ในบรรทัดแรก x + y * 2 จะคำนวณ y * 2 ก่อน แล้วค่อยบวกกับ x ส่วนบรรทัดที่สอง (x + y) * 2 จะคำนวณในวงเล็บก่อน แล้วค่อยคูณ 2'
    }
  ],
  3: [
    {
      id: 7,
      timestamp: '2024-02-20T10:45:00',
      role: 'student',
      content: 'การคำนวณค่าเฉลี่ยต้องเริ่มต้น total ด้วยอะไรครับ?'
    },
    {
      id: 8,
      timestamp: '2024-02-20T10:45:10',
      role: 'ai',
      content: 'ต้องเริ่มต้น total ด้วย 0 เพื่อให้สามารถบวกค่าเข้าไปทีละตัวได้ และหารด้วยจำนวนตัวเลขทั้งหมด (len(numbers))'
    }
  ]
};

// Mock data for coding activity by exercise
const mockCodingActivity = {
  1: [
    {
      id: 1,
      timestamp: '2024-02-20T10:25:00',
      action: 'start',
      exerciseId: 1
    },
    {
      id: 2,
      timestamp: '2024-02-20T10:28:00',
      action: 'run',
      exerciseId: 1,
      code: "PI = 3.14\nr = float(input('Enter radius: '))\narea = PI * r * r\nprint(area)"
    },
    {
      id: 3,
      timestamp: '2024-02-20T10:30:00',
      action: 'chat',
      exerciseId: 1
    },
    {
      id: 4,
      timestamp: '2024-02-20T10:32:00',
      action: 'edit',
      exerciseId: 1,
      code: "PI = 3.14\nr = float(input('Enter radius: '))\narea = PI * r * r\nprint(f'Area: {area:.2f}')"
    },
    {
      id: 5,
      timestamp: '2024-02-20T10:33:00',
      action: 'submit',
      exerciseId: 1
    }
  ],
  2: [
    {
      id: 6,
      timestamp: '2024-02-20T10:35:00',
      action: 'start',
      exerciseId: 2
    },
    {
      id: 7,
      timestamp: '2024-02-20T10:37:00',
      action: 'run',
      exerciseId: 2,
      code: "x = 5\ny = 3\nprint(x + y * 2)\nprint((x + y) * 2)"
    },
    {
      id: 8,
      timestamp: '2024-02-20T10:40:00',
      action: 'chat',
      exerciseId: 2
    },
    {
      id: 9,
      timestamp: '2024-02-20T10:42:00',
      action: 'submit',
      exerciseId: 2
    }
  ],
  3: [
    {
      id: 10,
      timestamp: '2024-02-20T10:43:00',
      action: 'start',
      exerciseId: 3
    },
    {
      id: 11,
      timestamp: '2024-02-20T10:44:00',
      action: 'edit',
      exerciseId: 3,
      code: "def calculate_average(numbers):\n    total = 0\n    for num in numbers:\n        total += num\n    return total / len(numbers)"
    },
    {
      id: 12,
      timestamp: '2024-02-20T10:45:00',
      action: 'chat',
      exerciseId: 3
    },
    {
      id: 13,
      timestamp: '2024-02-20T10:46:00',
      action: 'submit',
      exerciseId: 3
    }
  ]
};

const StudentAssignment = ({ studentId, assignmentId }) => {
  const router = useRouter();
  const [assignment, setAssignment] = useState(null);
  const [submission, setSubmission] = useState(null);
  const [codeHistory, setCodeHistory] = useState([]);
  const [keystrokeHistory, setKeystrokeHistory] = useState([]);
  const [aiChatHistory, setAiChatHistory] = useState({});
  const [activeTab, setActiveTab] = useState('exercises');
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [error, setError] = useState(null);
  const [score, setScore] = useState('');
  const [feedback, setFeedback] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [timelinePosition, setTimelinePosition] = useState(0);
  const [exercises, setExercises] = useState([]);
  const [answers, setAnswers] = useState({});
  const [codingActivity, setCodingActivity] = useState({});

  const fetchData = async () => {
    try {
      // Define API base URL
      const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      
      // Fetch assignment details
      const assignmentResponse = await fetch(`${API_BASE}/assignments/${assignmentId}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      
      if (!assignmentResponse.ok) {
        throw new Error(`Failed to fetch assignment: ${assignmentResponse.status}`);
      }
      
      const assignmentData = await assignmentResponse.json();
      setAssignment(assignmentData);
      console.log("Assignment loaded successfully:", assignmentData);
      
      // Set exercises from assignment data
      if (assignmentData.exercises && assignmentData.exercises.length > 0) {
        setExercises(assignmentData.exercises);
        
        // เพิ่ม log เพื่อตรวจสอบประเภทของแต่ละข้อ
        console.log("EXERCISE TYPES:");
        assignmentData.exercises.forEach((ex, idx) => {
          console.log(`Exercise ${idx+1} (ID: ${ex.id}) - Type: ${ex.type}`);
        });
      } else {
        setExercises(mockExercises); // Fallback to mock if no exercises
        console.warn("No exercises found in assignment data, using mock data");
      }
      
      // First, look up the user by student_id to get the MongoDB user_id
      let mongoUserId = studentId; // Default to using the provided ID
      
      try {
        const userLookupResponse = await fetch(`${API_BASE}/users/student-lookup/${studentId}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
        });
        
        if (userLookupResponse.ok) {
          const userData = await userLookupResponse.json();
          mongoUserId = userData.user_id; // Use the MongoDB user_id for submission lookup
          console.log(`Mapped student_id ${studentId} to MongoDB user_id ${mongoUserId}`);
        } else {
          // If lookup fails, continue with the original studentId
          console.warn(`Could not find user with student_id ${studentId}, using ID as-is`);
        }
      } catch (userLookupError) {
        console.error("Error looking up user:", userLookupError);
        // Continue with original ID
      }
      
      // Fetch student submission using the MongoDB user_id
      try {
        const submissionResponse = await fetch(`${API_BASE}/assignments/${assignmentId}/submission/${mongoUserId}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
        });
        
        if (submissionResponse.ok) {
          const submissionData = await submissionResponse.json();
          setSubmission(submissionData);
          console.log("Submission loaded successfully:", submissionData);
          
          // ดึงคำตอบจาก submission โดยตรง ง่ายๆ
          if (submissionData.answers) {
            console.log("RAW SUBMISSION ANSWERS:", submissionData.answers);
            setAnswers(submissionData.answers);
          } else {
            console.warn("No answers found in submission data");
            setAnswers({});
          }
        } else {
          // If submission not found, create a placeholder
          console.log("No submission found, creating placeholder");
          setSubmission({
            id: null,
            assignment_id: assignmentId,
            user_id: mongoUserId,
            username: "Unknown Student",
            section: "Unknown",
            status: "pending",
            submitted_at: null,
            answers: {},
            comments: []
          });
        }
      } catch (submissionError) {
        console.error("Error fetching submission:", submissionError);
        // Use mock data as fallback
        setSubmission(mockSubmission);
        setAnswers(mockAnswers);
      }
      
      // Fetch code history
      try {
        const codeHistoryResponse = await fetch(`${API_BASE}/code/code-history?user_id=${mongoUserId}&assignment_id=${assignmentId}&limit=100`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
        });
        
        if (codeHistoryResponse.ok) {
          const historyData = await codeHistoryResponse.json();
          setCodeHistory(historyData);
          console.log("Code history loaded successfully:", historyData);
          
          // Organize code history into coding activity structure
          const activity = {};
          if (assignmentData.exercises && assignmentData.exercises.length > 0) {
            assignmentData.exercises.forEach(exercise => {
              // Filter history for this exercise and sort by timestamp
              const exerciseHistory = historyData
                .filter(item => {
                  // Match by exercise_id if available, otherwise by problem_index
                  return (item.exercise_id && item.exercise_id === exercise.id) || 
                         (item.problem_index === exercise.id);
                })
                .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
                
              // Map to the format expected by the UI
              activity[exercise.id] = exerciseHistory.map((item, index) => ({
                id: index + 1,
                timestamp: item.created_at,
                action: item.action_type || 'run',
                exerciseId: exercise.id,
                code: item.code || ''
              }));
            });
            setCodingActivity(activity);
          }
        } else {
          // Fallback to mock data
          console.warn("Failed to fetch code history, using mock data");
      setCodeHistory(mockCodeHistory);
          setCodingActivity(mockCodingActivity);
        }
      } catch (historyError) {
        console.error("Error fetching code history:", historyError);
        setCodeHistory(mockCodeHistory);
        setCodingActivity(mockCodingActivity);
      }
      
      // Fetch keystroke history
      try {
        const keystrokeResponse = await fetch(`${API_BASE}/code/code-analytics/access-patterns?user_id=${mongoUserId}&assignment_id=${assignmentId}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
        });
        
        if (keystrokeResponse.ok) {
          const keystrokeData = await keystrokeResponse.json();
          
          // Transform the data into the format expected by the UI
          const formattedKeystrokeData = keystrokeData.map(item => ({
            day: item.day,
            count: item.count,
            action_type: item.action_type,
            problem_index: item.problem_index,
            exercise_id: item.exercise_id
          }));
          
          setKeystrokeHistory(formattedKeystrokeData);
          console.log("Keystroke history loaded successfully:", formattedKeystrokeData);
        } else {
          console.warn("Failed to fetch keystroke history, using mock data");
      setKeystrokeHistory(mockKeystrokeHistory);
        }
      } catch (keystrokeError) {
        console.error("Error fetching keystroke history:", keystrokeError);
        setKeystrokeHistory(mockKeystrokeHistory);
      }
      
      // Fetch AI chat history
      try {
        // Create an object to store chat histories by exercise
        const chatHistories = {};
        
        // Fetch chat history for each exercise
        if (exercises.length > 0) {
          for (const exercise of exercises) {
            const chatResponse = await fetch(`${API_BASE}/ai/conversations?user_id=${mongoUserId}&exercise_id=${exercise.id}&assignment_id=${assignmentId}`, {
              method: 'GET',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
            });
            
            if (chatResponse.ok) {
              const chatData = await chatResponse.json();
              
              if (chatData.messages && chatData.messages.length > 0) {
                // Transform to the format expected by the UI
                chatHistories[exercise.id] = chatData.messages.map((msg, index) => ({
                  id: index + 1,
                  timestamp: msg.timestamp || new Date().toISOString(),
                  role: msg.role === 'user' ? 'student' : 'ai',
                  content: msg.content
                }));
              } else {
                chatHistories[exercise.id] = [];
              }
            }
          }
          
          setAiChatHistory(chatHistories);
          console.log("AI chat history loaded successfully:", chatHistories);
        } else {
          console.warn("No exercises found, using mock AI chat history");
      setAiChatHistory(mockAiChatHistory);
        }
      } catch (chatError) {
        console.error("Error fetching AI chat history:", chatError);
        setAiChatHistory(mockAiChatHistory);
      }
      
    } catch (err) {
      setError(err.message);
      console.error('Error fetching assignment data:', err);
      
      // Fallback to mock data
      setAssignment(mockAssignment);
      setSubmission(mockSubmission);
      setCodeHistory(mockCodeHistory);
      setKeystrokeHistory(mockKeystrokeHistory);
      setAiChatHistory(mockAiChatHistory);
      setExercises(mockExercises);
      setAnswers(mockAnswers);
      setCodingActivity(mockCodingActivity);
    }
  };

  useEffect(() => {
    fetchData();
    
    // Initialize current exercise ID in localStorage
    if (exercises.length > 0) {
      try {
        localStorage.setItem('current-exercise-id', JSON.stringify(exercises[0].id));
      } catch (e) {
        console.warn('Could not initialize current exercise ID in localStorage', e);
      }
    }
  }, [studentId, assignmentId]);
  
  // Update localStorage when exercises change
  useEffect(() => {
    if (exercises.length > 0 && currentExerciseIndex < exercises.length) {
      try {
        localStorage.setItem('current-exercise-id', JSON.stringify(exercises[currentExerciseIndex].id));
      } catch (e) {
        console.warn('Could not update current exercise ID in localStorage', e);
      }
    }
  }, [exercises, currentExerciseIndex]);

  const handleBack = () => {
    router.push('/teacher/dashboard');
  };

  const handleScoreChange = (e) => {
    const value = e.target.value;
    if (value === '' || (Number(value) >= 0 && Number(value) <= (assignment?.points || 100))) {
      setScore(value);
    }
  };

  const handleSubmission = async () => {
    if (!score || !feedback.trim()) {
      alert('Please provide both score and feedback');
      return;
    }

    setIsSubmitting(true);
    try {
      // Define API base URL
      const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      
      // Prepare data for submission
      const gradingData = {
        score: Number(score),
        feedback: { general: feedback.trim() },
        comments: [
          {
            text: feedback.trim()
          }
        ]
      };

      // Send grading data to API
      const response = await fetch(`${API_BASE}/assignments/${assignmentId}/grade/${submission.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(gradingData),
      });

      if (!response.ok) {
        throw new Error(`Failed to submit grade: ${response.status}`);
      }

      const result = await response.json();
      console.log("Grade submitted successfully:", result);

      // Update local submission data
      setSubmission(prev => ({
        ...prev,
        score: Number(score),
        status: 'graded',
        graded_at: new Date().toISOString(),
        feedback: { general: feedback.trim() },
        comments: [
          ...(prev.comments || []),
          {
            id: Date.now().toString(),
            user_id: "current_teacher", // This should be updated if we have current user info
            username: "Current Teacher", // This should be updated if we have current user info
            role: "teacher",
            text: feedback.trim(),
            timestamp: new Date().toISOString()
          }
        ]
      }));

      alert('Grade submitted successfully!');
    } catch (err) {
      console.error("Error submitting grade:", err);
      alert(`Failed to submit grade: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper to format datetime
  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    try {
    const date = new Date(dateString);
    return date.toLocaleString();
    } catch (e) {
      console.error("Error formatting date:", e);
      return String(dateString);
    }
  };

  // Get code history for current exercise
  const getCurrentExerciseHistory = () => {
    const currentExercise = exercises[currentExerciseIndex];
    if (!currentExercise || !codingActivity[currentExercise.id]) {
      return [];
    }
    return codingActivity[currentExercise.id];
  };

  // Get code at specific timeline position for current exercise
  const getCodeAtTimeIndex = (index) => {
    const currentExercise = exercises[currentExerciseIndex];
    if (!currentExercise || !codingActivity[currentExercise.id]) {
      return '';
    }
    
    const exerciseActivity = codingActivity[currentExercise.id];
    
    // If index is out of range, return the latest
    if (index >= exerciseActivity.length) {
      return exerciseActivity[exerciseActivity.length - 1]?.code || '';
    }
    
    // Return code at specific point in timeline
    return exerciseActivity[index]?.code || '';
  };

  // Generate timeline markers for current exercise
  const generateTimelineMarkers = () => {
    const currentExercise = exercises[currentExerciseIndex];
    if (!currentExercise || !codingActivity[currentExercise.id]) {
      return [];
    }
    
    const exerciseActivity = codingActivity[currentExercise.id];
    return exerciseActivity.map((item, index) => ({
      index,
      time: new Date(item.timestamp).toLocaleTimeString(),
      type: item.action
    }));
  };

  const handleNextExercise = () => {
    if (currentExerciseIndex < exercises.length - 1) {
      setCurrentExerciseIndex(currentExerciseIndex + 1);
      setTimelinePosition(0);
      
      // Save current exercise ID to localStorage for submission tracking
      try {
        localStorage.setItem('current-exercise-id', JSON.stringify(exercises[currentExerciseIndex + 1].id));
      } catch (e) {
        console.warn('Could not save current exercise ID to localStorage', e);
      }
    }
  };

  const handlePrevExercise = () => {
    if (currentExerciseIndex > 0) {
      setCurrentExerciseIndex(currentExerciseIndex - 1);
      setTimelinePosition(0);
      
      // Save current exercise ID to localStorage for submission tracking
      try {
        localStorage.setItem('current-exercise-id', JSON.stringify(exercises[currentExerciseIndex - 1].id));
      } catch (e) {
        console.warn('Could not save current exercise ID to localStorage', e);
      }
    }
  };

  const timelineMarkers = generateTimelineMarkers();

  if (error && !assignment) {
    return <div className="error-container">Error: {error}</div>;
  }

  if (!assignment || !submission) {
    return null;
  }

  return (
    <div className="student-assignment">
      <div className="assignment-header">
        <h1>{assignment.title}</h1>
        <div className="assignment-meta">
          <span>Chapter: {assignment.chapter}</span>
          <span>Due: {formatDateTime(assignment.dueDate)}</span>
          <span>Points: {assignment.points}</span>
        </div>
      </div>

      <div className="student-info-panel">
        <div className="student-details">
          <h3>Student Information</h3>
          <div className="info-grid">
            <div className="info-item">
              <label>Name</label>
              <span>{submission.username || 'N/A'}</span>
            </div>
            <div className="info-item">
              <label>ID</label>
              <span>{studentId}</span>
            </div>
            <div className="info-item">
              <label>Section</label>
              <span>{submission.section || 'N/A'}</span>
            </div>
            <div className="info-item">
              <label>Submitted</label>
              <span>{formatDateTime(submission.submitted_at)}</span>
            </div>
            <div className="info-item">
              <label>Status</label>
              <span className={`status-badge ${typeof submission.status === 'string' ? submission.status : 'pending'}`}>
                {typeof submission.status === 'string' ? submission.status : 'pending'}
              </span>
            </div>
            <div className="info-item score-input-container">
              <label>Score</label>
              <div className="score-input">
                <input
                  type="number"
                  value={score}
                  onChange={handleScoreChange}
                  min="0"
                  max={assignment.points}
                  placeholder="0"
                  disabled={submission.status === 'graded'}
                />
                <span>/ {assignment.points}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="tab-navigation">
        <button 
          className={activeTab === 'exercises' ? 'active' : ''} 
          onClick={() => setActiveTab('exercises')}
        >
          Exercises
        </button>
        <button 
          className={activeTab === 'timeline' ? 'active' : ''} 
          onClick={() => setActiveTab('timeline')}
        >
          Code Timeline
        </button>
        <button 
          className={activeTab === 'ai-chat' ? 'active' : ''} 
          onClick={() => setActiveTab('ai-chat')}
        >
          AI Chat History
        </button>
        <button 
          className={activeTab === 'keystroke' ? 'active' : ''} 
          onClick={() => setActiveTab('keystroke')}
        >
          Coding Activity
        </button>
      </div>

      <div className="content-grid">
        <div className="main-content-assignment">
          {activeTab === 'exercises' && (
            <div className="exercise-section">
              <div className="exercise-navigation">
                <button 
                  className="nav-button prev" 
                  onClick={handlePrevExercise}
                  disabled={currentExerciseIndex === 0}
                >
                  Previous
                </button>
                <span className="exercise-counter">
                  Exercise {currentExerciseIndex + 1} of {exercises.length}
                </span>
                <button 
                  className="nav-button next" 
                  onClick={handleNextExercise}
                  disabled={currentExerciseIndex === exercises.length - 1}
                >
                  Next
                </button>
              </div>

              <div className="exercise-content">
                <h3>{exercises[currentExerciseIndex].title}</h3>
                <p className="exercise-description">
                  {exercises[currentExerciseIndex].description}
                </p>

                {(exercises[currentExerciseIndex].type === 'output' || 
                  exercises[currentExerciseIndex].type === 'explain' || 
                  exercises[currentExerciseIndex].type === 'Output' || 
                  exercises[currentExerciseIndex].type === 'Explain') && (
                  <div className="exercise-output">
                    <h4>Student's Answer:</h4>
                    <div className="answer-display">
                      {(() => {
                        const exerciseId = exercises[currentExerciseIndex].id;
                        const exerciseNumber = currentExerciseIndex + 1;
                        const exerciseType = exercises[currentExerciseIndex].type;
                        console.log(`Looking for OUTPUT/EXPLAIN answer for exercise ${exerciseNumber} (ID: ${exerciseId}, Type: ${exerciseType})`, answers);
                        
                        // ใช้เลขข้อโดยตรง - ดูจากรูปแล้วใช้ตัวเลขเป็นคีย์
                        const answer = answers[exerciseNumber] || answers[String(exerciseNumber)];
                        
                        if (answer) {
                          console.log(`Found answer for exercise ${exerciseNumber}:`, answer);
                          if (typeof answer === 'string') {
                            return answer;
                          } else if (typeof answer === 'object') {
                            return JSON.stringify(answer);
                          }
                        }
                        
                        console.log(`No answer found for exercise ${exerciseNumber}`);
                        return "No answer submitted";
                      })()}
                    </div>
                  </div>
                )}

                {exercises[currentExerciseIndex].type === 'fill' && (
                  <div className="exercise-fill">
                    <h4>Code Template:</h4>
                    <pre className="code-display">
                      <code>{exercises[currentExerciseIndex].code}</code>
                    </pre>
                    <h4>Student's Answer:</h4>
                    <div className="answer-display">
                      {(() => {
                        const exerciseNumber = currentExerciseIndex + 1;
                        console.log(`Looking for fill answer for exercise ${exerciseNumber}`, answers);
                        
                        // ใช้เลขข้อโดยตรง
                        const answer = answers[exerciseNumber] || answers[exerciseNumber.toString()];
                        
                        if (answer) {
                          if (typeof answer === 'object') {
                            return (
                              <div>
                                {Object.entries(answer).map(([key, value], i) => {
                                  const blankIndex = key.split('-').pop();
                                  return (
                                    <div key={i} className="blank-answer">
                                      <strong>Blank {blankIndex}:</strong> {value}
                                    </div>
                                  );
                                })}
                              </div>
                            );
                          } else if (typeof answer === 'string') {
                            return answer;
                          }
                        }
                        
                        return "No answer submitted";
                      })()}
                    </div>
                  </div>
                )}

                {exercises[currentExerciseIndex].type === 'coding' && (
                  <div className="exercise-coding">
                    <h4>Student's Code:</h4>
                    <pre className="code-display">
                      <code>{(() => {
                        const exerciseId = exercises[currentExerciseIndex].id;
                        const exerciseNumber = currentExerciseIndex + 1;
                        console.log(`Looking for coding answer for exercise ${exerciseNumber} (ID: ${exerciseId})`, answers);
                        
                        // Log ค่าคำตอบทั้งหมดเพื่อดูข้อมูล
                        console.log("All answers:", JSON.stringify(answers, null, 2));
                        
                        // ใช้เลขข้อโดยตรงและแยกตามข้อที่ชัดเจน
                        let answer;
                        
                        // วิธีที่ 1: ใช้ exerciseNumber (ตัวเลขลำดับข้อ)
                        if (answers[exerciseNumber] !== undefined) {
                          answer = answers[exerciseNumber];
                          console.log(`Found answer using exercise number key ${exerciseNumber}:`, answer);
                        }
                        
                        // วิธีที่ 2: ใช้ exerciseId (ID ของข้อ)
                        else if (answers[exerciseId] !== undefined) {
                          answer = answers[exerciseId];
                          console.log(`Found answer using exercise ID key ${exerciseId}:`, answer);
                        }
                        
                        // วิธีที่ 3: ใช้ String(exerciseNumber)
                        else if (answers[String(exerciseNumber)] !== undefined) {
                          answer = answers[String(exerciseNumber)];
                          console.log(`Found answer using string exercise number key "${exerciseNumber}":`, answer);
                        }
                        
                        // วิธีที่ 4: ใช้ String(exerciseId)
                        else if (answers[String(exerciseId)] !== undefined) {
                          answer = answers[String(exerciseId)];
                          console.log(`Found answer using string exercise ID key "${exerciseId}":`, answer);
                        }
                        
                        // ถ้าเจอคำตอบ ให้แสดงผล
                        if (answer !== undefined) {
                          if (typeof answer === 'string') {
                            return answer;
                          } else if (typeof answer === 'object') {
                            return JSON.stringify(answer, null, 2);
                          }
                        }
                        
                        // ถ้าไม่เจอคำตอบจากข้างบน ลองดูใน submission
                        if (submission) {
                          // ถ้ามี code ใน submission โดยตรง
                          if (submission.code) {
                            return submission.code;
                          }
                          
                          // ถ้ามี answers และเป็น coding exercise
                          if (submission.answers) {
                            // ลองดึงคำตอบจาก submission.answers โดยตรง
                            const subAnswer = submission.answers[exerciseId] || 
                                             submission.answers[String(exerciseId)] || 
                                             submission.answers[exerciseNumber] || 
                                             submission.answers[String(exerciseNumber)];
                            
                            if (subAnswer) {
                              console.log(`Found answer in submission for exercise ${exerciseNumber}:`, subAnswer);
                              if (typeof subAnswer === 'string') {
                                return subAnswer;
                              } else if (typeof subAnswer === 'object') {
                                return JSON.stringify(subAnswer, null, 2);
                              }
                            }
                          }
                        }
                        
                        // ถ้าไม่มีเลย ใช้โค้ดเริ่มต้นของโจทย์
                        return exercises[currentExerciseIndex].starter_code || "No code submitted";
                      })()}</code>
                    </pre>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'timeline' && (
            <div className="timeline-section">
              <div className="exercise-navigation">
                <button 
                  className="nav-button prev" 
                  onClick={handlePrevExercise}
                  disabled={currentExerciseIndex === 0}
                >
                  Previous
                </button>
                <span className="exercise-counter">
                  Exercise {currentExerciseIndex + 1} of {exercises.length}
                </span>
                <button 
                  className="nav-button next" 
                  onClick={handleNextExercise}
                  disabled={currentExerciseIndex === exercises.length - 1}
                >
                  Next
                </button>
              </div>

              <h3>Code Evolution Timeline - {exercises[currentExerciseIndex]?.title || 'Exercise'}</h3>
              
              <div className="timeline-slider-container">
                {exercises[currentExerciseIndex] && 
                 codingActivity[exercises[currentExerciseIndex].id] &&
                 codingActivity[exercises[currentExerciseIndex].id].length > 0 ? (
                  <>
                <input 
                  type="range" 
                  min="0" 
                  max={codingActivity[exercises[currentExerciseIndex].id].length - 1} 
                  value={timelinePosition} 
                  onChange={(e) => setTimelinePosition(parseInt(e.target.value))} 
                  className="timeline-slider"
                />
                <div className="timeline-markers">
                  {codingActivity[exercises[currentExerciseIndex].id].map((activity, idx) => (
                    <div 
                      key={activity.id}
                      className={`timeline-marker ${activity.action} ${idx === timelinePosition ? 'active' : ''}`}
                      style={{left: `${(idx / (codingActivity[exercises[currentExerciseIndex].id].length - 1)) * 100}%`}}
                      onClick={() => setTimelinePosition(idx)}
                      title={`${new Date(activity.timestamp).toLocaleTimeString()} - ${activity.action}`}
                    >
                      <span className="marker-tooltip">
                        {new Date(activity.timestamp).toLocaleTimeString()}
                        <br/>
                        {activity.action}
                      </span>
                    </div>
                  ))}
                </div>
                  </>
                ) : (
                  <div className="empty-state">No timeline data available for this exercise</div>
                )}
              </div>

              {exercises[currentExerciseIndex] && 
               codingActivity[exercises[currentExerciseIndex].id] &&
               codingActivity[exercises[currentExerciseIndex].id].length > 0 &&
               timelinePosition < codingActivity[exercises[currentExerciseIndex].id].length ? (
                <>
              <div className="timeline-info">
                <div className="current-position-info">
                  <span>Time: {new Date(codingActivity[exercises[currentExerciseIndex].id][timelinePosition].timestamp).toLocaleTimeString()}</span>
                  <span>Action: {codingActivity[exercises[currentExerciseIndex].id][timelinePosition].action}</span>
                </div>
              </div>

              <div className="code-display">
                <pre>
                  <code>
                    {codingActivity[exercises[currentExerciseIndex].id][timelinePosition].code || 
                     exercises[currentExerciseIndex].code}
                  </code>
                </pre>
              </div>
                </>
              ) : null}
            </div>
          )}

          {activeTab === 'ai-chat' && (
            <div className="ai-chat-section">
              <div className="exercise-navigation">
                <button 
                  className="nav-button prev" 
                  onClick={handlePrevExercise}
                  disabled={currentExerciseIndex === 0}
                >
                  Previous
                </button>
                <span className="exercise-counter">
                  Exercise {currentExerciseIndex + 1} of {exercises.length}
                </span>
                <button 
                  className="nav-button next" 
                  onClick={handleNextExercise}
                  disabled={currentExerciseIndex === exercises.length - 1}
                >
                  Next
                </button>
              </div>

              <h3>AI Chat History - {exercises[currentExerciseIndex]?.title || 'Exercise'}</h3>
              
              <div className="chat-container">
                {exercises[currentExerciseIndex] && 
                 aiChatHistory[exercises[currentExerciseIndex].id] ? (
                  aiChatHistory[exercises[currentExerciseIndex].id].map((message) => (
                  <div key={message.id} className={`chat-message ${message.role}`}>
                    <div className="message-header">
                      <span className="message-sender">
                        {message.role === 'student' ? 'Student' : 'AI Assistant'}
                      </span>
                      <span className="message-time">
                        {new Date(message.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <div className="message-content">
                      {message.content}
                    </div>
                  </div>
                  ))
                ) : (
                  <div className="empty-state">No AI chat history available for this exercise</div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'keystroke' && (
            <div className="keystroke-section">
              <div className="exercise-navigation">
                <button 
                  className="nav-button prev" 
                  onClick={handlePrevExercise}
                  disabled={currentExerciseIndex === 0}
                >
                  Previous
                </button>
                <span className="exercise-counter">
                  Exercise {currentExerciseIndex + 1} of {exercises.length}
                </span>
                <button 
                  className="nav-button next" 
                  onClick={handleNextExercise}
                  disabled={currentExerciseIndex === exercises.length - 1}
                >
                  Next
                </button>
              </div>

              <h3>Coding Activity - {exercises[currentExerciseIndex]?.title || 'Exercise'}</h3>
              {keystrokeHistory && keystrokeHistory.length > 0 ? (
                <div className="activity-visualization">
                  <div className="activity-heatmap">
                    {keystrokeHistory.map((day, idx) => (
                      <div key={idx} className="activity-day">
                        <div className="day-header">{day.day}</div>
                        <div 
                          className="activity-level" 
                          style={{
                            height: `${Math.min(100, day.count * 3)}px`,
                            backgroundColor: `rgba(124, 58, 237, ${Math.min(1, day.count/20)})`
                          }}
                        >
                          <span className="activity-count">{day.count}</span>
                        </div>
                        <div className="activity-type">{typeof day.action_type === 'object' ? JSON.stringify(day.action_type) : day.action_type}</div>
                      </div>
                    ))}
                  </div>
                  <div className="activity-summary">
                    <div className="summary-item">
                      <label>Total Code Runs</label>
                      <span>{codeHistory.filter(h => h.action_type === 'run').length}</span>
                    </div>
                    <div className="summary-item">
                      <label>Total Submissions</label>
                      <span>{codeHistory.filter(h => h.action_type === 'submission').length}</span>
                    </div>
                    <div className="summary-item">
                      <label>Average Time Between Runs</label>
                      <span>
                        {codeHistory.length > 1 ? 
                          Math.round((new Date(codeHistory[codeHistory.length-1]?.created_at || new Date()) - 
                                    new Date(codeHistory[0]?.created_at || new Date())) / 
                                    (codeHistory.length * 60000)) + ' min' : 
                          'N/A'}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="empty-state">No keystroke activity data available</div>
              )}
            </div>
          )}
        </div>

        <div className="feedback-container">
          <h3>Grading & Feedback</h3>
          
          {submission.status !== 'graded' ? (
            <div className="feedback-input">
              <textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="Add your feedback for the student..."
                disabled={submission.status === 'graded' || isSubmitting}
              />
              <button 
                onClick={handleSubmission} 
                className="btn-submit" 
                disabled={submission.status === 'graded' || isSubmitting || !score || !feedback.trim()}
              >
                {isSubmitting ? 'Submitting...' : 'Submit Grade & Feedback'}
              </button>
            </div>
          ) : (
            <div className="feedback-success">
              Graded on {formatDateTime(submission.graded_at)}
            </div>
          )}
          
          <div className="feedback-history">
            <h4>Feedback History</h4>
            {submission.comments && submission.comments.length > 0 ? (
              submission.comments.map((comment, idx) => (
                <div key={idx} className="feedback-item">
                  <div className="feedback-header">
                    <span className="feedback-author">{comment.username || 'Teacher'}</span>
                    <span className="feedback-time">{formatDateTime(comment.timestamp)}</span>
                  </div>
                  {submission.score && idx === 0 && (
                    <div className="feedback-score">Score: {submission.score}/{assignment.points}</div>
                  )}
                  <p className="feedback-content">{comment.text}</p>
                </div>
              ))
            ) : (
              <div className="empty-state">No feedback yet</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentAssignment;