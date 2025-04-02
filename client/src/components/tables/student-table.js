'use client';

import { useState, useEffect } from 'react';
import "./student-table.css";
import StudentDetailModal from './student-detail'; // Make sure path is correct

const TableSkeleton = () => {
  return (
    <div className="skeleton-table">
      <div className="skeleton-header">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="skeleton-th">
            <div className="skeleton-text"></div>
          </div>
        ))}
      </div>
      <div className="skeleton-body">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="skeleton-row">
            {[1, 2, 3, 4].map(j => (
              <div key={j} className="skeleton-td">
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

const StudentTable = ({ 
  data, 
  sortConfig, 
  onSort, 
  loading 
}) => {
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [modalLoading, setModalLoading] = useState(true);

  useEffect(() => {
    if (showModal) {
      document.body.classList.add('modal-open');
    } else {
      document.body.classList.remove('modal-open');
    }
    return () => document.body.classList.remove('modal-open');
  }, [showModal]);

  const getSortIcon = (key) => {
    if (sortConfig.key === key) {
      return sortConfig.direction === 'asc' ? ' ↑' : ' ↓';
    }
    return '';
  };

  const handleRowClick = (student) => {
    setSelectedStudent(student);
    setModalLoading(true);
    setShowModal(true);
  };

  // Add an empty state component
  const EmptyState = () => (
    <div className="empty-state">
      <div className="empty-icon">👥</div>
      <h3>No Students Found</h3>
      <p>There are no students matching your criteria.</p>
    </div>
  );

  return (
    <div className="table-container">
      {showModal && (
        <StudentDetailModal 
          student={selectedStudent}
          loading={modalLoading}
          onClose={() => {
            setShowModal(false);
            setSelectedStudent(null);
          }}
        />
      )}
      
      <div className="table-wrapper">
        {loading ? (
          <TableSkeleton />
        ) : !data || data.length === 0 ? (
          <EmptyState />
        ) : (
          <table className="student-table">
            <thead>
              <tr>
                {['id', 'name', 'section', 'score'].map((key) => (
                  <th
                    key={key}
                    onClick={() => onSort(key)}
                    className={sortConfig.key === key ? 'sorted' : ''}
                  >
                    {key.charAt(0).toUpperCase() + key.slice(1)}
                    <span className="sort-indicator">{getSortIcon(key)}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((student, index) => (
                <tr 
                  key={`${student.id || 'unknown'}-${index}`}
                  className={`${index % 2 === 1 ? 'alternate' : ''} clickable-row`}
                  onClick={() => handleRowClick(student)}
                >
                  <td>{student.id || 'N/A'}</td>
                  <td>{student.name || 'Unknown'}</td>
                  <td>{student.section || 'Unassigned'}</td>
                  <td>
                    <div className="score-cell">
                      <div 
                        className="score-bar" 
                        style={{ 
                          width: `${typeof student.score === 'number' ? student.score * 10 : 0}%` 
                        }}
                      />
                      <span className="score-value">
                        {typeof student.score === 'number' ? student.score : 0}/10
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default StudentTable;