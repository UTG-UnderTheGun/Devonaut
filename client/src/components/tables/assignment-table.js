'use client'
import { useState, useEffect } from 'react';
import "./assignment-table.css";
import AssignmentDetail from '@/components/assignment/assignment-detail';

const AssignmentTable = ({ 
  loading: initialLoading = false
}) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(initialLoading);
  const [error, setError] = useState(null);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: 'dueDate', direction: 'asc' });

  // Function to handle sorting
  const onSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // Get sort icon
  const getSortIcon = (key) => {
    if (sortConfig.key === key) {
      return sortConfig.direction === 'asc' ? ' ↑' : ' ↓';
    }
    return '';
  };

  // Sort data
  const sortedData = [...data].sort((a, b) => {
    if (a[sortConfig.key] < b[sortConfig.key]) {
      return sortConfig.direction === 'asc' ? -1 : 1;
    }
    if (a[sortConfig.key] > b[sortConfig.key]) {
      return sortConfig.direction === 'asc' ? 1 : -1;
    }
    return 0;
  });

  // Handle row click
  const handleRowClick = (assignment) => {
    setSelectedAssignment(assignment);
  };

  // Fetch assignments
  useEffect(() => {
    const fetchAssignments = async () => {
      setLoading(true);
      try {
        const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
        const response = await fetch(`${API_BASE}/assignments`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        });

        if (!response.ok) {
          throw new Error('Failed to fetch assignments');
        }

        const result = await response.json();
        setData(result);
      } catch (err) {
        setError(err.message);
        console.error('Error fetching assignments:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAssignments();
  }, []);

  // If an assignment is selected, show the detail view
  if (selectedAssignment) {
    return <AssignmentDetail 
      assignmentId={selectedAssignment.id}
      onBack={() => setSelectedAssignment(null)}
    />;
  }

  // Format date for display
  const formatDate = (dateString) => {
    const options = { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  return (
    <div className="table-wrapper">
      {loading && (
        <div className="loading-overlay">
          <div className="loading-spinner" />
        </div>
      )}
      {error && (
        <div className="error-message">
          Error loading assignments: {error}
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
          {sortedData.length === 0 && !loading ? (
            <tr>
              <td colSpan="5" className="empty-message">
                No assignments found
              </td>
            </tr>
          ) : (
            sortedData.map((assignment, index) => (
              <tr 
                key={assignment.id} 
                className={index % 2 === 1 ? 'alternate' : ''} 
                onClick={() => handleRowClick(assignment)}
                style={{ cursor: 'pointer' }}
              >
                <td>{assignment.title}</td>
                <td>{assignment.chapter}</td>
                <td>{formatDate(assignment.dueDate)}</td>
                <td>
                  <span className="pending-badge">{assignment.pending} Pending</span>
                </td>
                <td>{assignment.points} Points</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default AssignmentTable;