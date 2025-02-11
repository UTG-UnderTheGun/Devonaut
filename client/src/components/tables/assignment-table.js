'use client'
import { useState } from 'react';
import "./assignment-table.css";
import AssignmentDetail from '@/components/assignment/assignment-detail';

const AssignmentTable = ({ 
  data, 
  sortConfig, 
  onSort, 
  loading 
}) => {
  const [selectedAssignment, setSelectedAssignment] = useState(null);

  const getSortIcon = (key) => {
    if (sortConfig.key === key) {
      return sortConfig.direction === 'asc' ? ' ↑' : ' ↓';
    }
    return '';
  };

  const handleRowClick = (assignment) => {
    setSelectedAssignment(assignment);
  };

  // If an assignment is selected, show the detail view
  if (selectedAssignment) {
    return <AssignmentDetail 
      assignment={selectedAssignment}
      onBack={() => setSelectedAssignment(null)}
    />;
  }

  return (
    <div className="table-wrapper">
      {loading && (
        <div className="loading-overlay">
          <div className="loading-spinner" />
        </div>
      )}
      <table className="student-table">
        <thead>
          <tr>
            {['title', 'chapter', 'dueDate', 'pending', 'points'].map((key) => (
              <th
                key={key}
                onClick={() => onSort(key)}
                className={sortConfig.key === key ? 'sorted' : ''}
              >
                {key === 'dueDate' ? 'Due Date' : 
                 key === 'pending' ? 'Pending' : 
                 key.charAt(0).toUpperCase() + key.slice(1)}
                <span className="sort-indicator">{getSortIcon(key)}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((assignment, index) => (
            <tr 
              key={assignment.id} 
              className={index % 2 === 1 ? 'alternate' : ''} 
              onClick={() => handleRowClick(assignment)}
              style={{ cursor: 'pointer' }}
            >
              <td>{assignment.title}</td>
              <td>{assignment.chapter}</td>
              <td>{assignment.dueDate}</td>
              <td>
                <span className="pending-badge">{assignment.pending} Pending</span>
              </td>
              <td>{assignment.points} Points</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default AssignmentTable;