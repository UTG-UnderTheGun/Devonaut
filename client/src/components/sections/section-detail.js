import React, { useState } from 'react';
import './section-detail.css';
import StudentDetail from '@/components/tables/student-detail.js';

const mockStudents = [
  {
    id: 1,
    name: "John Doe",
    email: "john.doe@example.com",
    progress: 85,
    completedAssignments: 17,
    pendingAssignments: 3,
    averageScore: 92.5,
    attendance: "95%",
    status: "Active"
  },
  {
    id: 2,
    name: "Jane Smith",
    email: "jane.smith@example.com",
    progress: 78,
    completedAssignments: 15,
    pendingAssignments: 5,
    averageScore: 88.0,
    attendance: "92%",
    status: "Active"
  },
  // Add more mock students as needed
];

const SectionDetail = ({ section }) => {
  const [selectedStudent, setSelectedStudent] = useState(null);
  
  if (!section) return null;
  
  const progressPercent = (section.assignmentsCompleted / (section.assignmentsCompleted + section.assignmentsPending)) * 100;

  return (
    <div className="section-detail">
      {selectedStudent && (
        <div className="modal-overlay">
          <div className="modal-content">
            <StudentDetail 
              student={selectedStudent} 
              onClose={() => setSelectedStudent(null)}
            />
          </div>
        </div>
      )}

      <div className="section-detail-header">
        <div className="header-left">
          <h2>Section {section.id}</h2>
          <span className="section-code">{section.schedule}</span>
        </div>
        <div className="header-right">
          <span className="student-count">
            {section.totalStudents} Students
          </span>
        </div>
      </div>
      
      <div className="section-detail-content">
        <div className="progress-section">
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <span className="progress-text">{progressPercent.toFixed(1)}% Complete</span>
        </div>

        <div className="stats-grid-section">
          <div className="stat-box">
            <span className="stat-value">{section.assignmentsCompleted}</span>
            <span className="stat-label">Completed</span>
          </div>
          <div className="stat-box">
            <span className="stat-value">{section.assignmentsPending}</span>
            <span className="stat-label">Pending</span>
          </div>
          <div className="stat-box">
            <span className="stat-value">{section.averageScore.toFixed(1)}</span>
            <span className="stat-label">Avg. Score</span>
          </div>
        </div>

        <div className="students-table">
          <h3>Enrolled Students</h3>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Progress</th>
                  <th>Completed</th>
                  <th>Pending</th>
                  <th>Avg. Score</th>
                </tr>
              </thead>
              <tbody>
                {mockStudents.map(student => (
                  <tr 
                    key={student.id}
                    onClick={() => setSelectedStudent(student)}
                    className="student-row"
                  >
                    <td>{student.name}</td>
                    <td>{student.progress}%</td>
                    <td>{student.completedAssignments}</td>
                    <td>{student.pendingAssignments}</td>
                    <td>{student.averageScore}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SectionDetail;