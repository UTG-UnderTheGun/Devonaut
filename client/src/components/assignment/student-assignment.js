// student-assignment.js
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import './student-assignment.css';

const mockData = {
  id: 'assign123',
  title: 'For Loop Assignment',
  chapter: 'Chapter 6',
  dueDate: '2025-02-14 23:59',
  points: 10,
  studentSubmission: {
    studentId: '6510741111',
    studentName: 'Wuttiphut Devonaut',
    section: '760001',
    submissionTime: '2025-02-04 21:34',
    code: `def sum_even_numbers(arr):
    total = 0
    for num in arr:
        if num % 2 == 0:
            total += num
    return total
    def sum_even_numbers(arr):
    total = 0
    for num in arr:
        if num % 2 == 0:
            total += num
    return total
    def sum_even_numbers(arr):
    total = 0
    for num in arr:
        if num % 2 == 0:
            total += num
    return total
    def sum_even_numbers(arr):
    total = 0
    for num in arr:
        if num % 2 == 0:
            total += num
    return total`,
    currentScore: null,
    feedback: null,
  },
  submissionHistory: [
    {
      id: 1,
      author: 'Dr. Smith',
      content: 'Good implementation of the loop. Consider adding input validation.',
      timestamp: '2025-02-04 22:15',
      score: 8,
    },
  ],
};

const InfoItem = ({ label, value }) => (
  <div className="info-item">
    <label>{label}</label>
    <span>{value || 'N/A'}</span>
  </div>
);

const FeedbackHistory = ({ author, timestamp, content, score }) => (
  <div className="feedback-item">
    <div className="feedback-header">
      <span className="feedback-author">{author}</span>
      <span className="feedback-time">{timestamp}</span>
    </div>
    <div className="feedback-score">Score: {score}/10</div>
    <p className="feedback-content">{content}</p>
  </div>
);

const StudentAssignment = () => {
  const router = useRouter();
  const [score, setScore] = useState('');
  const [feedback, setFeedback] = useState('');
  const [assignment, setAssignment] = useState(mockData);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleBack = () => {
    router.back();
  };

  const handleScoreChange = (e) => {
    const value = e.target.value;
    if (value === '' || (Number(value) >= 0 && Number(value) <= assignment.points)) {
      setScore(value);
    }
  };

  const handleSubmission = () => {
    if (!score || !feedback.trim()) {
      alert('Please provide both score and feedback');
      return;
    }

    const submission = {
      id: Date.now(),
      author: 'Dr. Smith',
      timestamp: new Date().toLocaleString(),
      content: feedback.trim(),
      score: Number(score),
    };

    setAssignment((prev) => ({
      ...prev,
      submissionHistory: [submission, ...prev.submissionHistory],
      studentSubmission: {
        ...prev.studentSubmission,
        currentScore: Number(score),
        feedback: feedback.trim(),
      },
    }));

    setIsSubmitted(true);
  };

  return (
    <div className="student-assignment">
      <div className="info-section">
        <div className="info-header">
          <button onClick={handleBack} className="btn-back">←</button>
          <h2 className="info-title">{assignment.title}</h2>
        </div>
        <div className="info-grid">
          <InfoItem label="Student" value={assignment.studentSubmission.studentName} />
          <InfoItem label="ID" value={assignment.studentSubmission.studentId} />
          <InfoItem label="Section" value={assignment.studentSubmission.section} />
          <InfoItem label="Submitted" value={assignment.studentSubmission.submissionTime} />
          <div className="info-item">
            <label>Score</label>
            <div className="score-input">
              <input
                type="number"
                value={score}
                onChange={handleScoreChange}
                min="0"
                max={assignment.points}
                placeholder="0"
                disabled={isSubmitted}
              />
              <span>/ {assignment.points}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="content-grid">
        <div className="code-section">
          <h3>Student Code</h3>
          <pre className="code-display">
            <code>{assignment.studentSubmission.code}</code>
          </pre>
        </div>

        <div className="feedback-container">
          <h3>Grading & Feedback</h3>
          {!isSubmitted && (
            <div className="feedback-input">
              <textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="Add your feedback..."
                disabled={isSubmitted}
              />
              <button onClick={handleSubmission} className="btn-submit" disabled={isSubmitted}>
                Submit Grade & Feedback
              </button>
            </div>
          )}
          <div className="feedback-history">
            <h4>Feedback History</h4>
            {assignment.submissionHistory.map((feedback) => (
              <FeedbackHistory key={feedback.id} {...feedback} />
            ))}
            {isSubmitted && (
              <div className="feedback-success">
                Feedback submitted successfully!
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentAssignment;