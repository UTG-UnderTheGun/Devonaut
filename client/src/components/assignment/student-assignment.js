// student-assignment.js
'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import './student-assignment.css';

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
      const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      
      // Fetch assignment data
      const assignmentResponse = await fetch(`${API_BASE}/assignments/${assignmentId}`, {
        credentials: 'include'
      });
      
      if (!assignmentResponse.ok) {
        throw new Error(`Failed to fetch assignment: ${assignmentResponse.statusText}`);
      }
      
      const assignmentData = await assignmentResponse.json();
      setAssignment(assignmentData);
      setExercises(assignmentData.exercises || []);

      try {
        // Fetch submission data - handle case where submission might not exist
        const submissionResponse = await fetch(`${API_BASE}/assignments/${assignmentId}/submission/${studentId}`, {
          credentials: 'include'
        });
        
        if (submissionResponse.status === 404) {
          // Create empty submission object for not submitted assignments
          console.log('No submission found, creating empty submission object');
          setSubmission({
            id: 'pending',
            assignment_id: assignmentId,
            user_id: studentId,
            username: 'Student',
            status: 'not_submitted',
            submitted_at: null,
            answers: {},
            comments: []
          });
          setAnswers({});
        } else if (submissionResponse.ok) {
          const submissionData = await submissionResponse.json();
          console.log('Submission data received:', submissionData);
          
          // Make sure we recognize "pending" as a valid submission state
          // (not as "not_submitted")
          if (submissionData.status === 'pending' || 
              submissionData.status === 'graded' || 
              submissionData.status === 'late') {
            setSubmission(submissionData);
            setAnswers(submissionData.answers || {});
            
            if (submissionData.score) {
              setScore(submissionData.score.toString());
            }
          } else {
            // If status is something unexpected, set as not_submitted
            console.log('Unexpected status in submission:', submissionData.status);
            setSubmission({
              ...submissionData,
              status: submissionData.status || 'not_submitted'
            });
            setAnswers(submissionData.answers || {});
          }
        } else {
          throw new Error(`Submission fetch error: ${submissionResponse.statusText}`);
        }
      } catch (submissionErr) {
        console.error('Error fetching submission:', submissionErr);
        // Create empty submission object as fallback
        setSubmission({
          id: 'pending',
          assignment_id: assignmentId,
          user_id: studentId,
          username: 'Student',
          status: 'not_submitted',
          submitted_at: null,
          answers: {},
          comments: []
        });
        setAnswers({});
      }

      try {
        // Fetch code history
        const historyResponse = await fetch(`${API_BASE}/api/code-history/${assignmentId}`, {
          credentials: 'include'
        });
        
        if (historyResponse.ok) {
          const historyData = await historyResponse.json();
          setCodeHistory(historyData);
          
          // Organize coding activity by exercise
          const activityByExercise = {};
          
          if (historyData && historyData.length > 0) {
            historyData.forEach(item => {
              const exerciseId = item.problem_index;
              if (!activityByExercise[exerciseId]) {
                activityByExercise[exerciseId] = [];
              }
              
              activityByExercise[exerciseId].push({
                id: item.id || String(Date.now()),
                timestamp: item.created_at,
                action: item.action_type,
                exerciseId,
                code: item.code
              });
            });
          }
          
          setCodingActivity(activityByExercise);
        } else {
          setCodeHistory([]);
          setCodingActivity({});
        }
      } catch (historyErr) {
        console.error('Error fetching code history:', historyErr);
        setCodeHistory([]);
        setCodingActivity({});
      }

      try {
        // Fetch keystroke history
        const keystrokeResponse = await fetch(`${API_BASE}/api/code-analytics/user-journey/${studentId}?problem_index=${assignmentId}`, {
          credentials: 'include'
        });
        
        if (keystrokeResponse.ok) {
          const keystrokeData = await keystrokeResponse.json();
          setKeystrokeHistory(keystrokeData);
        } else {
          setKeystrokeHistory([]);
        }
      } catch (keystrokeErr) {
        console.error('Error fetching keystroke history:', keystrokeErr);
        setKeystrokeHistory([]);
      }

      try {
        // Fetch AI chat history
        const aiChatResponse = await fetch(`${API_BASE}/api/chat-history?user_id=${studentId}&assignment_id=${assignmentId}`, {
          credentials: 'include'
        });
        
        if (aiChatResponse.ok) {
          const aiChatData = await aiChatResponse.json();
          setAiChatHistory(aiChatData);
        } else {
          setAiChatHistory({});
        }
      } catch (aiChatErr) {
        console.error('Error fetching AI chat history:', aiChatErr);
        setAiChatHistory({});
      }

    } catch (err) {
      setError(err.message);
      console.error('Error fetching data:', err);
      
      // Show error message to user
      alert(`Failed to load data: ${err.message}`);
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

      const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const response = await fetch(`${API_BASE}/assignments/${assignmentId}/grade/${submission.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(gradingData),
      });

      if (!response.ok) {
        throw new Error(`Failed to submit grade: ${response.statusText}`);
      }

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
            user_id: "current_teacher", // This will be updated by the API
            username: "Current Teacher", // This will be updated by the API
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
    if (!codeHistory.length || !exercises[currentExerciseIndex]) return [];
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
              <span>{submission.status === 'not_submitted' ? 'Not Submitted Yet' : formatDateTime(submission.submitted_at)}</span>
            </div>
            <div className="info-item">
              <label>Status</label>
              <span className={`status-badge ${submission.status}`}>{submission.status === 'not_submitted' ? 'Not Submitted' : submission.status}</span>
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
                  disabled={submission.status === 'graded' || submission.status === 'not_submitted'}
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
              {submission.status === 'not_submitted' ? (
                <div className="empty-state">
                  <h3>No Submission Available</h3>
                  <p>This student has not submitted this assignment yet.</p>
                </div>
              ) : (
                <>
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

                  {exercises[currentExerciseIndex] ? (
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
                            <code>{answers[exercises[currentExerciseIndex].id] || submission.code}</code>
                          </pre>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="empty-state">No exercise data available</div>
                  )}
                </>
              )}
            </div>
          )}

          {activeTab === 'timeline' && (
            <div className="timeline-section">
              {submission.status === 'not_submitted' ? (
                <div className="empty-state">
                  <h3>No Code Timeline Available</h3>
                  <p>This student has not submitted this assignment yet.</p>
                </div>
              ) : (
                <>
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

                  <h3>Code Evolution Timeline - {exercises[currentExerciseIndex]?.title || 'Loading...'}</h3>
                  
                  {exercises[currentExerciseIndex] && codingActivity[exercises[currentExerciseIndex].id] ? (
                    <>
                      <div className="timeline-slider-container">
                        <input 
                          type="range" 
                          min="0" 
                          max={codingActivity[exercises[currentExerciseIndex].id]?.length - 1 || 0} 
                          value={timelinePosition} 
                          onChange={(e) => setTimelinePosition(parseInt(e.target.value))} 
                          className="timeline-slider"
                          disabled={!codingActivity[exercises[currentExerciseIndex].id] || codingActivity[exercises[currentExerciseIndex].id].length <= 1}
                        />
                        <div className="timeline-markers">
                          {codingActivity[exercises[currentExerciseIndex].id]?.map((activity, idx) => (
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

                      {codingActivity[exercises[currentExerciseIndex].id]?.length > 0 && (
                        <>
                          <div className="timeline-info">
                            <div className="current-position-info">
                              <span>Time: {new Date(codingActivity[exercises[currentExerciseIndex].id][timelinePosition]?.timestamp).toLocaleTimeString()}</span>
                              <span>Action: {codingActivity[exercises[currentExerciseIndex].id][timelinePosition]?.action}</span>
                            </div>
                          </div>

                          <div className="code-display">
                            <pre>
                              <code>
                                {codingActivity[exercises[currentExerciseIndex].id][timelinePosition]?.code || 
                                exercises[currentExerciseIndex].code || '// No code available'}
                              </code>
                            </pre>
                          </div>
                        </>
                      )}
                    </>
                  ) : (
                    <div className="empty-state">No code timeline data available for this exercise</div>
                  )}
                </>
              )}
            </div>
          )}

          {activeTab === 'ai-chat' && (
            <div className="ai-chat-section">
              {submission.status === 'not_submitted' ? (
                <div className="empty-state">
                  <h3>No AI Chat History Available</h3>
                  <p>This student has not submitted this assignment yet.</p>
                </div>
              ) : (
                <>
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

                  <h3>AI Chat History - {exercises[currentExerciseIndex]?.title || 'Loading...'}</h3>
                  
                  {exercises[currentExerciseIndex] && aiChatHistory[exercises[currentExerciseIndex].id] ? (
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
                  ) : (
                    <div className="empty-state">No AI chat history available for this exercise</div>
                  )}
                </>
              )}
            </div>
          )}

          {activeTab === 'keystroke' && (
            <div className="keystroke-section">
              {submission.status === 'not_submitted' ? (
                <div className="empty-state">
                  <h3>No Coding Activity Available</h3>
                  <p>This student has not submitted this assignment yet.</p>
                </div>
              ) : (
                <>
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

                  <h3>Coding Activity - {exercises[currentExerciseIndex]?.title || 'Loading...'}</h3>
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
                </>
              )}
            </div>
          )}
        </div>

        <div className="feedback-container">
          <h3>Grading & Feedback</h3>
          
          {submission.status === 'not_submitted' ? (
            <div className="feedback-info">
              <p>Student has not submitted this assignment yet.</p>
              <p>Grading will be available after submission.</p>
            </div>
          ) : submission.status === 'pending' ? (
            <div className="feedback-info pending-info">
              <p>This assignment has been submitted and is pending review.</p>
              <p>Submitted on: {formatDateTime(submission.submitted_at)}</p>
              
              <textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="Add your feedback for the student..."
                disabled={isSubmitting}
              />
              <button 
                onClick={handleSubmission} 
                className="btn-submit" 
                disabled={isSubmitting || !score || !feedback.trim()}
              >
                {isSubmitting ? 'Submitting...' : 'Submit Grade & Feedback'}
              </button>
            </div>
          ) : submission.status !== 'graded' ? (
            <div className="feedback-input">
              <textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="Add your feedback for the student..."
                disabled={submission.status === 'graded' || submission.status === 'not_submitted' || isSubmitting}
              />
              <button 
                onClick={handleSubmission} 
                className="btn-submit" 
                disabled={submission.status === 'graded' || submission.status === 'not_submitted' || isSubmitting || !score || !feedback.trim()}
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