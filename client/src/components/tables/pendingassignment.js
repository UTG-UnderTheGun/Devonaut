// components/PendingAssignments.js
'use client'

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import StudentAssignment from '@/components/assignment/student-assignment';
import './pendingassignment.css';

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

const PendingAssignments = () => {
  const router = useRouter();
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedAssignment, setSelectedAssignment] = useState(null);

  const fetchAssignmentsAndStudents = async () => {
    try {
      const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      
      const response = await fetch(`${API_BASE}/assignments/`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch assignments');
      }

      const assignmentsResult = await response.json();
      
      const studentsResponse = await fetch(`${API_BASE}/users/students`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });

      if (!studentsResponse.ok) {
        throw new Error('Failed to fetch students');
      }

      const studentsResult = await studentsResponse.json();
      const students = studentsResult.users || [];
      
      // Process assignments and students
      const processedAssignments = [];
      
      for (const assignment of assignmentsResult) {
        try {
          // Try to get submissions for this assignment
          const submissionsMap = {};
          try {
            const submissionsUrl = `${API_BASE}/assignments/${assignment.id}/submissions`;
            const submissionsResponse = await fetch(submissionsUrl, {
              method: 'GET',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
            });
            
            if (submissionsResponse.ok) {
              const submissions = await submissionsResponse.json();
              submissions.forEach(sub => {
                submissionsMap[sub.user_id] = sub;
              });
            }
          } catch (subError) {
            console.warn(`Could not fetch submissions: ${subError.message}`);
          }
          
          // Create student entries for each student
          const studentEntries = students.map(student => {
            const studentId = student.id;
            const submission = submissionsMap[studentId];
            
            // Default values for a student with no submission
            let status = "Not Submitted";
            let submissionTime = "-";
            let score = `0/${assignment.points}`;
            
            // Update values if there is a submission
            if (submission) {
              if (submission.status === "pending") {
                status = "Submitted";
              } else if (submission.status === "graded") {
                status = "Completed";
              } else if (submission.status === "late") {
                status = "Late Submitted";
              }
              
              if (submission.submitted_at) {
                submissionTime = new Date(submission.submitted_at).toLocaleString();
              }
              
              if (submission.score !== undefined) {
                score = `${submission.score}/${assignment.points}`;
              }
            }
            
            return {
              studentId: studentId,
              studentName: student.name || "Unknown",
              section: student.section || "Unassigned",
              submissionTime: submissionTime,
              status: status,
              score: score,
              submission: submission
            };
          });
          
          processedAssignments.push({
            id: assignment.id,
            title: assignment.title,
            students: studentEntries,
            ...assignment
          });
          
        } catch (assignmentError) {
          console.error(`Error processing assignment ${assignment.id}:`, assignmentError);
        }
      }
      
      setAssignments(processedAssignments);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssignmentsAndStudents();
  }, []);

  const handleRowClick = (assignmentId, studentId) => {
    const assignment = assignments.find(a => a.id === assignmentId);
    const student = assignment?.students.find(s => s.studentId === studentId);
    
    if (assignment && student) {
      setSelectedAssignment({
        assignment: {
          id: assignment.id,
          title: assignment.title,
          chapter: assignment.chapter || '',
          dueDate: assignment.dueDate,
          points: assignment.points || 10,
          exercises: assignment.exercises || []
        },
        student: {
          id: student.studentId,
          name: student.studentName,
          section: student.section,
          submission: student.submission
        }
      });
    }
  };

  if (loading) {
    return (
      <div className="page-container">
        <div className="table-section">
          <TableSkeleton />
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="table-section">
        {selectedAssignment ? (
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
              onSubmissionUpdate={fetchAssignmentsAndStudents}
            />
          </div>
        ) : (
          <table className="student-table">
            <thead>
              <tr>
                <th>Student Name</th>
                <th>Assignment Title</th>
                <th>Due Date</th>
                <th>Status</th>
                <th>Score</th>
              </tr>
            </thead>
            <tbody>
              {error ? (
                <tr>
                  <td colSpan="5" className="error-cell">{error}</td>
                </tr>
              ) : assignments.length === 0 ? (
                <tr>
                  <td colSpan="5" className="empty-cell">No pending assignments found</td>
                </tr>
              ) : (
                assignments.flatMap((assignment) =>
                  assignment.students.map((student) => (
                    <tr
                      key={`${assignment.id}-${student.studentId}`}
                      onClick={() => handleRowClick(assignment.id, student.studentId)}
                      className="clickable-row"
                    >
                      <td>{student.studentName}</td>
                      <td>{assignment.title}</td>
                      <td>{assignment.dueDate ? new Date(assignment.dueDate).toLocaleDateString() : 'N/A'}</td>
                      <td>
                        <span className={`status-badge ${student.status.toLowerCase().replace(' ', '-')}`}>
                          {student.status}
                        </span>
                      </td>
                      <td>{student.score || 'N/A'}</td>
                    </tr>
                  ))
                )
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default PendingAssignments;