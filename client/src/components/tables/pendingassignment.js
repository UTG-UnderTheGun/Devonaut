// components/PendingAssignments.js
'use client'

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import StudentAssignment from '@/components/assignment/student-assignment';
import './pendingassignment.css';

// Predefined colors for assignments
const COLORS = [
  { badge: '#3B82F6' }, // Blue
  { badge: '#7C3AED' }, // Purple
  { badge: '#22C55E' }, // Green
  { badge: '#F97316' }, // Orange
  { badge: '#EF4444' }, // Red
  { badge: '#475569' }, // Slate
  { badge: '#D946EF' }, // Pink
  { badge: '#06B6D4' }, // Cyan
  { badge: '#CA8A04' }, // Yellow
  { badge: '#2563EB' }, // Indigo
  { badge: '#8B5CF6' }, // Violet
  { badge: '#EC4899' }, // Pink
  { badge: '#14B8A6' }, // Teal
  { badge: '#F59E0B' }, // Amber
  { badge: '#6366F1' }, // Indigo alt
];

const LOCAL_STORAGE_KEY = 'assignment_colors';

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

const PendingAssignments = ({ data = [], loading = false, onAssignmentSelect }) => {
  const router = useRouter();
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Update current time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // 60000 ms = 1 minute
    
    return () => clearInterval(timer);
  }, []);

  // Handle refresh button click
  const handleRefresh = () => {
    if (isRefreshing) return;
    
    setIsRefreshing(true);
    
    // If parent has provided a handler (i.e., onAssignmentSelect), use it to trigger a reload
    if (typeof onAssignmentSelect === 'function') {
      // Use a special call to indicate refresh action
      onAssignmentSelect('refresh', 'all');
      
      // Reset refreshing state after a delay
      setTimeout(() => {
        setIsRefreshing(false);
      }, 1000);
    } else {
      // If no parent handler, just update the time
      setCurrentTime(new Date());
      setTimeout(() => {
        setIsRefreshing(false);
      }, 500);
    }
  };

  // Calculate remaining time
  const calculateTimeRemaining = (dueDate) => {
    if (!dueDate) return { text: 'No deadline', className: '' };
    
    const due = new Date(dueDate);
    const now = currentTime;
    
    // Calculate time difference in milliseconds
    const diff = due - now;
    
    // If past due date
    if (diff < 0) {
      return { text: 'Overdue', className: 'time-overdue' };
    }
    
    // Calculate days, hours, minutes
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    let text = '';
    let className = '';
    
    // Create text for remaining time
    if (days > 0) {
      text = `${days}d ${hours}h remaining`;
      className = 'time-plenty';
    } else if (hours > 0) {
      text = `${hours}h ${minutes}m remaining`;
      className = hours < 24 ? 'time-warning' : 'time-plenty';
    } else {
      text = `${minutes}m remaining`;
      className = 'time-critical';
    }
    
    return { text, className };
  };

  const handleRowClick = (assignmentId, studentId) => {
    if (onAssignmentSelect) {
      onAssignmentSelect(assignmentId, studentId);
    } else {
      const item = data.find(item => 
        item.assignmentId === assignmentId && item.studentId === studentId
      );
      
      if (item) {
        setSelectedAssignment({
          assignment: {
            id: item.assignmentId,
            title: item.assignmentTitle,
            chapter: item.chapter || '',
            dueDate: item.dueDate,
            points: item.points || 10,
            exercises: item.exercises || []
          },
          student: {
            id: item.studentId,
            name: item.studentName,
            section: item.section,
            submission: item.submission
          }
        });
      }
    }
  };

  // Add an empty state component
  const EmptyState = () => (
    <div className="empty-state">
      <div className="empty-icon">📋</div>
      <h3>No Pending Assignments</h3>
      <p>There are no pending assignments to display.</p>
    </div>
  );

  if (loading) {
    return (
      <div className="table-container">
        <TableSkeleton />
      </div>
    );
  }

  return (
    <div className="table-container">
      {selectedAssignment && !onAssignmentSelect ? (
        <div className="selected-assignment-view">
          <button 
            className="back-button"
            onClick={() => setSelectedAssignment(null)}
          >
            ← Back to List
          </button>
          <StudentAssignment
            studentId={selectedAssignment.student.id}
            assignmentId={selectedAssignment.assignment.id}
            onBack={() => setSelectedAssignment(null)}
            onSubmissionUpdate={() => {
              setSelectedAssignment(null);
              // If parent has provided an update handler, call it
              if (typeof onAssignmentSelect === 'function') {
                onAssignmentSelect(null, null);
              }
            }}
          />
        </div>
      ) : (
        <>
          <div className="table-header">
          </div>
          <div className="table-wrapper">
            {!data || data.length === 0 ? (
              <EmptyState />
            ) : (
              <table className="student-table">
                <thead>
                  <tr>
                    <th>Student ID</th>
                    <th>Student Name</th>
                    <th>Assignment</th>
                    <th>Due Date</th>
                    <th>Remaining</th>
                    <th>Status</th>
                    <th>Score</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((item, index) => (
                    <tr
                      key={`${item.assignmentId}-${item.studentId}-${index}`}
                      onClick={() => handleRowClick(item.assignmentId, item.studentId)}
                      className={`${index % 2 === 1 ? 'alternate' : ''} clickable-row`}
                    >
                      <td>{item.studentId}</td>
                      <td>{item.studentName}</td>
                      <td>
                        <div className="assignment-title">
                          <span 
                            className="assignment-badge"
                            style={{
                              backgroundColor: item.color?.badge || '#3B82F6',
                              color: 'white'
                            }}
                          >
                            {item.badgeText}
                          </span>
                          {item.assignmentTitle}
                        </div>
                      </td>
                      <td>{item.dueDate ? new Date(item.dueDate).toLocaleDateString() : 'N/A'}</td>
                      <td>
                        <div className={`time-remaining ${calculateTimeRemaining(item.dueDate).className}`}>
                          {calculateTimeRemaining(item.dueDate).text}
                        </div>
                      </td>
                      <td>
                        <span className={`status-badge ${item.status.toLowerCase().replace(' ', '-')}`}>
                          {item.status}
                        </span>
                      </td>
                      <td>{item.score || 'N/A'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default PendingAssignments;