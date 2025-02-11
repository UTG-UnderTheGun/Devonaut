'use client';
import React, { useEffect, useState, useCallback, memo } from 'react';
import { useRouter } from 'next/navigation';
import './student-detail.css';

const DetailSkeleton = () => {
  // ... DetailSkeleton component remains the same ...
};

const InfoItem = memo(({ label, value }) => (
  <div className="student-info-item animate-fade-in">
    <label>{label}</label>
    <span>{value || 'N/A'}</span>
  </div>
));

const StatCard = memo(({ value, label }) => (
  <div className="student-stat-card animate-fade-in">
    <div className="student-stat-value">{value}</div>
    <div className="student-stat-label">{label}</div>
  </div>
));

const StatusBadge = memo(({ status }) => {
  const getBadgeClass = (status) => {
    switch (status.toLowerCase()) {
      case 'completed': return 'badge-success';
      case 'pending': return 'badge-warning';
      case 'late': return 'badge-error';
      default: return '';
    }
  };

  return (
    <span className={`student-status-badge ${getBadgeClass(status)}`}>
      {status}
    </span>
  );
});

const StudentDetailModal = ({ student, onClose, loading = false }) => {
  const router = useRouter();
  const [isClosing, setIsClosing] = useState(false);
  const [mounted, setMounted] = useState(false);

  const completionRate = {
    completed: 8,
    total: 10,
    percentage: (8 / 10) * 100
  };

  const assignmentHistory = [
    { id: 1, title: 'For Loop Assignment', score: 9, status: 'Completed', submittedDate: '2024-02-04' },
    { id: 2, title: 'While Loop Assignment', score: 8, status: 'Completed', submittedDate: '2024-02-03' },
    { id: 3, title: 'Array Assignment', score: 0, status: 'Pending', submittedDate: null },
    { id: 4, title: 'Function Assignment', score: 7, status: 'Completed', submittedDate: '2024-02-01' }
  ];

  const handleClose = useCallback(() => {
    setIsClosing(true);
    setTimeout(() => {
      document.body.style.overflow = 'unset';
      onClose();
    }, 300);
  }, [onClose]);

  const handleAssignmentClick = (assignment) => {
    // Close the modal first
    handleClose();
    // Navigate to the assignment view page
    router.push(`/assignments/${student.id}/${assignment.id}`);
  };

  useEffect(() => {
    const handleEscapeKey = (e) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };

    window.addEventListener('keydown', handleEscapeKey);
    return () => window.removeEventListener('keydown', handleEscapeKey);
  }, [handleClose]);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    const timer = setTimeout(() => setMounted(true), 50);
    return () => {
      document.body.style.overflow = 'unset';
      clearTimeout(timer);
    };
  }, []);

  if (loading) {
    return (
      <div 
        className={`student-modal-overlay ${mounted ? 'modal-enter' : ''}`}
        onClick={handleClose}
      >
        <div 
          className="student-modal-container"
          onClick={e => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
        >
          <DetailSkeleton />
        </div>
      </div>
    );
  }

  return (
    <div 
      className={`student-modal-overlay ${isClosing ? 'modal-exit' : ''} ${mounted ? 'modal-enter' : ''}`}
      onClick={handleClose}
    >
      <div 
        className={`student-modal-container ${isClosing ? 'modal-content-exit' : ''} ${mounted ? 'modal-content-enter' : ''}`}
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <div className="student-modal-header">
          <h2 id="modal-title" className="student-modal-title">Student Details</h2>
          <button 
            className="student-modal-close"
            onClick={handleClose}
            aria-label="Close modal"
          >
            ×
          </button>
        </div>
        
        <div className="student-modal-content">
          <section className={`student-info-section ${mounted ? 'content-enter' : ''}`}>
            <h3>Personal Information</h3>
            <div className="student-info-grid">
              <InfoItem label="Student ID" value={student?.id} />
              <InfoItem label="Name" value={student?.name} />
              <InfoItem label="Email" value={student?.email} />
              <InfoItem label="Section" value={student?.section} />
            </div>
          </section>

          <section className={`student-info-section ${mounted ? 'content-enter' : ''}`}>
            <h3>Academic Progress</h3>
            <div className="student-stats-grid">
              <StatCard 
                value={`${student?.score || 0}/10`}
                label="Overall Score"
              />
              <StatCard 
                value={`${completionRate.completed}/${completionRate.total}`}
                label="Assignments Completed"
              />
              <StatCard 
                value={`${completionRate.percentage}%`}
                label="Completion Rate"
              />
            </div>
          </section>

          <section className={`student-info-section ${mounted ? 'content-enter' : ''}`}>
            <h3>Assignment History</h3>
            <div className="student-table-wrapper">
              <table className="student-history-table">
                <thead>
                  <tr>
                    <th>Assignment</th>
                    <th>Score</th>
                    <th>Status</th>
                    <th>Submitted Date</th>
                  </tr>
                </thead>
                <tbody>
                  {assignmentHistory.map((assignment, index) => (
                    <tr 
                      key={assignment.id} 
                      className={`table-row-enter`}
                      style={{ animationDelay: `${index * 0.1}s`, cursor: 'pointer' }}
                      onClick={() => handleAssignmentClick(assignment)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          handleAssignmentClick(assignment);
                        }
                      }}
                    >
                      <td>{assignment.title}</td>
                      <td>{assignment.score}/10</td>
                      <td>
                        <StatusBadge status={assignment.status} />
                      </td>
                      <td>{assignment.submittedDate || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <div className={`student-modal-actions ${mounted ? 'content-enter' : ''}`}>
            <button className="student-btn-primary">Edit Profile</button>
            <button className="student-btn-secondary">Send Message</button>
            <button className="student-btn-tertiary">Download Report</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentDetailModal;