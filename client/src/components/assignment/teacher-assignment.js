'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import TeacherAIChatHistory from './teacher-ai-chat-history';
import './teacher-assignment.css';

const TeacherAssignment = ({ assignmentId, studentId }) => {
  const router = useRouter();
  const [assignment, setAssignment] = useState(null);
  const [submission, setSubmission] = useState(null);
  const [activeTab, setActiveTab] = useState('exercises');
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [error, setError] = useState(null);
  const [score, setScore] = useState('');
  const [feedback, setFeedback] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [exercises, setExercises] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
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
        
        // Set exercises from assignment data
        if (assignmentData.exercises && assignmentData.exercises.length > 0) {
          setExercises(assignmentData.exercises);
        }
        
        // Fetch student submission if studentId is provided
        if (studentId) {
          const submissionResponse = await fetch(`${API_BASE}/assignments/${assignmentId}/submission/${studentId}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
          });
          
          if (submissionResponse.ok) {
            const submissionData = await submissionResponse.json();
            setSubmission(submissionData);
            
            // Set initial score from submission if available
            if (submissionData.score !== null && submissionData.score !== undefined) {
              setScore(submissionData.score.toString());
            }
          } else {
            console.warn(`No submission found for student ${studentId}`);
            setSubmission(null);
          }
        }
      } catch (err) {
        setError(err.message);
        console.error('Error fetching assignment data:', err);
      } finally {
        setLoading(false);
      }
    };

    if (assignmentId) {
      fetchData();
    }
  }, [assignmentId, studentId]);

  const handleBack = () => {
    router.push('/teacher/assignments');
  };

  const handleScoreChange = (e) => {
    const value = e.target.value;
    if (value === '' || (Number(value) >= 0 && Number(value) <= (assignment?.points || 100))) {
      setScore(value);
    }
  };

  const handleSubmission = async () => {
    if (!score || !feedback.trim() || !submission) {
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

      // Update the submission with new data
      const updatedSubmission = await response.json();
      setSubmission(updatedSubmission);
      alert('Grading submitted successfully!');
    } catch (err) {
      console.error('Error submitting grade:', err);
      alert(`Error submitting grade: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const handleNextExercise = () => {
    if (currentExerciseIndex < exercises.length - 1) {
      setCurrentExerciseIndex(currentExerciseIndex + 1);
    }
  };

  const handlePrevExercise = () => {
    if (currentExerciseIndex > 0) {
      setCurrentExerciseIndex(currentExerciseIndex - 1);
    }
  };

  if (loading) {
    return <div className="loading">Loading assignment data...</div>;
  }

  if (error) {
    return <div className="error">Error: {error}</div>;
  }

  if (!assignment) {
    return <div className="error">Assignment not found</div>;
  }

  return (
    <div className="teacher-assignment-container">
      <div className="header">
        <button className="back-button" onClick={handleBack}>← Back to List</button>
        <h1 className="title">{assignment.title}</h1>
        <div className="assignment-info">
          <div>Chapter: {assignment.chapter}</div>
          <div>Due: {formatDateTime(assignment.dueDate)}</div>
          <div>Points: {assignment.points}</div>
        </div>
      </div>

      {studentId && submission && (
        <div className="student-info">
          <h2>Student Information</h2>
          <div className="info-grid">
            <div className="info-row">
              <div className="info-label">NAME</div>
              <div className="info-value">{submission.username || 'Unknown'}</div>
            </div>
            <div className="info-row">
              <div className="info-label">ID</div>
              <div className="info-value">{studentId}</div>
            </div>
            <div className="info-row">
              <div className="info-label">SECTION</div>
              <div className="info-value">{submission.section || 'N/A'}</div>
            </div>
            <div className="info-row">
              <div className="info-label">SUBMITTED</div>
              <div className="info-value">{formatDateTime(submission.submitted_at)}</div>
            </div>
            <div className="info-row">
              <div className="info-label">STATUS</div>
              <div className={`info-value status-${submission.status?.toLowerCase()}`}>
                {submission.status?.toUpperCase() || 'PENDING'}
              </div>
            </div>
            <div className="info-row">
              <div className="info-label">SCORE</div>
              <div className="info-value score-input">
                <input
                  type="number"
                  min="0"
                  max={assignment.points}
                  value={score}
                  onChange={handleScoreChange}
                  disabled={submission.status === 'graded' || isSubmitting}
                /> / {assignment.points}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="tabs">
        <button
          className={`tab ${activeTab === 'exercises' ? 'active' : ''}`}
          onClick={() => setActiveTab('exercises')}
        >
          Exercises
        </button>
        <button
          className={`tab ${activeTab === 'ai-chat' ? 'active' : ''}`}
          onClick={() => setActiveTab('ai-chat')}
        >
          AI Chat History
        </button>
        <button
          className={`tab ${activeTab === 'coding-activity' ? 'active' : ''}`}
          onClick={() => setActiveTab('coding-activity')}
        >
          Coding Activity
        </button>
      </div>

      <div className="tab-content">
        {activeTab === 'exercises' && (
          <div className="exercises-section">
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
            
            {exercises[currentExerciseIndex] && (
              <div className="exercise-details">
                <h3>
                  {currentExerciseIndex + 1}. {exercises[currentExerciseIndex].title}
                  <span className="exercise-points">
                    {exercises[currentExerciseIndex].points} points
                  </span>
                </h3>
                <p className="exercise-description">
                  {exercises[currentExerciseIndex].description}
                </p>
                
                {exercises[currentExerciseIndex].code && (
                  <div className="code-display">
                    <h4>Code:</h4>
                    <pre>
                      <code>{exercises[currentExerciseIndex].code}</code>
                    </pre>
                  </div>
                )}
                
                {submission && submission.answers && (
                  <div className="student-answer">
                    <h4>Student Answer:</h4>
                    <pre>
                      <code>{submission.answers[exercises[currentExerciseIndex].id] || 'No answer provided'}</code>
                    </pre>
                  </div>
                )}
              </div>
            )}
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
            
            {exercises[currentExerciseIndex] && (
              <>
                {console.log('Rendering TeacherAIChatHistory with:', {
                  assignmentId,
                  exerciseId: String(exercises[currentExerciseIndex].id),
                  studentId,
                  exerciseType: typeof exercises[currentExerciseIndex].id
                })}
                <TeacherAIChatHistory 
                  assignmentId={assignmentId} 
                  exerciseId={String(exercises[currentExerciseIndex].id)}
                  studentId={studentId} // Pass studentId to show only that student's history
                />
              </>
            )}
          </div>
        )}

        {activeTab === 'coding-activity' && (
          <div className="coding-activity-section">
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
            
            <div className="empty-state">
              Coding activity visualization coming soon.
            </div>
          </div>
        )}
      </div>

      {studentId && submission && (
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
                  {submission.score !== null && submission.score !== undefined && idx === 0 && (
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
      )}
    </div>
  );
};

export default TeacherAssignment; 