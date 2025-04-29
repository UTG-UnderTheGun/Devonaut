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
  const [aiChatHistory, setAiChatHistory] = useState([]);
  const [activeTab, setActiveTab] = useState('exercises');
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [error, setError] = useState(null);
  const [score, setScore] = useState('');
  const [feedback, setFeedback] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [timelinePosition, setTimelinePosition] = useState(0);
  const [exercises] = useState(mockExercises);
  const [answers] = useState(mockAnswers);
  const [codingActivity] = useState(mockCodingActivity);

  const fetchData = async () => {
    try {
      // Use mock data only
      setAssignment(mockAssignment);
      setSubmission(mockSubmission);
      setCodeHistory(mockCodeHistory);
      setKeystrokeHistory(mockKeystrokeHistory);
      setAiChatHistory(mockAiChatHistory);
    } catch (err) {
      setError(err.message);
      console.error('Error setting mock data:', err);
    }
  };

  useEffect(() => {
    fetchData();
  }, [studentId, assignmentId]);

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
      // Simulate success for demo purposes without API call
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
            user_id: "current_teacher", // This should be the actual teacher ID
            username: "Current Teacher", // This should be the actual teacher name
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
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  // Get code history for current exercise
  const getCurrentExerciseHistory = () => {
    if (!codeHistory.length) return [];
    return codeHistory.filter(history => 
      history.problem_index === exercises[currentExerciseIndex].id
    );
  };

  // Get code at specific timeline position for current exercise
  const getCodeAtTimeIndex = (index) => {
    const exerciseHistory = getCurrentExerciseHistory();
    if (!exerciseHistory.length) return '';
    
    // Sort by timestamp
    const sortedHistory = [...exerciseHistory].sort((a, b) => 
      new Date(a.created_at) - new Date(b.created_at)
    );
    
    // If index is at the end, return the latest
    if (index >= sortedHistory.length - 1) {
      return sortedHistory[sortedHistory.length - 1].code;
    }
    
    // Return code at specific point in timeline
    return sortedHistory[index].code;
  };

  // Generate timeline markers for current exercise
  const generateTimelineMarkers = () => {
    const exerciseHistory = getCurrentExerciseHistory();
    if (!exerciseHistory.length) return [];
    
    const sortedHistory = [...exerciseHistory].sort((a, b) => 
      new Date(a.created_at) - new Date(b.created_at)
    );
    
    return sortedHistory.map((item, index) => ({
      index,
      time: new Date(item.created_at).toLocaleTimeString(),
      type: item.action_type
    }));
  };

  const handleNextExercise = () => {
    if (currentExerciseIndex < exercises.length - 1) {
      setCurrentExerciseIndex(prev => prev + 1);
      setTimelinePosition(0);
    }
  };

  const handlePrevExercise = () => {
    if (currentExerciseIndex > 0) {
      setCurrentExerciseIndex(prev => prev - 1);
      setTimelinePosition(0);
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
              <span className={`status-badge ${submission.status}`}>{submission.status}</span>
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

                {exercises[currentExerciseIndex].type === 'output' && (
                  <div className="exercise-output">
                    <h4>Code:</h4>
                    <pre className="code-display">
                      <code>{exercises[currentExerciseIndex].code}</code>
                    </pre>
                    <h4>Student's Answer:</h4>
                    <div className="answer-display">
                      {answers[exercises[currentExerciseIndex].id]}
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
                      {answers[exercises[currentExerciseIndex].id]}
                    </div>
                  </div>
                )}

                {exercises[currentExerciseIndex].type === 'coding' && (
                  <div className="exercise-coding">
                    <h4>Student's Code:</h4>
                    <pre className="code-display">
                      <code>{answers[exercises[currentExerciseIndex].id]}</code>
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

              <h3>Code Evolution Timeline - {exercises[currentExerciseIndex].title}</h3>
              
              <div className="timeline-slider-container">
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
              </div>

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

              <h3>AI Chat History - {exercises[currentExerciseIndex].title}</h3>
              
              <div className="chat-container">
                {aiChatHistory[exercises[currentExerciseIndex].id].map((message) => (
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
                ))}
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

              <h3>Coding Activity - {exercises[currentExerciseIndex].title}</h3>
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
                        <div className="activity-type">{day.action_type}</div>
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
                          Math.round((new Date(codeHistory[codeHistory.length-1].created_at) - 
                                    new Date(codeHistory[0].created_at)) / 
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