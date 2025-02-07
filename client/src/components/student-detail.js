// components/StudentDetail.js
'use client'
import React from 'react';
import './student-detail.css';

const StudentDetail = ({ student, onClose }) => {
  // Calculate completion rate
  const completionRate = {
    completed: 8,
    total: 10,
    percentage: (8 / 10) * 100
  };

  // Mock assignment history
  const assignmentHistory = [
    { id: 1, title: 'For Loop Assignment', score: 9, status: 'Completed', submittedDate: '2024-02-04' },
    { id: 2, title: 'While Loop Assignment', score: 8, status: 'Completed', submittedDate: '2024-02-03' },
    { id: 3, title: 'Array Assignment', score: 0, status: 'Pending', submittedDate: null },
    { id: 4, title: 'Function Assignment', score: 7, status: 'Completed', submittedDate: '2024-02-01' }
  ];

  const getStatusColor = (status) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return 'status-completed';
      case 'pending':
        return 'status-pending';
      case 'late':
        return 'status-late';
      default:
        return '';
    }
  };

  return (
    <div className="student-detail-container">
      <div className="student-detail-header">
        <button className="close-button" onClick={onClose}>×</button>
        <h2>Student Details</h2>
      </div>

      <div className="student-detail-content">
        {/* Personal Information */}
        <section className="detail-section">
          <h3>Personal Information</h3>
          <div className="info-grid">
            <div className="info-item">
              <label>Student ID</label>
              <span>{student.id}</span>
            </div>
            <div className="info-item">
              <label>Name</label>
              <span>{student.name}</span>
            </div>
            <div className="info-item">
              <label>Email</label>
              <span>{student.email}</span>
            </div>
            <div className="info-item">
              <label>Section</label>
              <span>{student.section}</span>
            </div>
          </div>
        </section>

        {/* Academic Progress */}
        <section className="detail-section">
          <h3>Academic Progress</h3>
          <div className="progress-stats">
            <div className="stat-card">
              <div className="stat-value">{student.score}/10</div>
              <div className="stat-label">Overall Score</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{completionRate.completed}/{completionRate.total}</div>
              <div className="stat-label">Assignments Completed</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{completionRate.percentage}%</div>
              <div className="stat-label">Completion Rate</div>
            </div>
          </div>
        </section>

        {/* Assignment History */}
        <section className="detail-section">
          <h3>Assignment History</h3>
          <div className="assignment-history">
            <table>
              <thead>
                <tr>
                  <th>Assignment</th>
                  <th>Score</th>
                  <th>Status</th>
                  <th>Submitted Date</th>
                </tr>
              </thead>
              <tbody>
                {assignmentHistory.map((assignment) => (
                  <tr key={assignment.id}>
                    <td>{assignment.title}</td>
                    <td>{assignment.score}/10</td>
                    <td>
                      <span className={`status-badge ${getStatusColor(assignment.status)}`}>
                        {assignment.status}
                      </span>
                    </td>
                    <td>{assignment.submittedDate || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Actions */}
        <section className="detail-section actions">
          <button className="action-button edit">Edit Profile</button>
          <button className="action-button message">Send Message</button>
          <button className="action-button report">Download Report</button>
        </section>
      </div>
    </div>
  );
};

export default StudentDetail;