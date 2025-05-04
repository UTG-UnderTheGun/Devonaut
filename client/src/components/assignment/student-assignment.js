// student-assignment.js
'use client';
import { useState, useEffect, useRef } from 'react';
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
    },
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
  ],
  3: [
    {
      id: 9,
      timestamp: '2024-02-20T10:50:00',
      role: 'student',
      content: 'การคำนวณค่าเฉลี่ยต้องเริ่มต้น total ด้วยอะไรครับ?'
    },
    {
      id: 10,
      timestamp: '2024-02-20T10:50:10',
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

// Replace mockAiChatHistory with empty initial state
const initialAiChatHistory = {};

// Skeleton loading component
const AssignmentSkeleton = () => {
  return (
    <div className="student-assignment coding-container create-assignment-container">
      <div className="back-button-container">
        <div className="back-button">← Back to List</div>
      </div>
      
      <div className="skeleton-loading">
        {/* Assignment header skeleton */}
        <div className="skeleton skeleton-header" style={{ height: '2rem', width: '60%', marginBottom: '1rem' }}></div>
        <div className="skeleton skeleton-meta" style={{ height: '1rem', width: '80%', marginBottom: '1.5rem' }}></div>
        
        {/* Student info panel skeleton */}
        <div className="skeleton-info-panel" style={{ 
          background: 'white', 
          borderRadius: '0.5rem', 
          padding: '1.5rem', 
          marginBottom: '1.5rem' 
        }}>
          <div className="skeleton" style={{ height: '1.5rem', width: '30%', marginBottom: '1rem' }}></div>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', 
            gap: '1.25rem' 
          }}>
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div className="skeleton" style={{ height: '0.75rem', width: '60%' }}></div>
                <div className="skeleton" style={{ height: '1rem', width: '80%' }}></div>
              </div>
            ))}
          </div>
        </div>
        
        {/* Tabs skeleton */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="skeleton" style={{ height: '2.5rem', width: '8rem', borderRadius: '0.375rem' }}></div>
          ))}
        </div>
        
        {/* Content skeleton */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: '1fr 350px', 
          gap: '1.5rem' 
        }}>
          <div className="skeleton" style={{ 
            background: 'white', 
            borderRadius: '0.5rem', 
            height: '400px' 
          }}></div>
          
          <div className="skeleton" style={{ 
            background: 'white', 
            borderRadius: '0.5rem', 
            height: '400px' 
          }}></div>
        </div>
      </div>
    </div>
  );
};

const StudentAssignment = ({ studentId, assignmentId, onBack, onSubmissionUpdate }) => {
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
  const [checkedCodeHistory, setCheckedCodeHistory] = useState(false);
  const userIdRef = useRef(studentId);
  const [mongoUserIdRef, setMongoUserIdRef] = useState(null);

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
          setMongoUserIdRef(userData.user_id); // Store MongoDB user ID in ref
          console.log(`Mapped student_id ${studentId} to MongoDB user_id ${mongoUserId}`);
        } else {
          // If lookup fails, continue with the original studentId
          setMongoUserIdRef(studentId); // Store student ID as fallback
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
      
      // Try to fetch detailed keystroke timeline first
      try {
        const keystrokeTimelineResponse = await fetch(
          `${API_BASE}/code/keystrokes/${mongoUserId}/${assignmentId}/timeline`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
        });
        
        if (keystrokeTimelineResponse.ok) {
          const timelineData = await keystrokeTimelineResponse.json();
          console.log("Keystroke timeline loaded successfully:", timelineData);
          
          // Process timeline data into coding activity format
          const activity = {};
          
          // First initialize all exercises with empty arrays
          if (assignmentData.exercises && assignmentData.exercises.length > 0) {
            assignmentData.exercises.forEach(exercise => {
              activity[exercise.id] = [];
              // Also initialize with string versions of ID to handle different ID types
              activity[String(exercise.id)] = [];
            });
            
            // Log all available keystroke data for debugging
            console.log("TIMELINE DATA DUMP - ALL ENTRIES:", timelineData.map(item => ({
              problem_index: item.problem_index,
              exercise_id: item.exercise_id,
              timestamp: item.timestamp && item.timestamp.substring(0, 19)
            })));
            
            // Process each exercise
            assignmentData.exercises.forEach(exercise => {
              console.log(`Processing timeline data for exercise ${exercise.id} (${typeof exercise.id})`);
              
              // Make a more flexible matcher function
              const matchesExercise = (item) => {
                const exerciseId = exercise.id;
                const strExerciseId = String(exerciseId);
                const itemProblemIndex = item.problem_index !== undefined ? item.problem_index : null;
                const itemExerciseId = item.exercise_id !== undefined ? item.exercise_id : null;
                
                // Try all possible matching combinations
                return (
                  // Direct match on problem_index
                  itemProblemIndex === exerciseId ||
                  // String match on problem_index
                  String(itemProblemIndex) === strExerciseId ||
                  // Number match if problem_index is numeric string
                  (typeof itemProblemIndex === 'string' && !isNaN(parseInt(itemProblemIndex)) && 
                   parseInt(itemProblemIndex) === exerciseId) ||
                  // Direct match on exercise_id
                  itemExerciseId === exerciseId ||
                  // String match on exercise_id
                  String(itemExerciseId) === strExerciseId ||
                  // Number match if exercise_id is numeric string
                  (typeof itemExerciseId === 'string' && !isNaN(parseInt(itemExerciseId)) && 
                   parseInt(itemExerciseId) === exerciseId)
                );
              };
              
              // Filter timeline entries for this exercise using our flexible matcher
              const exerciseTimeline = timelineData.filter(matchesExercise);
              
              console.log(`Found ${exerciseTimeline.length} timeline entries for exercise ${exercise.id}`);
              
              if (exerciseTimeline.length > 0) {
                // Log some sample data
                console.log("Sample timeline entry:", exerciseTimeline[0]);
                
              // Map to the format expected by the UI
                const timelineEntries = exerciseTimeline.map((item, index) => ({
                id: index + 1,
                  timestamp: item.timestamp || new Date().toISOString(),
                  action: item.action_type || 'keystroke',
                  exerciseId: exercise.id,
                  code: item.code || '',
                  changes: item.changes || null
                }));
                
                // Sort entries by timestamp
                timelineEntries.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
                
                // Store timeline under both string and number keys to ensure it's found
                activity[exercise.id] = timelineEntries;
                activity[String(exercise.id)] = timelineEntries;
                
                console.log(`Processed ${timelineEntries.length} timeline entries for exercise ${exercise.id}`);
              }
            });
            
            setCodingActivity(activity);
            console.log("FINAL ACTIVITY STRUCTURE:", Object.keys(activity).map(key => ({
              key: key,
              entries: activity[key] ? activity[key].length : 0
            })));
          }
        } else {
          // If timeline API fails, try to fetch individual keystroke data
          console.log("Keystroke timeline API failed, trying to fetch raw keystroke data");
          try {
            const rawKeystrokesResponse = await fetch(
              `${API_BASE}/code/keystrokes/${mongoUserId}/${assignmentId}`, {
              method: 'GET',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
            });
            
            if (rawKeystrokesResponse.ok) {
              const keystrokesData = await rawKeystrokesResponse.json();
              console.log("Raw keystrokes loaded successfully:", keystrokesData);
              
              // Process raw keystrokes into coding activity format
              const activity = {};
              
              if (assignmentData.exercises && assignmentData.exercises.length > 0) {
                assignmentData.exercises.forEach(exercise => {
                  // Filter keystrokes for this exercise - with better matching
                  const exerciseKeystrokes = keystrokesData.filter(item => {
                    // Check problem_index match
                    const problemIndexMatch = 
                      (item.problem_index === exercise.id) || 
                      (item.problem_index !== null && parseInt(item.problem_index) === parseInt(exercise.id)) ||
                      (String(item.problem_index) === String(exercise.id));
                    
                    // Check exercise_id match as fallback
                    const exerciseIdMatch = item.exercise_id && 
                      (item.exercise_id === exercise.id || 
                       String(item.exercise_id) === String(exercise.id));
                       
                    return problemIndexMatch || exerciseIdMatch;
                  });
                  
                  console.log(`Found ${exerciseKeystrokes.length} keystrokes for exercise ${exercise.id}`);
                  
                  if (exerciseKeystrokes.length > 0) {
                    // Sort by timestamp
                    exerciseKeystrokes.sort((a, b) => {
                      return new Date(a.timestamp) - new Date(b.timestamp);
                    });
                    
                    // Map to the format expected by the UI
                    activity[exercise.id] = exerciseKeystrokes.map((item, index) => ({
                      id: index + 1,
                      timestamp: item.timestamp,
                      action: item.action_type || 'keystroke',
                exerciseId: exercise.id,
                code: item.code || ''
              }));
                    console.log(`Processed ${exerciseKeystrokes.length} keystrokes for exercise ${exercise.id}`);
                  } else {
                    console.log(`No keystrokes found for exercise ${exercise.id}`);
                    activity[exercise.id] = [];
                  }
            });
                
            setCodingActivity(activity);
                console.log("Processed raw keystrokes into coding activity:", activity);
                
                // Check if we have at least some data
                const hasData = Object.values(activity).some(arr => arr.length > 0);
                if (!hasData) {
                  console.log("No keystroke data found for any exercise, falling back to code history");
                  await fetchCodeHistory(API_BASE, mongoUserId, assignmentId, assignmentData.exercises);
                }
          }
        } else {
              // If raw keystrokes API fails too, fall back to code history
              console.log("Raw keystrokes API failed, falling back to code history");
              await fetchCodeHistory(API_BASE, mongoUserId, assignmentId, assignmentData.exercises);
            }
          } catch (rawKeystrokeError) {
            console.error("Error fetching raw keystrokes:", rawKeystrokeError);
            await fetchCodeHistory(API_BASE, mongoUserId, assignmentId, assignmentData.exercises);
          }
        }
      } catch (keystrokeTimelineError) {
        console.error("Error fetching keystroke timeline:", keystrokeTimelineError);
        // Fall back to code history
        await fetchCodeHistory(API_BASE, mongoUserId, assignmentId, assignmentData.exercises);
      }
      
      // Get keystroke analytics using the new API
      try {
        const keystrokeAnalyticsResponse = await fetch(
          `${API_BASE}/code/keystrokes/${mongoUserId}/aggregate?assignment_id=${assignmentId}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
        });
        
        if (keystrokeAnalyticsResponse.ok) {
          const analyticsData = await keystrokeAnalyticsResponse.json();
          console.log("Keystroke analytics loaded successfully:", analyticsData);
          
          // Transform the data into the format expected by the UI
          const formattedKeystrokeData = analyticsData.map(item => ({
            day: item.day,
            count: item.count,
            action_type: item.action_type,
            problem_index: item.problem_index,
            exercise_id: item.exercise_id
          }));
          
          setKeystrokeHistory(formattedKeystrokeData);
          console.log("Keystroke analytics transformed successfully:", formattedKeystrokeData);
        } else {
          // Fallback to old API
          console.log("New keystroke analytics API failed, falling back to old API");
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
          } catch (oldKeystrokeError) {
            console.error("Error fetching old keystroke history:", oldKeystrokeError);
            setKeystrokeHistory(mockKeystrokeHistory);
          }
        }
      } catch (keystrokeAnalyticsError) {
        console.error("Error fetching keystroke analytics:", keystrokeAnalyticsError);
        
        // Fallback to old analytics API
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
      }
      
      // Fetch AI chat history
      try {
        // Create query parameters
        const params = new URLSearchParams();
        params.append('user_id', mongoUserId);
        params.append('assignment_id', assignmentId);
        
        // Fetch chat history from API
        const chatHistoryResponse = await fetch(`${API_BASE}/ai/chat-history?${params.toString()}`, {
              method: 'GET',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
            });
            
        if (chatHistoryResponse.ok) {
          const chatHistoryData = await chatHistoryResponse.json();
          console.log("Raw chat history data:", chatHistoryData);
          
          // Process chat histories by exercise
          const chatHistories = {};
          
          if (chatHistoryData.histories && chatHistoryData.histories.length > 0) {
            // Create lookup map for exercise IDs for faster matching later
            const exerciseIdMap = {};
            if (exercises && exercises.length > 0) {
              exercises.forEach(exercise => {
                // Store ID in multiple formats
                const id = exercise.id;
                const idStr = String(id);
                const idNum = !isNaN(parseInt(id)) ? parseInt(id) : null;
                
                exerciseIdMap[id] = true;
                exerciseIdMap[idStr] = true;
                if (idNum !== null) exerciseIdMap[idNum] = true;
                if (idNum !== null && idNum > 0) exerciseIdMap[idNum - 1] = true; // For zero-based index
              });
            }
            
            // Group messages by exercise ID
            chatHistoryData.histories.forEach(history => {
              // Store chat history under multiple key formats to ensure matching
              const exerciseId = history.exercise_id;
              const exerciseIdStr = String(exerciseId);
              const exerciseIdNum = !isNaN(parseInt(exerciseId)) ? parseInt(exerciseId) : null;
              
              // Create entries for different formats of the same ID
              if (!chatHistories[exerciseId]) chatHistories[exerciseId] = [];
              if (!chatHistories[exerciseIdStr]) chatHistories[exerciseIdStr] = [];
              if (exerciseIdNum !== null && !chatHistories[exerciseIdNum]) chatHistories[exerciseIdNum] = [];
              
              // Format messages
              if (history.messages && history.messages.length > 0) {
                // Create formatted messages
                const formattedMessages = history.messages.map((message, idx) => ({
                  id: `${history.id || history._id || idx}-${idx}`,
                  timestamp: message.timestamp || new Date().toISOString(),
                  role: message.role === 'user' ? 'student' : message.role,
                  content: message.content || ''
                }));
                
                // Sort messages by timestamp
                formattedMessages.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
                
                // Add to all ID formats
                chatHistories[exerciseId] = formattedMessages;
                chatHistories[exerciseIdStr] = formattedMessages;
                if (exerciseIdNum !== null) chatHistories[exerciseIdNum] = formattedMessages;
              }
            });
            
            // Log found and missing IDs for debugging
            if (exercises && exercises.length > 0) {
              const foundIds = new Set(Object.keys(chatHistories));
              console.log("Found chat histories for IDs:", Array.from(foundIds));
              
              exercises.forEach(exercise => {
                const id = exercise.id;
                const idStr = String(id);
                const idNum = !isNaN(parseInt(id)) ? parseInt(id) : null;
                
                if (!foundIds.has(id) && !foundIds.has(idStr) && 
                    (idNum === null || !foundIds.has(idNum)) &&
                    (idNum === null || idNum <= 0 || !foundIds.has(idNum - 1))) {
                  console.log(`No chat history found for exercise ${id}`);
                }
              });
          }
          
          setAiChatHistory(chatHistories);
          console.log("AI chat history loaded successfully:", chatHistories);
        } else {
            console.log("No chat history found for this student and assignment, trying direct endpoint");
            await fetchDirectChatHistory(API_BASE, mongoUserId, assignmentId);
          }
        } else {
          console.warn("Failed to fetch AI chat history, trying direct endpoint");
          await fetchDirectChatHistory(API_BASE, mongoUserId, assignmentId);
        }
      } catch (chatError) {
        console.error("Error fetching AI chat history:", chatError);
        await fetchDirectChatHistory(API_BASE, mongoUserId, assignmentId);
      }
      
    } catch (err) {
      setError(err.message);
      console.error('Error fetching assignment data:', err);
      
      // Fallback to mock data - remove mock chat history
      setAssignment(mockAssignment);
      setSubmission(mockSubmission);
      setCodeHistory(mockCodeHistory);
      setKeystrokeHistory(mockKeystrokeHistory);
      setAiChatHistory({}); // Use empty instead of mock
      setExercises(mockExercises);
      setAnswers(mockAnswers);
      setCodingActivity(mockCodingActivity);
    }
  };
  
  // Helper function to fetch chat history from direct endpoint
  const fetchDirectChatHistory = async (apiBase, userId, assignmentId) => {
    console.log("Fetching chat history from simple endpoint");
    
    try {
      // สร้าง URL สำหรับ endpoint ใหม่
      const url = new URL(`${apiBase}/ai/chat-history-simple`);
      
      // ใช้ URLSearchParams สำหรับสร้าง query parameters
      url.searchParams.append('user_id', userId);
      url.searchParams.append('assignment_id', assignmentId);
      
      console.log(`Attempting to fetch chat history from: ${url}`);
      
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log("Chat history response from simple endpoint:", data);
        
        // ตรวจสอบว่ามีข้อมูลหรือไม่
        if (data.success && data.results && data.results.length > 0) {
          console.log(`Found ${data.results.length} chat history records`);
          
          // สร้าง map ของข้อมูลแชทตาม exercise_id
          const chatHistories = {};
          
          data.results.forEach(history => {
            // Skip if no exercise_id or messages
            if (!history.exercise_id || !history.messages || history.messages.length === 0) {
              console.log(`Skipping chat history ${history._id} - missing exercise_id or messages`);
              return;
            }
            
            console.log(`Processing history for exercise_id: ${history.exercise_id}`);
            
            // Store under all possible key formats
            const exerciseId = history.exercise_id;
            const keysToUse = [
              exerciseId,                  // Original format
              String(exerciseId),          // String format
              parseInt(exerciseId) || null // Number format if applicable
            ].filter(k => k !== null && k !== undefined);
            
            // Format messages
            const formattedMessages = history.messages.map((msg, idx) => ({
              id: `${history._id || idx}-${idx}`,
              timestamp: msg.timestamp || new Date().toISOString(),
              role: msg.role === 'user' ? 'student' : (msg.role === 'student' ? 'student' : msg.role),
              content: msg.content || ''
            }));
            
            // Sort messages by timestamp
            formattedMessages.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
            
            // Store messages under each key format
            keysToUse.forEach(key => {
              chatHistories[key] = formattedMessages;
            });
            
            console.log(`Stored ${formattedMessages.length} messages for exercise ${exerciseId}`);
          });
          
          // Log final chat history structure for debugging
          console.log("Available exercise IDs in chat history:", Object.keys(chatHistories));
          setAiChatHistory(chatHistories);
        } else {
          console.log("No chat history found in response");
          setAiChatHistory({});
        }
      } else {
        console.warn(`Failed to fetch chat history: ${response.status} ${response.statusText}`);
        setAiChatHistory({});
      }
    } catch (error) {
      console.error("Error fetching chat history:", error);
      setAiChatHistory({});
    }
  };
  
  // Add helper function to process chat history data regardless of source
  const processChatHistoryData = (histories) => {
    if (!histories || histories.length === 0) {
      console.log("No histories to process");
      setAiChatHistory({});
      return;
    }
    
    console.log(`Processing ${histories.length} histories from data`);
    
    const chatHistories = {};
    
    histories.forEach(history => {
      const exerciseId = history.exercise_id;
      
      // Skip if no exercise_id
      if (!exerciseId) {
        console.log("Skipping history with no exercise_id");
        return;
      }
      
      // Store under all possible key formats
      const keysToUse = [
        exerciseId,                   // Original format
        String(exerciseId),           // String format
        parseInt(exerciseId) || null,  // Number format
      ];
      
      // Filter out null/undefined values
      const validKeys = keysToUse.filter(k => k !== null && k !== undefined);
      
      // Format messages
      if (history.messages && history.messages.length > 0) {
        // Create formatted messages
        const formattedMessages = history.messages.map((message, idx) => ({
          id: `${history._id || idx}-${idx}`,
          timestamp: message.timestamp || new Date().toISOString(),
          role: message.role === 'user' || message.role === 'student' ? 'student' : message.role,
          content: message.content || ''
        }));
        
        // Sort messages by timestamp
        formattedMessages.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        
        // Store under all valid keys
        validKeys.forEach(key => {
          chatHistories[key] = formattedMessages;
        });
      }
    });
    
    console.log("Processed chat histories:", chatHistories);
    setAiChatHistory(chatHistories);
  };
  
  // Helper function to fetch code history as fallback
  const fetchCodeHistory = async (apiBase, userId, assignmentId, exercisesList) => {
    console.log("Fetching code history as fallback");
    
    try {
      const historyResponse = await fetch(
        `${apiBase}/code/code-history?user_id=${userId}&limit=1000`,
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
        }
      );
      
      if (historyResponse.ok) {
        const historyData = await historyResponse.json();
        console.log(`Found ${historyData.length} code history entries`);
        
        // Process code history into coding activity format
        const activity = {};
        
        if (exercisesList && exercisesList.length > 0) {
          exercisesList.forEach(exercise => {
            // Filter history entries for this exercise - with better matching
            const exerciseHistory = historyData.filter(item => {
              // First check for a direct problem_index match
              const problemIndexMatch = 
                (item.problem_index === exercise.id) || 
                (item.problem_index !== null && parseInt(item.problem_index) === parseInt(exercise.id)) ||
                (String(item.problem_index) === String(exercise.id));
                
              // Then check for exercise_id
              const exerciseIdMatch = item.exercise_id && 
                (item.exercise_id === exercise.id || 
                String(item.exercise_id) === String(exercise.id));
                
              return problemIndexMatch || exerciseIdMatch;
            });
            
            if (exerciseHistory.length > 0) {
              // Sort by timestamp
              exerciseHistory.sort((a, b) => {
                return new Date(a.created_at) - new Date(b.created_at);
              });
              
              // Map to the format expected by the UI
              activity[exercise.id] = exerciseHistory.map((item, index) => ({
                id: index + 1,
                timestamp: item.created_at,
                action: item.action_type || 'access',
                exerciseId: exercise.id,
                code: item.code || ''
              }));
              console.log(`Found ${exerciseHistory.length} history entries for exercise ${exercise.id}`);
            } else {
              console.log(`No history entries found for exercise ${exercise.id}`);
              activity[exercise.id] = [];
            }
          });
          
          setCodingActivity(activity);
          console.log("Processed code history into coding activity:", activity);
        }
      } else {
        console.error("Failed to fetch code history");
      }
    } catch (historyError) {
      console.error("Error fetching code history:", historyError);
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
  
  // Add effect to automatically refresh timeline data when tab changes to timeline
  useEffect(() => {
    if (activeTab === 'timeline' && mongoUserIdRef) {
      console.log('Timeline tab selected, refreshing timeline data...');
      refreshTimelineData();
    }
  }, [activeTab, mongoUserIdRef]);
  
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

  // Add useEffect to verify data is loaded correctly
  useEffect(() => {
    if (exercises && exercises.length > 0 && Object.keys(codingActivity).length > 0) {
      console.log("Timeline data verification:");
      exercises.forEach((exercise, idx) => {
        const activityForExercise = codingActivity[exercise.id];
        console.log(`Exercise ${idx+1}: ID=${exercise.id} (${typeof exercise.id}), Timeline entries: ${activityForExercise ? activityForExercise.length : 0}`);
        
        // Check if we can find this exercise in a different way
        const matchingKeys = Object.keys(codingActivity).filter(key => 
          String(key) === String(exercise.id)
        );
        
        if (matchingKeys.length > 0 && !activityForExercise) {
          console.log(`Exercise ${exercise.id} found with different key format: ${matchingKeys[0]}`);
          // Copy data to make it accessible with the proper key
          codingActivity[exercise.id] = codingActivity[matchingKeys[0]];
        }
      });
    }
  }, [exercises, codingActivity]);

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
    router.push('/teacher/dashboard');
    }
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
      
      // Call the callback function to update parent component
      if (typeof onSubmissionUpdate === 'function') {
        onSubmissionUpdate();
      }
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

  // Add a utility function to normalize ID lookups
  const getActivityForExercise = (exerciseId) => {
    if (!exerciseId || !codingActivity) {
      console.log(`No activity data available - exerciseId: ${exerciseId}, codingActivity exists: ${!!codingActivity}`);
      return [];
    }
    
    console.log(`Looking for activity for exercise ${exerciseId} (${typeof exerciseId})`);
    console.log(`Available activity keys: ${Object.keys(codingActivity).join(', ')}`);
    
    // Try all possible matching methods
    
    // Direct lookup first
    if (codingActivity[exerciseId] && codingActivity[exerciseId].length > 0) {
      console.log(`Found ${codingActivity[exerciseId].length} entries with direct match on key: ${exerciseId}`);
      return codingActivity[exerciseId];
    }
    
    // Try string conversion
    const strId = String(exerciseId);
    if (codingActivity[strId] && codingActivity[strId].length > 0) {
      console.log(`Found ${codingActivity[strId].length} entries with string key: ${strId}`);
      return codingActivity[strId];
    }
    
    // Try numeric conversion if possible
    const numId = parseInt(exerciseId);
    if (!isNaN(numId)) {
      if (codingActivity[numId] && codingActivity[numId].length > 0) {
        console.log(`Found ${codingActivity[numId].length} entries with numeric key: ${numId}`);
        return codingActivity[numId];
      }
      
      // Check for zero-based index (problem_index might be 0-based while exercise IDs are 1-based)
      const zeroBasedIndex = numId - 1;
      if (zeroBasedIndex >= 0 && codingActivity[zeroBasedIndex] && codingActivity[zeroBasedIndex].length > 0) {
        console.log(`Found ${codingActivity[zeroBasedIndex].length} entries with zero-based index: ${zeroBasedIndex}`);
        return codingActivity[zeroBasedIndex];
      }
    }
    
    // Look for keys that might be strings with the same value
    for (const key of Object.keys(codingActivity)) {
      // Compare as strings
      if (String(key) === strId && codingActivity[key].length > 0) {
        console.log(`Found ${codingActivity[key].length} entries with string comparison on key: ${key}`);
        return codingActivity[key];
      }
      
      // Compare numerically if both are numbers
      const keyNum = parseInt(key);
      if (!isNaN(keyNum) && !isNaN(numId) && keyNum === numId && codingActivity[key].length > 0) {
        console.log(`Found ${codingActivity[key].length} entries with numeric comparison on key: ${key}`);
        return codingActivity[key];
      }
      
      // Check for zero-based index match (when problem_index in DB is 0-based)
      if (!isNaN(keyNum) && !isNaN(numId) && keyNum === numId - 1 && codingActivity[key].length > 0) {
        console.log(`Found ${codingActivity[key].length} entries with zero-based index match: key=${key}, exercise=${numId}`);
        return codingActivity[key];
      }
    }
    
    // Last resort: check if any of the timeline items have matching exerciseId property
    for (const key of Object.keys(codingActivity)) {
      const entries = codingActivity[key];
      if (entries && entries.length > 0) {
        const matchingEntries = entries.filter(entry => 
          entry.exerciseId === exerciseId || 
          String(entry.exerciseId) === strId || 
          (entry.exerciseId !== undefined && !isNaN(parseInt(entry.exerciseId)) && parseInt(entry.exerciseId) === numId)
        );
        
        if (matchingEntries.length > 0) {
          console.log(`Found ${matchingEntries.length} entries by checking exerciseId property inside entries`);
          return matchingEntries;
        }
      }
    }
    
    console.log(`No activity found for exercise ${exerciseId} after trying all lookup methods`);
    return [];
  };

  const timelineMarkers = generateTimelineMarkers();

  // Add a specific function to refresh the timeline data
  const refreshTimelineData = () => {
    // Define API base URL
    const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    const userId = mongoUserIdRef || studentId;
    
    console.log(`Manually refreshing timeline data for user ${userId}, assignment ${assignmentId}`);
    
    // Fetch fresh timeline data
    fetch(`${API_BASE}/code/keystrokes/${userId}/${assignmentId}/timeline`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    })
    .then(response => {
      if (response.ok) {
        return response.json();
      } else {
        throw new Error(`Failed to fetch timeline: ${response.status}`);
      }
    })
    .then(timelineData => {
      console.log(`Refreshed timeline data, found ${timelineData.length} entries`);
      
      // Debug the actual data to see problem_index values
      if (timelineData.length > 0) {
        console.log("Sample entry problem_index:", timelineData[0].problem_index);
        console.log("Sample entry exercise_id:", timelineData[0].exercise_id);
      }
      
      // Process into coding activity format (simplified version)
      const activity = {};
      
      // Initialize all exercises with empty arrays
      if (exercises && exercises.length > 0) {
        exercises.forEach(exercise => {
          activity[exercise.id] = [];
          activity[String(exercise.id)] = [];
          
          // Also initialize zero-based index arrays for problem_index data
          const zeroBasedIndex = parseInt(exercise.id) - 1;
          if (!isNaN(zeroBasedIndex) && zeroBasedIndex >= 0) {
            activity[zeroBasedIndex] = [];
            activity[String(zeroBasedIndex)] = [];
          }
        });
      }
      
      // Process each entry in the timeline data
      timelineData.forEach(item => {
        const problemIndex = item.problem_index;
        const exerciseId = item.exercise_id;
        
        console.log(`Processing entry: problem_index=${problemIndex}, exercise_id=${exerciseId}`);
        
        // Try to match to exercises
        exercises.forEach(exercise => {
          const exerciseNumber = parseInt(exercise.id);
          const zeroBasedIndex = exerciseNumber - 1;
          
          // Check for direct match
          const directMatch = 
            (problemIndex !== undefined && (problemIndex === exercise.id || String(problemIndex) === String(exercise.id))) ||
            (exerciseId !== undefined && (exerciseId === exercise.id || String(exerciseId) === String(exercise.id)));
          
          // Check for zero-based problem_index match
          const zeroBasedMatch = 
            (problemIndex !== undefined && (
              problemIndex === zeroBasedIndex || 
              String(problemIndex) === String(zeroBasedIndex)
            ));
            
          if (directMatch || zeroBasedMatch) {
            // Add to both string and number versions of the ID
            const entry = {
              id: (activity[exercise.id].length || 0) + 1,
              timestamp: item.timestamp || new Date().toISOString(),
              action: item.action_type || 'keystroke',
              exerciseId: exercise.id,
              code: item.code || '',
              changes: item.changes || null
            };
            
            // Add to appropriate keys
            activity[exercise.id].push(entry);
            activity[String(exercise.id)].push(entry);
            
            // If we matched using zero-based index, also store in that key
            if (zeroBasedMatch) {
              if (!activity[zeroBasedIndex]) activity[zeroBasedIndex] = [];
              if (!activity[String(zeroBasedIndex)]) activity[String(zeroBasedIndex)] = [];
              
              activity[zeroBasedIndex].push(entry);
              activity[String(zeroBasedIndex)].push(entry);
              
              console.log(`Added entry to zero-based index ${zeroBasedIndex} for exercise ${exercise.id}`);
            }
            
            console.log(`Added entry for exercise ${exercise.id}${zeroBasedMatch ? ` (matched zero-based index ${zeroBasedIndex})` : ''}`);
          }
        });
      });
      
      // Sort all entries by timestamp
      Object.keys(activity).forEach(key => {
        if (activity[key] && activity[key].length > 0) {
          activity[key].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        }
      });
      
      // Debug what we've processed
      console.log("Processed activity keys:", Object.keys(activity).map(key => {
        return {
          key,
          entries: activity[key] ? activity[key].length : 0
        };
      }));
      
      // Update state with fresh data
      setCodingActivity(activity);
      console.log(`Timeline refresh complete, processed ${Object.keys(activity).length} exercise keys`);
    })
    .catch(error => {
      console.error("Error refreshing timeline:", error);
      // Fall back to code history if timeline fetch fails
      fetchCodeHistory(API_BASE, userId, assignmentId, exercises);
    });
  };

  if (error && !assignment) {
    return <div className="error-container">Error: {error}</div>;
  }

  if (!assignment || !submission) {
    return <AssignmentSkeleton />;
  }

  return (
    <div className="student-assignment coding-container create-assignment-container">
      <div className="back-button-container">
        <button 
          className="back-button"
          onClick={handleBack}
        >
          ← Back to List
        </button>
      </div>

      <div className="assignment-header">
        <h1 className="assignment-title">{assignment.title}</h1>
        <div className="assignment-meta">
          <span>Chapter: {assignment.chapter}</span>
          <span>Due: {formatDateTime(assignment.dueDate)}</span>
          <span>Points: {assignment.points}</span>
        </div>
      </div>

      <div className="student-info-panel table-container">
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
        <div className="main-content-assignment table-container">
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
                        
                        // ถ้าไม่เจอคำตอบจากข้างบน ลองดึงคำตอบจาก submission
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
                {/* Add debugging info */}
                {console.log(`Current exercise ID: ${exercises[currentExerciseIndex]?.id} (${typeof exercises[currentExerciseIndex]?.id})`)}
                {console.log(`Available activity keys: ${Object.keys(codingActivity).join(', ')}`)}
                {exercises[currentExerciseIndex] && console.log(`Activity for current exercise: ${getActivityForExercise(exercises[currentExerciseIndex].id).length} entries`)}
                
                {exercises[currentExerciseIndex] && (() => {
                  const currentExerciseId = exercises[currentExerciseIndex].id;
                  const activity = getActivityForExercise(currentExerciseId);
                  
                  // Log details about the activity we found
                  console.log(`Timeline data for exercise ${currentExerciseId}: ${activity ? activity.length : 0} entries`);
                  if (activity && activity.length > 0) {
                    console.log("First activity entry:", {
                      timestamp: activity[0].timestamp,
                      action: activity[0].action,
                      code: activity[0].code ? activity[0].code.substring(0, 30) + "..." : null
                    });
                  }
                  
                  // Try to directly access the data using all possible key formats
                  let directActivity = null;
                  if (codingActivity[currentExerciseId]?.length > 0) {
                    directActivity = codingActivity[currentExerciseId];
                    console.log(`Direct access found ${directActivity.length} entries`);
                  } else if (codingActivity[String(currentExerciseId)]?.length > 0) {
                    directActivity = codingActivity[String(currentExerciseId)];
                    console.log(`String key access found ${directActivity.length} entries`);
                  } else if (!isNaN(parseInt(currentExerciseId)) && 
                            codingActivity[parseInt(currentExerciseId)]?.length > 0) {
                    directActivity = codingActivity[parseInt(currentExerciseId)];
                    console.log(`Numeric key access found ${directActivity.length} entries`);
                  }
                  
                  // Use either the activity from the getter function or direct access
                  const effectiveActivity = 
                    (activity && activity.length > 0) ? activity : 
                    (directActivity && directActivity.length > 0) ? directActivity : 
                    [];
                  
                  if (effectiveActivity.length > 0) {
                    // Calculate a safe timeline position
                    const safePosition = Math.min(timelinePosition, effectiveActivity.length - 1);
                    
                    return (
                  <>
                <input 
                  type="range" 
                  min="0" 
                          max={effectiveActivity.length - 1} 
                          value={safePosition}
                  onChange={(e) => setTimelinePosition(parseInt(e.target.value))} 
                  className="timeline-slider"
                />
                <div className="timeline-markers">
                          {effectiveActivity.map((item, idx) => (
                            <div 
                              key={idx}
                              className={`timeline-marker ${item.action} ${idx === safePosition ? 'active' : ''}`}
                              style={{left: `${(idx / (effectiveActivity.length - 1)) * 100}%`}}
                      onClick={() => setTimelinePosition(idx)}
                              title={`${new Date(item.timestamp).toLocaleTimeString()} - ${item.action}`}
                    >
                      <span className="marker-tooltip">
                                {new Date(item.timestamp).toLocaleTimeString()}
                        <br/>
                                {item.action}
                      </span>
                    </div>
                  ))}
                </div>
                  </>
                    );
                  } else {
                    // Force fetch code history if we have no timeline data
                    if (!checkedCodeHistory) {
                      console.log("No timeline data found, checking code history...");
                      setCheckedCodeHistory(true);
                      // Try to load code history on next render
                      setTimeout(() => {
                        fetchCodeHistory(
                          process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000', 
                          mongoUserIdRef || studentId,  
                          assignmentId, 
                          exercises
                        );
                      }, 100);
                    }
                    
                    return (
                      <div className="empty-state">
                        <p>No timeline data available for this exercise</p>
                        <p className="debug-info">Exercise ID: {currentExerciseId}</p>
                        
                        <button 
                          className="refresh-button"
                          onClick={() => {
                            refreshTimelineData();
                          }}
                        >
                          Refresh Timeline Data
                        </button>
                      </div>
                    );
                  }
                })()}
              </div>

              {exercises[currentExerciseIndex] && (() => {
                const currentExerciseId = exercises[currentExerciseIndex].id;
                const activity = getActivityForExercise(currentExerciseId);
                
                if (activity && activity.length > 0 && timelinePosition < activity.length) {
                  const currentItem = activity[timelinePosition];
                  return (
                <>
              <div className="timeline-info">
                <div className="current-position-info">
                          <span>Time: {new Date(currentItem.timestamp).toLocaleTimeString()}</span>
                          <span>Action: {currentItem.action}</span>
                        </div>
                        
                        <div className="timeline-navigation">
                          <button 
                            onClick={() => setTimelinePosition(Math.max(0, timelinePosition - 1))}
                            disabled={timelinePosition === 0}
                            className="timeline-nav-button"
                          >
                            Previous Change
                          </button>
                          <button 
                            onClick={() => setTimelinePosition(Math.min(activity.length - 1, timelinePosition + 1))}
                            disabled={timelinePosition === activity.length - 1}
                            className="timeline-nav-button"
                          >
                            Next Change
                          </button>
                          <button 
                            onClick={refreshTimelineData}
                            className="refresh-button"
                          >
                            Refresh
                          </button>
                        </div>
              </div>

              <div className="code-display">
                <pre>
                  <code>
                    {currentItem.code ? 
                      // Handle newlines in the code properly
                      currentItem.code.split('\\n').join('\n') :
                      (exercises[currentExerciseIndex].code || "// No code available")
                    }
                  </code>
                </pre>
              </div>
                      
                      {/* Display code changes if available */}
                      {timelinePosition > 0 && (
                        <div className="code-diff-display">
                          <h4>Changes from Previous Version</h4>
                          <div className="diff-container">
                            {(() => {
                              const currentCode = currentItem.code || '';
                              const prevCode = activity[timelinePosition - 1].code || '';
                              
                              // Check if we have changes from the API
                              const changes = currentItem.changes;
                              
                              if (changes && Array.isArray(changes)) {
                                // If we have changes from the API, use them
                                return (
                                  <pre className="diff-content">
                                    {changes.map((line, i) => {
                                      if (line.startsWith('+ ')) {
                                        return <div key={i} className="diff-line diff-added">{line}</div>;
                                      } else if (line.startsWith('- ')) {
                                        return <div key={i} className="diff-line diff-removed">{line}</div>;
                                      } else {
                                        return <div key={i} className="diff-line diff-unchanged">{line}</div>;
                                      }
                                    })}
                                  </pre>
                                );
                              } else {
                                // Otherwise calculate diff on client side
                                // Simple diff visualization (can be enhanced with a proper diff library)
                                const currentLines = currentCode.split('\n');
                                const prevLines = prevCode.split('\n');
                                
                                return (
                                  <pre className="diff-content">
                                    {currentLines.map((line, i) => {
                                      if (i >= prevLines.length) {
                                        // Line was added
                                        return <div key={i} className="diff-line diff-added">+ {line}</div>;
                                      } else if (line !== prevLines[i]) {
                                        // Line was changed
                                        return (
                                          <div key={i}>
                                            <div className="diff-line diff-removed">- {prevLines[i]}</div>
                                            <div className="diff-line diff-added">+ {line}</div>
                                          </div>
                                        );
                                      } else {
                                        // Line is unchanged
                                        return <div key={i} className="diff-line diff-unchanged"> {line}</div>;
                                      }
                                    })}
                                    
                                    {/* Check for removed lines at the end */}
                                    {prevLines.slice(currentLines.length).map((line, i) => (
                                      <div key={`removed-${i}`} className="diff-line diff-removed">- {line}</div>
                                    ))}
                                  </pre>
                                );
                              }
                            })()}
                          </div>
                        </div>
                      )}
                    </>
                  );
                } else {
                  return (
                    <div className="empty-state">
                      <p>No timestamped code changes available for this exercise.</p>
                      <p>Please ensure there are keystroke entries recorded for this exercise.</p>
                      <div className="debug-info">
                        <p>Current Exercise ID: {currentExerciseId}</p>
                        <p>Available data: {activity ? activity.length : 0} entries</p>
                        <p>If this continues, try making some code changes in the editor first.</p>
                      </div>
                    </div>
                  );
                }
              })()}
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
                {exercises[currentExerciseIndex] && (() => {
                  const currentExercise = exercises[currentExerciseIndex];
                  const exerciseId = currentExercise.id;
                  
                  // Try multiple formats of the ID to find chat history
                  let chatMessages = null;
                  
                  // Try exact match first
                  if (aiChatHistory[exerciseId] && aiChatHistory[exerciseId].length > 0) {
                    chatMessages = aiChatHistory[exerciseId];
                  }
                  // Try string format
                  else if (aiChatHistory[String(exerciseId)] && aiChatHistory[String(exerciseId)].length > 0) {
                    chatMessages = aiChatHistory[String(exerciseId)];
                  }
                  // Try numeric format if possible
                  else if (!isNaN(parseInt(exerciseId)) && 
                           aiChatHistory[parseInt(exerciseId)] && 
                           aiChatHistory[parseInt(exerciseId)].length > 0) {
                    chatMessages = aiChatHistory[parseInt(exerciseId)];
                  }
                  // Try zero-based index as a last resort
                  else if (!isNaN(parseInt(exerciseId)) && 
                           aiChatHistory[parseInt(exerciseId) - 1] && 
                           aiChatHistory[parseInt(exerciseId) - 1].length > 0) {
                    chatMessages = aiChatHistory[parseInt(exerciseId) - 1];
                  }
                  
                  // Try to find a match across all history keys
                  if (!chatMessages) {
                    for (const key in aiChatHistory) {
                      if (aiChatHistory[key] && aiChatHistory[key].length > 0 &&
                          (key === String(exerciseId) || 
                           (!isNaN(parseInt(key)) && !isNaN(parseInt(exerciseId)) && parseInt(key) === parseInt(exerciseId)) ||
                           (!isNaN(parseInt(key)) && !isNaN(parseInt(exerciseId)) && parseInt(key) === parseInt(exerciseId) - 1))) {
                        chatMessages = aiChatHistory[key];
                        break;
                      }
                    }
                  }
                
                  if (chatMessages && chatMessages.length > 0) {
                    return chatMessages.map((message) => (
                  <div key={message.id} className={`chat-message ${message.role}`}>
                    <div className="message-header">
                      <span className="message-sender">
                            {message.role === 'student' || message.role === 'user' ? 'Student' : 'AI Assistant'}
                      </span>
                      <span className="message-time">
                        {new Date(message.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <div className="message-content">
                      {message.content}
                    </div>
                  </div>
                    ));
                  } else {
                    return (
                      <div className="empty-state">
                        <p>No AI chat history available for this exercise</p>
                        <div className="debug-info">
                          <p>Exercise ID: {exerciseId} (type: {typeof exerciseId})</p>
                          <p>Available exercise IDs in chat history: {Object.keys(aiChatHistory).join(", ")}</p>
                          <details>
                            <summary>Check data types</summary>
                            <p>Exercise ID type: {typeof exerciseId}</p>
                            <p>Chat history keys types: {Object.keys(aiChatHistory).map(key => `${key}(${typeof key})`).join(", ")}</p>
                          </details>
                          <div className="debug-buttons">
                            <button onClick={() => {
                              // ดึงข้อมูลแชทใหม่โดยตรงจาก API
                              const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
                              const userId = mongoUserIdRef || studentId;
                              
                              console.log(`Retry: Fetching chat history for user ${userId}, assignment ${assignmentId}, exercise ${exerciseId}`);
                              
                              // แสดง URL และพารามิเตอร์ที่ใช้
                              const urlStr = `${API_BASE}/ai/chat-history-simple?user_id=${encodeURIComponent(userId)}&assignment_id=${encodeURIComponent(assignmentId)}&exercise_id=${encodeURIComponent(exerciseId)}`;
                              console.log(`API URL: ${urlStr}`);
                              
                              // ใช้ fetch พร้อม timeout
                              const controller = new AbortController();
                              const timeout = setTimeout(() => controller.abort(), 10000); // 10 second timeout
                              
                              fetch(urlStr, {
                                method: 'GET',
                                headers: { 'Content-Type': 'application/json' },
                                credentials: 'include',
                                signal: controller.signal
                              })
                              .then(response => {
                                clearTimeout(timeout);
                                if (!response.ok) {
                                  throw new Error(`Failed to fetch: ${response.status} ${response.statusText}`);
                                }
                                return response.json();
                              })
                              .then(data => {
                                console.log("Chat history response:", data);
                                
                                if (data.success && data.results && data.results.length > 0) {
                                  // ดึงข้อมูลเฉพาะ exercise ที่ต้องการ
                                  const relevantHistories = data.results.filter(h => 
                                    h.exercise_id && (
                                      String(h.exercise_id) === String(exerciseId) ||
                                      (parseInt(h.exercise_id) === parseInt(exerciseId) && !isNaN(parseInt(exerciseId)))
                                    )
                                  );
                                  
                                  if (relevantHistories.length > 0) {
                                    // สร้าง chat history ใหม่
                                    const newHistory = {};
                                    
                                    // Process all matching histories
                                    relevantHistories.forEach(history => {
                                      const messages = history.messages || [];
                                      
                                      // Format messages
                                      const formattedMessages = messages.map((msg, idx) => ({
                                        id: `manual-${idx}`,
                                        timestamp: msg.timestamp || new Date().toISOString(),
                                        role: msg.role === 'user' ? 'student' : (msg.role === 'student' ? 'student' : msg.role),
                                        content: msg.content || ''
                                      }));
                                      
                                      // Store under all common key formats
                                      newHistory[history.exercise_id] = formattedMessages;
                                      newHistory[String(history.exercise_id)] = formattedMessages;
                                      
                                      if (!isNaN(parseInt(history.exercise_id))) {
                                        newHistory[parseInt(history.exercise_id)] = formattedMessages;
                                      }
                                    });
                                    
                                    // Update state with all found chat histories
                                    setAiChatHistory(newHistory);
                                    console.log("Updated chat history state:", newHistory);
                                  } else {
                                    console.log(`No exact match for exercise ID ${exerciseId}. Showing all chat histories.`);
                                    
                                    // Create a combined history with all messages
                                    const combinedHistory = {};
                                    
                                    // Process all histories
                                    data.results.forEach(history => {
                                      if (!history.exercise_id || !history.messages) return;
                                      
                                      const formattedMessages = history.messages.map((msg, idx) => ({
                                        id: `all-${history.exercise_id}-${idx}`,
                                        timestamp: msg.timestamp || new Date().toISOString(),
                                        role: msg.role === 'user' ? 'student' : (msg.role === 'student' ? 'student' : msg.role),
                                        content: msg.content || ''
                                      }));
                                      
                                      // Store under all formats
                                      combinedHistory[history.exercise_id] = formattedMessages;
                                      combinedHistory[String(history.exercise_id)] = formattedMessages;
                                      
                                      if (!isNaN(parseInt(history.exercise_id))) {
                                        combinedHistory[parseInt(history.exercise_id)] = formattedMessages;
                                      }
                                      
                                      // Also store under current exercise ID to make it visible
                                      combinedHistory[exerciseId] = formattedMessages;
                                      combinedHistory[String(exerciseId)] = formattedMessages;
                                      if (!isNaN(parseInt(exerciseId))) {
                                        combinedHistory[parseInt(exerciseId)] = formattedMessages;
                                      }
                                    });
                                    
                                    setAiChatHistory(combinedHistory);
                                    console.log("Updated with combined chat history:", combinedHistory);
                                  }
                                } else {
                                  console.error("No chat history found in response");
                                }
                              })
                              .catch(error => {
                                clearTimeout(timeout);
                                console.error("Error fetching chat history:", error);
                              });
                            }}>
                              Retry with string conversion
                            </button>
                            
                            <button onClick={() => {
                              // ทดสอบการเชื่อมต่อกับ API
                              const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
                              console.log("Testing API connection to:", API_BASE);
                              
                              // ทดสอบ endpoint โดยตรงที่ root URL
                              fetch(`${API_BASE}/health-check`, {
                                method: 'GET',
                                headers: { 'Content-Type': 'application/json' },
                                mode: 'cors',  // ระบุ CORS mode ชัดเจน
                              })
                              .then(response => response.json())
                              .then(data => {
                                console.log("Health check response:", data);
                                alert(`API Health check: ${JSON.stringify(data)}`);
                              })
                              .catch(error => {
                                console.error("Error testing API:", error);
                                alert(`Error testing API: ${error.message}`);
                              });
                            }}>
                              Test API Connection
                            </button>
                            
                            <button onClick={() => {
                              // ทดสอบ AI API endpoint โดยตรง
                              const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
                              console.log("Testing AI API endpoint:", API_BASE);
                              
                              fetch(`${API_BASE}/ai/test`, {
                                method: 'GET',
                                mode: 'cors',  // ระบุ CORS mode ชัดเจน
                              })
                              .then(response => response.json())
                              .then(data => {
                                console.log("AI API test result:", data);
                                alert(`AI API test result: ${JSON.stringify(data)}`);
                              })
                              .catch(error => {
                                console.error("Error testing AI API:", error);
                                alert(`Error testing AI API: ${error.message}`);
                              });
                            }}>
                              Test AI API
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  }
                })()}
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

        <div className="feedback-container table-container">
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