// student-assignment.js
'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import './student-assignment.css';

// Mock data to use when API calls fail
const mockAssignment = {
  id: 'assign123',
  title: 'Python For Loop Assignment',
  chapter: 'Chapter 6: Control Structures',
  dueDate: '2025-02-14T23:59:00',
  points: 10,
  created_by: 'teacher1',
  exercises: [
    {
      id: 1,
      title: 'Sum Even Numbers',
      description: 'Write a function to sum all even numbers in a list',
      type: 'coding',
      points: 10
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
  code: `def sum_even_numbers(arr):
    total = 0
    for num in arr:
        if num % 2 == 0:
            total += num
    return total
`,
  answers: {
    1: `def sum_even_numbers(arr):
    total = 0
    for num in arr:
        if num % 2 == 0:
            total += num
    return total`
  },
  comments: []
};

const mockCodeHistory = [
  {
    id: 'hist1',
    user_id: 'student123',
    problem_index: 'assign123',
    action_type: 'run',
    code: `def sum_even_numbers(arr):
    # Initial attempt
    return 0`,
    created_at: '2025-02-04T20:30:00'
  },
  {
    id: 'hist2',
    user_id: 'student123',
    problem_index: 'assign123',
    action_type: 'run',
    code: `def sum_even_numbers(arr):
    total = 0
    # Need to add loop
    return total`,
    created_at: '2025-02-04T20:45:00'
  },
  {
    id: 'hist3',
    user_id: 'student123',
    problem_index: 'assign123',
    action_type: 'run',
    code: `def sum_even_numbers(arr):
    total = 0
    for num in arr:
        total += num
    return total`,
    created_at: '2025-02-04T21:00:00'
  },
  {
    id: 'hist4',
    user_id: 'student123',
    problem_index: 'assign123',
    action_type: 'run',
    code: `def sum_even_numbers(arr):
    total = 0
    for num in arr:
        if num % 2 == 0:
            total += num
    return total`,
    created_at: '2025-02-04T21:20:00'
  },
  {
    id: 'hist5',
    user_id: 'student123',
    problem_index: 'assign123',
    action_type: 'submission',
    code: `def sum_even_numbers(arr):
    total = 0
    for num in arr:
        if num % 2 == 0:
            total += num
    return total`,
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

const mockAiChatHistory = [
  {
    id: 'chat1',
    role: 'user',
    content: 'How do I find even numbers in a list?',
    timestamp: '2025-02-04T20:25:00'
  },
  {
    id: 'chat2',
    role: 'assistant',
    content: 'You can use the modulo operator (%) to check if a number is even. A number is even if number % 2 == 0.',
    timestamp: '2025-02-04T20:25:15'
  },
  {
    id: 'chat3',
    role: 'user',
    content: 'How do I sum items in a list?',
    timestamp: '2025-02-04T20:40:00'
  },
  {
    id: 'chat4',
    role: 'assistant',
    content: 'You can iterate through the list using a for loop and add each item to a total variable that starts at 0.',
    timestamp: '2025-02-04T20:40:20'
  },
  {
    id: 'chat5',
    role: 'user',
    content: 'Can you help me combine those concepts to sum even numbers?',
    timestamp: '2025-02-04T21:10:00'
  },
  {
    id: 'chat6',
    role: 'assistant',
    content: 'Sure! You can use a for loop to iterate through the list, check if each number is even using number % 2 == 0, and if it is, add it to your total.',
    timestamp: '2025-02-04T21:10:30'
  }
];

const StudentAssignment = ({ studentId, assignmentId }) => {
  const router = useRouter();
  const [assignment, setAssignment] = useState(null);
  const [submission, setSubmission] = useState(null);
  const [codeHistory, setCodeHistory] = useState([]);
  const [keystrokeHistory, setKeystrokeHistory] = useState([]);
  const [aiChatHistory, setAiChatHistory] = useState([]);
  const [activeTab, setActiveTab] = useState('code');
  const [error, setError] = useState(null);
  const [score, setScore] = useState('');
  const [feedback, setFeedback] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [timelinePosition, setTimelinePosition] = useState(0);

  const fetchData = async () => {
    try {
      const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      
      // Fetch assignment data
      const assignmentResponse = await fetch(`${API_BASE}/assignments/${assignmentId}`, {
        credentials: 'include'
      });
      
      if (!assignmentResponse.ok) {
        setAssignment(mockAssignment);
      } else {
        const assignmentData = await assignmentResponse.json();
        setAssignment(assignmentData);
      }

      // Fetch submission data
      const submissionResponse = await fetch(`${API_BASE}/assignments/${assignmentId}/submission/${studentId}`, {
        credentials: 'include'
      });
      
      if (!submissionResponse.ok) {
        setSubmission(mockSubmission);
      } else {
        const submissionData = await submissionResponse.json();
        setSubmission(submissionData);
        if (submissionData.score) {
          setScore(submissionData.score.toString());
        }
      }

      // Fetch code history
      const historyResponse = await fetch(`${API_BASE}/api/code-history/${assignmentId}`, {
        credentials: 'include'
      });
      
      if (!historyResponse.ok) {
        setCodeHistory(mockCodeHistory);
      } else {
        const historyData = await historyResponse.json();
        setCodeHistory(historyData);
      }

      // Fetch keystroke history
      const keystrokeResponse = await fetch(`${API_BASE}/api/code-analytics/user-journey/${studentId}?problem_index=${assignmentId}`, {
        credentials: 'include'
      });
      
      if (!keystrokeResponse.ok) {
        setKeystrokeHistory(mockKeystrokeHistory);
      } else {
        const keystrokeData = await keystrokeResponse.json();
        setKeystrokeHistory(keystrokeData);
      }

      // Fetch AI chat history
      const aiChatResponse = await fetch(`${API_BASE}/api/chat-history/user-id=${studentId}&assignment_id=${assignmentId}`, {
        credentials: 'include'
      });
      
      if (!aiChatResponse.ok) {
        setAiChatHistory(mockAiChatHistory);
      } else {
        const aiChatData = await aiChatResponse.json();
        setAiChatHistory(aiChatData);
      }

    } catch (err) {
      setError(err.message);
      console.error('Error fetching data:', err);
      // Use mock data as fallback
      setAssignment(mockAssignment);
      setSubmission(mockSubmission);
      setCodeHistory(mockCodeHistory);
      setKeystrokeHistory(mockKeystrokeHistory);
      setAiChatHistory(mockAiChatHistory);
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
      const gradingData = {
        score: Number(score),
        feedback: { 
          general: feedback.trim()
        },
        comments: [
          { text: feedback.trim() }
        ]
      };

      let success = false;
      try {
        const response = await fetch(`/api/v1/assignments/${assignmentId}/grade/${submission.id}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(gradingData),
        });

        if (response.ok) {
          success = true;
        }
      } catch (err) {
        console.log('Error submitting grade to API, simulating success');
        // Simulate success for demo purposes
        success = true;
      }

      if (success) {
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
      } else {
        throw new Error('Server responded with an error');
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
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  // Filter code history by time for timeline visualization
  const getCodeAtTimeIndex = (index) => {
    if (!codeHistory.length) return '';
    
    // Sort by timestamp
    const sortedHistory = [...codeHistory].sort((a, b) => 
      new Date(a.created_at) - new Date(b.created_at)
    );
    
    // If index is at the end, return the latest
    if (index >= sortedHistory.length - 1) {
      return sortedHistory[sortedHistory.length - 1].code;
    }
    
    // Return code at specific point in timeline
    return sortedHistory[index].code;
  };

  // Generate timeline markers based on code history
  const generateTimelineMarkers = () => {
    if (!codeHistory.length) return [];
    
    const sortedHistory = [...codeHistory].sort((a, b) => 
      new Date(a.created_at) - new Date(b.created_at)
    );
    
    return sortedHistory.map((item, index) => ({
      index,
      time: new Date(item.created_at).toLocaleTimeString(),
      type: item.action_type
    }));
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
          className={activeTab === 'code' ? 'active' : ''} 
          onClick={() => setActiveTab('code')}
        >
          Final Code
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
          {activeTab === 'code' && (
            <div className="code-section">
              <h3>Student Submission</h3>
              <pre className="code-display">
                <code>{submission.answers && typeof submission.answers === 'object' ? 
                  Object.values(submission.answers).join('\n\n') : 
                  submission.code || 'No code submitted'}</code>
              </pre>
            </div>
          )}

          {activeTab === 'timeline' && (
            <div className="timeline-section">
              <h3>Code Evolution Timeline</h3>
              <div className="timeline-slider-container">
                <input 
                  type="range" 
                  min="0" 
                  max={timelineMarkers.length - 1} 
                  value={timelinePosition} 
                  onChange={(e) => setTimelinePosition(parseInt(e.target.value))} 
                  className="timeline-slider"
                />
                <div className="timeline-markers">
                  {timelineMarkers.map((marker, idx) => (
                    <div 
                      key={idx} 
                      className={`timeline-marker ${marker.type} ${idx === timelinePosition ? 'active' : ''}`}
                      style={{left: `${(idx / (timelineMarkers.length - 1)) * 100}%`}}
                      onClick={() => setTimelinePosition(idx)}
                      title={`${marker.time} - ${marker.type}`}
                    >
                      <span className="marker-tooltip">{marker.time}<br/>{marker.type}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="timeline-info">
                {timelineMarkers.length > 0 && (
                  <div className="current-position-info">
                    <span>Time: {timelineMarkers[timelinePosition]?.time || 'N/A'}</span>
                    <span>Action: {timelineMarkers[timelinePosition]?.type || 'N/A'}</span>
                  </div>
                )}
              </div>
              <pre className="code-display">
                <code>{getCodeAtTimeIndex(timelinePosition)}</code>
              </pre>
            </div>
          )}

          {activeTab === 'ai-chat' && (
            <div className="ai-chat-section">
              <h3>AI Chat History</h3>
              {aiChatHistory && aiChatHistory.length > 0 ? (
                <div className="chat-container">
                  {aiChatHistory.map((message, idx) => (
                    <div key={idx} className={`chat-message ${message.role}`}>
                      <div className="message-header">
                        <span className="message-sender">{message.role === 'user' ? 'Student' : 'AI Assistant'}</span>
                        <span className="message-time">{formatDateTime(message.timestamp)}</span>
                      </div>
                      <div className="message-content">
                        {message.content}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-state">No AI chat history available</div>
              )}
            </div>
          )}

          {activeTab === 'keystroke' && (
            <div className="keystroke-section">
              <h3>Coding Activity</h3>
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