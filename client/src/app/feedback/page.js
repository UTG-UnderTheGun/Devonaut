'use client';
import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import axios from 'axios';
import './feedback.css';

export default function FeedbackPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const assignmentId = searchParams.get('assignment');
  const [feedback, setFeedback] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchFeedback = async () => {
      if (!assignmentId) {
        setError('No assignment ID provided');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
        
        // Development mode safety - Check if server is running
        try {
          // Send a simple OPTIONS request to check if the server is responding
          await axios.options(`${API_BASE}/health-check`, { 
            withCredentials: true,
            timeout: 2000 // 2 second timeout
          });
        } catch (err) {
          console.warn('API server may not be running or has CORS issues:', err.message);
          // We'll continue anyway and let the main request try
        }
        
        const response = await axios.get(`${API_BASE}/assignments/${assignmentId}/feedback`, {
          withCredentials: true
        });

        setFeedback(response.data);
      } catch (err) {
        console.error('Error fetching feedback:', err);
        setError(err.message || 'Failed to load feedback');
      } finally {
        setLoading(false);
      }
    };

    fetchFeedback();
  }, [assignmentId]);

  const handleBackToDashboard = () => {
    router.push('/dashboard');
  };

  if (loading) {
    return (
      <div className="feedback-page loading">
        <div className="loading-spinner"></div>
        <p>Loading feedback...</p>
      </div>
    );
  }

  if (error || !feedback) {
    return (
      <div className="feedback-page error">
        <h2>Error Loading Feedback</h2>
        <p>{error || 'No feedback data available'}</p>
        <button onClick={handleBackToDashboard} className="back-button">
          Back to Dashboard
        </button>
      </div>
    );
  }

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  return (
    <div className="feedback-page">
      <header className="feedback-header">
        <button onClick={handleBackToDashboard} className="back-button">
          ← Back to Dashboard
        </button>
        <h1>{feedback.assignment_title || 'Assignment Feedback'}</h1>
      </header>

      <div className="feedback-card">
        <div className="feedback-status">
          <div className="status-badge">
            {feedback.status === 'graded' ? 'Graded' : 'Pending Review'}
          </div>
          {feedback.score !== null && (
            <div className="score-display">
              Score: <span>{feedback.score}</span>
            </div>
          )}
        </div>

        <div className="feedback-details">
          <div className="detail-row">
            <span className="detail-label">Submitted:</span>
            <span className="detail-value">{formatDate(feedback.submitted_at)}</span>
          </div>
          {feedback.graded_at && (
            <div className="detail-row">
              <span className="detail-label">Graded:</span>
              <span className="detail-value">{formatDate(feedback.graded_at)}</span>
            </div>
          )}
        </div>

        {/* Teacher's feedback */}
        {feedback.feedback && Object.keys(feedback.feedback).length > 0 && (
          <div className="feedback-content">
            <h2>Teacher's Feedback</h2>
            {Object.entries(feedback.feedback).map(([exerciseId, exerciseFeedback]) => (
              <div key={exerciseId} className="exercise-feedback">
                <h3>Exercise {exerciseId}</h3>
                {exerciseFeedback.score !== undefined && (
                  <div className="exercise-score">
                    Score: {exerciseFeedback.score}
                  </div>
                )}
                {exerciseFeedback.text && (
                  <p className="feedback-text">{exerciseFeedback.text}</p>
                )}
                {exerciseFeedback.comments && exerciseFeedback.comments.length > 0 && (
                  <div className="comment-section">
                    <h4>Comments</h4>
                    {exerciseFeedback.comments.map((comment) => (
                      <div key={comment.id} className="comment">
                        <div className="comment-header">
                          <span className="comment-author">{comment.username}</span>
                          <span className="comment-time">{formatDate(comment.timestamp)}</span>
                        </div>
                        <p className="comment-text">{comment.text}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* General comments */}
        {feedback.comments && feedback.comments.length > 0 && (
          <div className="comments-section">
            <h2>Comments</h2>
            {feedback.comments.map((comment) => (
              <div key={comment.id} className="comment">
                <div className="comment-header">
                  <span className="comment-author">{comment.username}</span>
                  <span className="comment-time">{formatDate(comment.timestamp)}</span>
                </div>
                <p className="comment-text">{comment.text}</p>
              </div>
            ))}
          </div>
        )}

        {feedback.status !== 'graded' && (
          <div className="pending-notice">
            <p>Your assignment is still being reviewed. Check back later for feedback.</p>
          </div>
        )}
      </div>
    </div>
  );
} 