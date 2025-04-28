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

const PendingAssignments = () => {
  const router = useRouter();
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [assignmentColors, setAssignmentColors] = useState({});
  const [currentTime, setCurrentTime] = useState(new Date());

  // Load saved colors from localStorage on component mount
  useEffect(() => {
    try {
      const savedColors = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (savedColors) {
        setAssignmentColors(JSON.parse(savedColors));
      }
    } catch (e) {
      console.error('Error loading saved colors:', e);
    }
  }, []);

  // อัปเดตเวลาปัจจุบันทุก 1 นาที
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // 60000 ms = 1 นาที
    
    return () => clearInterval(timer);
  }, []);

  // Extract assignment identifier from title (like Q4, Q21, etc)
  const extractAssignmentId = (title) => {
    // Look for patterns like Q4, Q21, etc. at the beginning or anywhere in the title
    const match = title.match(/Q\d+/i);
    if (match) {
      return match[0].toUpperCase();
    }
    
    // If no Q pattern found, use the first word/token
    return title.split(/\s+/)[0];
  };

  const getAssignmentColor = (assignmentId) => {
    // ถ้ามีสีอยู่แล้ว ใช้สีเดิม
    if (assignmentColors[assignmentId]) {
      return assignmentColors[assignmentId];
    }

    // หาสีที่ยังไม่ถูกใช้
    const usedColors = Object.values(assignmentColors);
    const availableColors = COLORS.filter(color => 
      !usedColors.some(used => used.badge === color.badge)
    );

    // ถ้ามีสีที่ยังไม่ถูกใช้ สุ่มจากสีที่เหลือ
    // ถ้าไม่มี สุ่มจากสีทั้งหมด
    const colorPool = availableColors.length > 0 ? availableColors : COLORS;
    const randomColor = colorPool[Math.floor(Math.random() * colorPool.length)];

    // เก็บสีที่สุ่มได้ใน state และ localStorage
    const updatedColors = {
      ...assignmentColors,
      [assignmentId]: randomColor
    };
    
    setAssignmentColors(updatedColors);
    
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedColors));
    } catch (e) {
      console.error('Error saving colors to localStorage:', e);
    }

    return randomColor;
  };

  // ฟังก์ชันคำนวณเวลาที่เหลือ
  const calculateTimeRemaining = (dueDate) => {
    if (!dueDate) return { text: 'No deadline', className: '' };
    
    const due = new Date(dueDate);
    const now = currentTime;
    
    // คำนวณความต่างของเวลาในมิลลิวินาที
    const diff = due - now;
    
    // ถ้าเลยกำหนดแล้ว
    if (diff < 0) {
      return { text: 'Overdue', className: 'time-overdue' };
    }
    
    // คำนวณเป็นวัน ชั่วโมง นาที
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    let text = '';
    let className = '';
    
    // สร้างข้อความแสดงเวลาที่เหลือ
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
          const studentEntries = await Promise.all(students.map(async (student) => {
            const studentId = student.id;
            
            // Skip invalid student IDs
            if (!studentId || studentId === 'N/A') {
              return {
                studentId: studentId || 'N/A',
                studentName: student.name || "Unknown",
                section: student.section || "Unassigned",
                submissionTime: "-",
                status: "Not Submitted",
                score: `0/${assignment.points}`,
                submission: null
              };
            }
            
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
            } else {
              // Don't check for code history here - this will be done in the student-assignment component when needed
              // This prevents unnecessary API calls for every student
              status = "Not Submitted";
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
          }));
          
          const assignmentId = assignment.id;
          const badgeText = extractAssignmentId(assignment.title);
          
          // Filter out entries with duplicate student IDs
          const uniqueStudentEntries = studentEntries.reduce((unique, entry) => {
            if (!entry.studentId || entry.studentId === 'N/A') return unique;
            
            // Check if this student ID is already in the unique array
            const existingIndex = unique.findIndex(e => e.studentId === entry.studentId);
            if (existingIndex === -1) {
              // If not found, add to unique array
              unique.push(entry);
            }
            return unique;
          }, []);
          
          processedAssignments.push({
            ...assignment,
            badgeText: badgeText,
            color: getAssignmentColor(assignmentId),
            students: uniqueStudentEntries
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

  const renderAssignmentRow = (assignment, student, studentIndex) => {
    const color = assignment.color || getAssignmentColor(assignment.id);
    const badgeText = assignment.badgeText || extractAssignmentId(assignment.title);
    const timeRemaining = calculateTimeRemaining(assignment.dueDate);
    
    return (
      <React.Fragment key={`${assignment.id}-${student.studentId}-${studentIndex}`}>
        <tr
          onClick={() => handleRowClick(assignment.id, student.studentId)}
          className="clickable-row"
        >
          <td>{student.studentId}</td>
          <td>{student.studentName}</td>
          <td>
            <div className="assignment-title">
              <span 
                className="assignment-badge"
                style={{
                  backgroundColor: color.badge,
                  color: 'white'
                }}
              >
                {badgeText}
              </span>
              {assignment.title}
            </div>
          </td>
          <td>{assignment.dueDate ? new Date(assignment.dueDate).toLocaleDateString() : 'N/A'}</td>
          <td>
            <div className={`time-remaining ${timeRemaining.className}`}>
              {timeRemaining.text}
            </div>
          </td>
          <td>
            <span className={`status-badge ${student.status.toLowerCase().replace(' ', '-')}`}>
              {student.status}
            </span>
          </td>
          <td>{student.score || 'N/A'}</td>
        </tr>
        {studentIndex === assignment.students.length - 1 && (
          <tr key={`separator-${assignment.id}`}>
            <td colSpan="7" className="assignment-separator"></td>
          </tr>
        )}
      </React.Fragment>
    );
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
                <th>Student ID</th>
                <th>Student Name</th>
                <th>Assignment Title</th>
                <th>Due Date</th>
                <th>Time Remaining</th>
                <th>Status</th>
                <th>Score</th>
              </tr>
            </thead>
            <tbody>
              {error ? (
                <tr>
                  <td colSpan="7" className="error-cell">{error}</td>
                </tr>
              ) : assignments.length === 0 ? (
                <tr>
                  <td colSpan="7" className="empty-cell">No pending assignments found</td>
                </tr>
              ) : (
                assignments.map(assignment =>
                  assignment.students.map((student, index) =>
                    renderAssignmentRow(assignment, student, index)
                  )
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