import React, { useState, useEffect } from 'react';
import './section-detail.css';
import StudentDetailModal from '@/components/tables/student-detail';
import axios from 'axios';

// Define API_BASE constant
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const TableSkeleton = () => {
  return (
    <div className="skeleton-table">
      <div className="skeleton-header">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={`header-${i}`} className="skeleton-th">
            <div className="skeleton-text"></div>
          </div>
        ))}
      </div>
      <div className="skeleton-body">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={`row-${i}`} className="skeleton-row">
            {[1, 2, 3, 4, 5].map(j => (
              <div key={`cell-${i}-${j}`} className="skeleton-td">
                <div className="skeleton-text"></div>
                {j === 4 && <div className="skeleton-score-bar"></div>}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

const SectionDetail = ({ section }) => {
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [students, setStudents] = useState([]);

  useEffect(() => {
    if (showModal) {
      document.body.classList.add('modal-open');
    } else {
      document.body.classList.remove('modal-open');
    }
    return () => document.body.classList.remove('modal-open');
  }, [showModal]);

  useEffect(() => {
    // Just use the students from the section if available, don't fetch
    const getStudentsFromSection = () => {
      const sectionCopy = section ? {...section} : null;
      
      if (sectionCopy && sectionCopy.students && Array.isArray(sectionCopy.students)) {
        setStudents(sectionCopy.students);
      } else {
        // If no students, just use empty array instead of fetching
        setStudents([]);
      }
    };
    
    getStudentsFromSection();
  }, [section]);

  const handleRowClick = (student) => {
    setSelectedStudent(student);
    setShowModal(true);
  };

  if (!section) return null;

  // Use static values
  const totalStudents = section.totalStudents || students.length || 0;
  // Always use static pending count of 2
  const pendingCount = 2;
  // Static total score
  const totalScore = 75;

  const EmptyState = () => (
    <div className="empty-state">
      <div className="empty-icon">👨‍🎓</div>
      <h3>No Students Found</h3>
      <p>There are no students assigned to this section.</p>
    </div>
  );

  return (
    <div className="section-detail">
      {showModal && (
        <StudentDetailModal 
          student={selectedStudent}
          loading={false}
          onClose={() => {
            setShowModal(false);
            setSelectedStudent(null);
          }}
        />
      )}

      <div className="section-detail-header">
        <div className="header-left">
          <h2>Section {section.id}</h2>
        </div>
        <div className="header-right">
          <span className="student-count">
            {totalStudents} Students
          </span>
        </div>
      </div>
      
      <div className="section-detail-content">
        <div className="progress-section">
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ width: `${students.length > 0 ? 100 : 0}%` }}
            />
          </div>
          <span className="progress-text">{students.length > 0 ? '100%' : '0%'} Complete</span>
        </div>

        <div className="stats-grid-section">
          <div className="stat-box">
            <span className="stat-value">{totalStudents}</span>
            <span className="stat-label">Total Students</span>
          </div>
          <div className="stat-box">
            <span className="stat-value">{pendingCount}</span>
            <span className="stat-label">Pending</span>
          </div>
          <div className="stat-box">
            <span className="stat-value">{totalScore}</span>
            <span className="stat-label">Total Score</span>
          </div>
        </div>

        <div className="students-table">
          <h3>Enrolled Students ({totalStudents})</h3>
          <div className="table-wrapper">
            {loading ? (
              <TableSkeleton />
            ) : students.length === 0 ? (
              <EmptyState />
            ) : (
              <table className="student-table">
                <thead>
                  <tr>
                    <th>Student ID</th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Section</th>
                    <th>Skill Level</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((student, index) => {
                    // Generate a unique key that won't clash with other students
                    const uniqueKey = student.id ? `student-${student.id}-${index}` : `student-index-${index}`;
                    return (
                      <tr 
                        key={uniqueKey}
                        className={`${index % 2 === 1 ? 'alternate' : ''} clickable-row`}
                        onClick={() => handleRowClick(student)}
                      >
                        <td>{student.id || 'N/A'}</td>
                        <td>{student.name || 'Unknown'}</td>
                        <td>{student.email || 'N/A'}</td>
                        <td>{student.section || 'N/A'}</td>
                        <td>{student.skill_level || 'N/A'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SectionDetail;