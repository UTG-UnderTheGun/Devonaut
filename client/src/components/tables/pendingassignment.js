// components/PendingAssignments.js
'use client'

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import StudentAssignment from '@/components/assignment/student-assignment';
import Pagination from '@/components/controls/pagination';
import './pendingassignment.css';

const PendingAssignments = () => {
  const router = useRouter();
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [isReloading, setIsReloading] = useState(false);

  const fetchAssignmentsAndStudents = async () => {
    try {
      setIsReloading(true);
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
      setIsReloading(false);
    }
  };

  useEffect(() => {
    fetchAssignmentsAndStudents();
  }, []);

  const handleRowClick = (assignmentId, studentId) => {
    setSelectedAssignment({ assignmentId, studentId });
  };

  const handleBack = () => {
    setSelectedAssignment(null);
  };

  const handleReload = () => {
    fetchAssignmentsAndStudents();
  };

  // Pagination logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentAssignments = assignments.slice(indexOfFirstItem, indexOfLastItem);

  if (loading) {
    return <div className="loading-message">Loading assignments...</div>;
  }

  if (error) {
    return <div className="error-message">Error: {error}</div>;
  }

  if (assignments.length === 0) {
    return <div className="empty-state">No assignments found</div>;
  }

  // If an assignment is selected, show the StudentAssignment component
  if (selectedAssignment) {
    return (
      <div className="assignment-view">
        <StudentAssignment 
          studentId={selectedAssignment.studentId}
          assignmentId={selectedAssignment.assignmentId}
          onBack={handleBack}
        />
      </div>
    );
  }

  return (
    <div className="assignments-container">
      {loading ? (
        <div className="loading-message">Loading assignments...</div>
      ) : error ? (
        <div className="error-message">{error}</div>
      ) : selectedAssignment ? (
        <div className="assignment-view">
          <StudentAssignment
            assignment={selectedAssignment}
            onBack={() => setSelectedAssignment(null)}
            onSubmissionUpdate={handleReload}
          />
        </div>
      ) : (
        <div className="assignment-section">
          <div className="assignment-header">
            <h3>Pending Assignments</h3>
          </div>
          <div className="table-wrapper">
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
                {currentAssignments.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="empty-state">
                      No pending assignments found
                    </td>
                  </tr>
                ) : (
                  currentAssignments.flatMap((assignment) =>
                    assignment.students.map((student) => (
                      <tr
                        key={`${assignment.id}-${student.studentId}`}
                        onClick={() => handleRowClick(assignment.id, student.studentId)}
                        style={{ cursor: 'pointer' }}
                        className={student.status.toLowerCase().replace(' ', '-')}
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
          </div>
          <Pagination
            itemsPerPage={itemsPerPage}
            totalItems={assignments.length}
            currentPage={currentPage}
            onPageChange={setCurrentPage}
          />
        </div>
      )}
    </div>
  );
};

export default PendingAssignments;