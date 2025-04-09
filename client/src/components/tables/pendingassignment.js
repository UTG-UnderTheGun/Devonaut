// components/PendingAssignments.js
'use client'

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import './pendingassignment.css';

const PendingAssignments = () => {
  const router = useRouter();
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAssignmentsAndStudents = async () => {
      try {
        const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
        
        // 1. Get all assignments that the teacher has created
        const response = await fetch(`${API_BASE}/assignments/`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
        });

        if (!response.ok) {
          throw new Error('Failed to fetch assignments');
        }

        const assignmentsResult = await response.json();
        
        // 2. Get all students in the class
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
        
        // 3. Process each assignment
        const processedAssignments = [];
        
        for (const assignment of assignmentsResult) {
          try {
            // Try to get submissions for this assignment if the endpoint exists
            const submissionsMap = {};
            try {
              const submissionsUrl = `${API_BASE}/teacher/assignment/${assignment.id}/submissions`;
              const submissionsResponse = await fetch(submissionsUrl, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
              });
              
              if (submissionsResponse.ok) {
                const submissions = await submissionsResponse.json();
                // Create a map of user_id to submission
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
                score: score
              };
            });
            
            // Add this assignment with its students to our list
            processedAssignments.push({
              id: assignment.id,
              title: assignment.title,
              students: studentEntries
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

    fetchAssignmentsAndStudents();
  }, []);

  const handleRowClick = (assignmentId, studentId) => {
    router.push(`/assignments/${studentId}/${assignmentId}`);
  };

  if (loading) {
    return <div className="loading-message">Loading assignments...</div>;
  }

  if (error) {
    return <div className="error-message">Error: {error}</div>;
  }

  if (assignments.length === 0) {
    return <div className="empty-state">No assignments found</div>;
  }

  return (
    <div className="assignments-container">
      {assignments.map((assignment) => (
        <div key={assignment.id} className="assignment-section">
          <div className="assignment-header">
            <h3>{assignment.title}</h3>
          </div>
          
          <div className="table-wrapper">
            <table className="student-table">
              <thead>
                <tr>
                  <th>Student ID</th>
                  <th>Student Name</th>
                  <th>Section</th>
                  <th>Submission Time</th>
                  <th>Status</th>
                  <th>Score</th>
                </tr>
              </thead>
              <tbody>
                {assignment.students.map((student, index) => (
                  <tr 
                    key={`${student.studentId}-${index}`} 
                    className={student.status.toLowerCase().replace(' ', '-')}
                    onClick={() => handleRowClick(assignment.id, student.studentId)}
                    style={{ cursor: 'pointer' }}
                  >
                    <td>{student.studentId}</td>
                    <td>{student.studentName}</td>
                    <td>{student.section}</td>
                    <td>{student.submissionTime}</td>
                    <td>
                      <span className={`status-badge ${student.status.toLowerCase().replace(' ', '-')}`}>
                        {student.status}
                      </span>
                    </td>
                    <td>{student.score}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
};

export default PendingAssignments;