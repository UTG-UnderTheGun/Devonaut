'use client';
import React, { useEffect, useState, useCallback, memo } from 'react';
import { useRouter } from 'next/navigation';
import './student-detail.css';

const DetailSkeleton = () => {
  return (
    <>
      <div className="student-modal-header">
        <div className="skeleton-title-container">
          <div className="skeleton-text skeleton-title"></div>
        </div>
        <div className="skeleton-close-btn"></div>
      </div>
      
      <div className="student-modal-content">
        <section className="student-info-section">
          <div className="skeleton-text skeleton-heading"></div>
          <div className="student-info-grid">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="student-info-item">
                <div className="skeleton-text skeleton-label"></div>
                <div className="skeleton-text skeleton-value"></div>
              </div>
            ))}
          </div>
        </section>

        <section className="student-info-section">
          <div className="skeleton-text skeleton-heading"></div>
          <div className="student-stats-grid">
            {[1, 2, 3].map(i => (
              <div key={i} className="student-stat-card skeleton-card">
                <div className="skeleton-text skeleton-stat-value"></div>
                <div className="skeleton-text skeleton-stat-label"></div>
              </div>
            ))}
          </div>
        </section>

        <section className="student-info-section">
          <div className="skeleton-text skeleton-heading"></div>
          <div className="student-table-wrapper">
            <table className="student-history-table">
              <thead>
                <tr>
                  {[1, 2, 3, 4].map(i => (
                    <th key={i}><div className="skeleton-text"></div></th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[1, 2, 3, 4].map(i => (
                  <tr key={i}>
                    {[1, 2, 3, 4].map(j => (
                      <td key={j}><div className="skeleton-text"></div></td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <div className="student-modal-actions">
          {[1, 2, 3].map(i => (
            <div key={i} className="skeleton-button"></div>
          ))}
        </div>
      </div>
    </>
  );
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

const getSkillLevelDisplay = (skillLevel) => {
  if (!skillLevel) return { value: 'Not Set', label: 'Skill Level' };
  
  if (typeof skillLevel === 'string') {
    const formatted = skillLevel.charAt(0).toUpperCase() + skillLevel.slice(1);
    return { value: formatted, label: 'Skill Level' };
  }
  
  if (typeof skillLevel === 'number') {
    if (skillLevel <= 3) return { value: 'Beginner', label: 'Skill Level' };
    if (skillLevel <= 7) return { value: 'Intermediate', label: 'Skill Level' };
    return { value: 'Advanced', label: 'Skill Level' };
  }
  
  return { value: 'Unknown', label: 'Skill Level' };
};

const getScoreDisplay = (score) => {
  if (score === undefined || score === null) return 'Not Available';
  if (typeof score === 'number') return `${score}/10`;
  if (typeof score === 'string' && ['beginner', 'intermediate', 'advanced'].includes(score.toLowerCase())) {
    return score.charAt(0).toUpperCase() + score.slice(1);
  }
  return score.toString();
};

const StudentDetailModal = ({ student, onClose, loading = false }) => {
  const router = useRouter();
  const [isClosing, setIsClosing] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    setMounted(true);
    
    if (student) {
      const timer = setTimeout(() => {
        setIsLoading(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [student]);

  useEffect(() => {
    document.body.classList.add('modal-open');
    return () => document.body.classList.remove('modal-open');
  }, []);

  const handleClose = useCallback(() => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
    }, 100);
  }, [onClose]);

  const skillLevel = getSkillLevelDisplay(student?.skill_level || student?.score);

  const assignmentHistory = [
    { id: 1, title: 'For Loop Assignment', score: 9, status: 'Completed', submittedDate: '2024-02-04' },
    { id: 2, title: 'While Loop Assignment', score: 8, status: 'Completed', submittedDate: '2024-02-03' },
    { id: 3, title: 'Array Assignment', score: 0, status: 'Pending', submittedDate: null },
    { id: 4, title: 'Function Assignment', score: 7, status: 'Completed', submittedDate: '2024-02-01' }
  ];

  const handleAssignmentClick = (assignment) => {
    handleClose();
    router.push(`/assignments/${student.id}/${assignment.id}`);
  };

  useEffect(() => {
    const handleEscapeKey = (e) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };

    window.addEventListener('keydown', handleEscapeKey);
    document.body.style.overflow = 'hidden';
    const timer = setTimeout(() => setMounted(true), 50);

    return () => {
      window.removeEventListener('keydown', handleEscapeKey);
      document.body.style.overflow = 'unset';
      clearTimeout(timer);
    };
  }, [handleClose]);

  const studentInfo = {
    id: student?.id || 'N/A',
    name: student?.name || 'Unknown',
    email: student?.email || student?.username || student?.user_email || 'N/A',
    section: student?.section || 'Unassigned',
    score: '0/10',
  };

  console.log('Student data in modal:', student);

  return (
    <div 
      className={`student-modal-overlay ${isClosing ? 'modal-exit' : ''}`}
      onClick={handleClose}
    >
      <div 
        className={`student-modal-container ${isClosing ? 'modal-content-exit' : ''}`}
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        {(!student || isLoading) ? (
          <DetailSkeleton />
        ) : (
          <>
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
              <section className="student-info-section">
                <h3>Personal Information</h3>
                <div className="student-info-grid">
                  <InfoItem label="Student ID" value={studentInfo.id} />
                  <InfoItem label="Name" value={studentInfo.name} />
                  <InfoItem label="Email" value={studentInfo.email} />
                  <InfoItem label="Section" value={studentInfo.section} />
                </div>
              </section>

              <section className="student-info-section">
                <h3>Academic Progress</h3>
                <div className="student-stats-grid">
                  <StatCard 
                    value="0/10"
                    label="Overall Score"
                  />
                  <StatCard 
                    value={skillLevel.value}
                    label={skillLevel.label}
                  />
                  <StatCard 
                    value={`${assignmentHistory.filter(a => a.status === 'Completed').length}/${assignmentHistory.length}`}
                    label="Assignments Completed"
                  />
                </div>
              </section>

              <section className="student-info-section">
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

              <div className="student-modal-actions">
                <button className="student-btn-primary">Edit Profile</button>
                <button className="student-btn-secondary">Send Message</button>
                <button className="student-btn-tertiary">Download Report</button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default StudentDetailModal;