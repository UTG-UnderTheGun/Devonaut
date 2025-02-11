// components/PendingAssignments.js
'use client'

import React from 'react';
import { useRouter } from 'next/navigation';
import './pendingassignment.css';

const PendingAssignments = () => {
  const router = useRouter();
  const assignments = [
    {
      id: "Ex.6",
      title: "For Loop Assignment",
      students: [
        { 
          studentId: '6510741111',
          studentName: 'Wuttiphut Devonaut',
          submissionTime: '04-02-2025 21:34',
          status: 'Submitted',
          score: '0/10'
        },
        { 
          studentId: '6510741111',
          studentName: 'Thanagith Devonaut',
          submissionTime: '02-02-2025 21:34',
          status: 'Submitted',
          score: '0/10'
        },
        { 
          studentId: '6510741111',
          studentName: 'Nattakit Devonaut',
          submissionTime: '05-02-2025 06:24',
          status: 'Late Submitted',
          score: '0/10'
        },
        { 
          studentId: '6510741111',
          studentName: 'Kittpon Devonaut',
          submissionTime: '-',
          status: 'Not Submitted',
          score: '0/10'
        },
        { 
          studentId: '6510741111',
          studentName: 'Lux taheyoung',
          submissionTime: '-',
          status: 'Completed',
          score: '10/10'
        }
      ]
    }
  ];

  const handleRowClick = (assignmentId, studentId) => {
    router.push(`/assignments/${studentId}/${assignmentId}`);
  };

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