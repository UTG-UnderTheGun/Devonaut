import React, { useState, useEffect } from 'react';
import './section-detail.css';
import StudentDetailModal from '@/components/tables/student-detail';
import axios from 'axios';

const TableSkeleton = () => {
  return (
    <div className="skeleton-table">
      <div className="skeleton-header">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="skeleton-th">
            <div className="skeleton-text"></div>
          </div>
        ))}
      </div>
      <div className="skeleton-body">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="skeleton-row">
            {[1, 2, 3, 4, 5].map(j => (
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

const SectionDetail = ({ section }) => {
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [students, setStudents] = useState([]);

  useEffect(() => {
    if (showModal) {
      document.body.classList.add('modal-open');
    } else {
      document.body.classList.remove('modal-open');
    }
    return () => document.body.classList.remove('modal-open');
  }, [showModal]);

  useEffect(() => {
    const getStudentsFromSection = () => {
      console.log('Section detail received section:', section);
      
      // สำเนาข้อมูล section ป้องกันการอ้างอิงถึงข้อมูลเดิม
      const sectionCopy = section ? {...section} : null;
      
      if (sectionCopy && sectionCopy.students && Array.isArray(sectionCopy.students) && sectionCopy.students.length > 0) {
        console.log('Using students array from section:', sectionCopy.students);
        setStudents(sectionCopy.students);
      } else {
        console.log('No students array in section or empty array');
        setStudents([]);
        
        // ถ้าไม่มีข้อมูลนักเรียนใน section และมี section id, ลองดึงข้อมูลจาก API
        if (sectionCopy && sectionCopy.id) {
          fetchStudentsBySection(sectionCopy.id);
        }
      }
    };
    
    getStudentsFromSection();
  }, [section]);
  
  // ฟังก์ชั่นดึงข้อมูลนักเรียนจาก API โดยตรง ในกรณีที่ไม่มีข้อมูลใน section
  const fetchStudentsBySection = async (sectionId) => {
    try {
      setLoading(true);
      console.log('Fetching students directly for section:', sectionId);
      
      // ดึงข้อมูล sections ทั้งหมดแล้วกรองเฉพาะที่ต้องการ
      const response = await axios.get('/api/v1/users/students-by-section', {
        withCredentials: true
      });
      
      console.log('Direct API response:', response.data);
      
      const sectionsData = Array.isArray(response.data) ? response.data : [];
      const targetSection = sectionsData.find(s => String(s.id) === String(sectionId));
      
      if (targetSection && targetSection.students && Array.isArray(targetSection.students)) {
        console.log('Found students in API response:', targetSection.students);
        setStudents(targetSection.students);
      } else {
        console.log('No students found in API response for section:', sectionId);
        setStudents([]);
      }
    } catch (error) {
      console.error('Error fetching students by section:', error);
      setStudents([]);
    } finally {
      setLoading(false);
    }
  };

  const handleRowClick = (student) => {
    console.log('Student clicked:', student);
    setSelectedStudent(student);
    setShowModal(true);
  };

  if (!section) return null;

  // Calculate section totals
  const totalStudents = students.length;

  const EmptyState = () => (
    <div className="empty-state">
      <div className="empty-icon">👨‍🎓</div>
      <h3>No Students Found</h3>
      <p>There are no students assigned to this section.</p>
    </div>
  );

  return (
    <div className="section-detail">
      {showModal && (
        <StudentDetailModal 
          student={selectedStudent}
          loading={false}
          onClose={() => {
            setShowModal(false);
            setSelectedStudent(null);
          }}
        />
      )}

      <div className="section-detail-header">
        <div className="header-left">
          <h2>Section {section.id}</h2>
        </div>
        <div className="header-right">
          <span className="student-count">
            {totalStudents} Students
          </span>
        </div>
      </div>
      
      <div className="section-detail-content">
        <div className="progress-section">
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ width: `${totalStudents > 0 ? 100 : 0}%` }}
            />
          </div>
          <span className="progress-text">{totalStudents > 0 ? '100%' : '0%'} Complete</span>
        </div>

        <div className="stats-grid-section">
          <div className="stat-box">
            <span className="stat-value">{totalStudents}</span>
            <span className="stat-label">Total Students</span>
          </div>
          <div className="stat-box">
            <span className="stat-value">0</span>
            <span className="stat-label">Pending</span>
          </div>
          <div className="stat-box">
            <span className="stat-value">0</span>
            <span className="stat-label">Total Score</span>
          </div>
        </div>

        <div className="students-table">
          <h3>Enrolled Students ({totalStudents})</h3>
          <div className="table-wrapper">
            {loading ? (
              <TableSkeleton />
            ) : students.length === 0 ? (
              <EmptyState />
            ) : (
              <table className="student-table">
                <thead>
                  <tr>
                    <th>Student ID</th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Section</th>
                    <th>Skill Level</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((student, index) => (
                    <tr 
                      key={student.id || `student-${index}`}
                      className={`${index % 2 === 1 ? 'alternate' : ''} clickable-row`}
                      onClick={() => handleRowClick(student)}
                    >
                      <td>{student.id || 'N/A'}</td>
                      <td>{student.name || 'Unknown'}</td>
                      <td>{student.email || 'N/A'}</td>
                      <td>{student.section || 'N/A'}</td>
                      <td>{student.skill_level || 'N/A'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SectionDetail;