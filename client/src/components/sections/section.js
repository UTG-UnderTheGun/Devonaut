'use client'

import React, { useState, useEffect } from 'react';
import './section.css';
import SectionDetail from './section-detail';
import axios from 'axios';

// Mock data for sections
const mockSections = [
  {
    id: '760001',
    totalStudents: 0,
    students: []
  },
  {
    id: '760002',
    totalStudents: 0,
    students: []
  }
];

const SectionView = () => {
  const [sections, setSections] = useState(mockSections);
  const [selectedSection, setSelectedSection] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSections = async () => {
      try {
        console.log('Fetching sections from user endpoint...');
        
        // เรียกใช้ API แบบมี credentials เพื่อส่ง cookies
        const response = await axios.get('/api/v1/users/students-by-section', {
          withCredentials: true
        });
        
        console.log('Raw API response:', response);
        console.log('Raw API response data:', response.data);
        
        // รับข้อมูล section จาก API
        let sectionsData = Array.isArray(response.data) ? response.data : [];
        
        console.log('Sections data after array check:', sectionsData);
        
        // กรองเฉพาะ section ที่มี id ที่ต้องการ (760001 และ 760002)
        sectionsData = sectionsData.filter(section => 
          section.id === '760001' || section.id === '760002'
        );
        
        console.log('Filtered sections data:', sectionsData);
        
        if (sectionsData && sectionsData.length > 0) {
          // ตรวจสอบว่าแต่ละ section มี students array หรือไม่
          sectionsData = sectionsData.map(section => {
            // ตรวจสอบข้อมูล section และแสดงรายละเอียด
            console.log(`Section ${section.id}:`, section);
            console.log(`Section ${section.id} students:`, section.students);
            
            // ถ้าไม่มี students array หรือเป็น null ให้กำหนดเป็น array ว่าง
            if (!section.students || !Array.isArray(section.students)) {
              section.students = [];
            }
            
            // กำหนด totalStudents ตามจำนวนนักเรียนจริง
            section.totalStudents = section.students.length;
            
            return section;
          });
          
          console.log('Final sections data with students:', sectionsData);
          setSections(sectionsData);
        } else {
          console.log('No valid sections found, using mock data');
          setSections([...mockSections]);
        }
      } catch (error) {
        console.error('Error fetching sections:', error);
        setSections([...mockSections]); // Fallback to mock data on error
      } finally {
        setLoading(false);
      }
    };

    fetchSections();
  }, []);

  const handleSectionClick = (section) => {
    console.log('Selected section with students:', section);
    setSelectedSection({...section}); // ใช้ shallow copy เพื่อให้แน่ใจว่าข้อมูลถูกส่งไปครบถ้วน
  };

  const handleBackClick = () => {
    setSelectedSection(null);
  };

  if (selectedSection) {
    return (
      <div className="sections-container">
        <button onClick={handleBackClick} className="back-btn">← Back to Sections</button>
        <SectionDetail section={selectedSection} />
      </div>
    );
  }

  return (
    <div className="sections-container">
      {loading && (
        <div className="loading-overlay">
          <div className="loading-spinner" />
        </div>
      )}
      
      <div className="sections-grid">
        {sections.map((section) => (
          <div 
            key={section.id} 
            className="section-card"
            onClick={() => handleSectionClick(section)}
            style={{ cursor: 'pointer' }}
          >
            <div className="section-header">
              <h3 className="section-title">Section {section.id}</h3>
              <span className="student-count">{section.totalStudents} Students</span>
            </div>
            
            <div className="section-details">
              <div className="detail-item">
                <span className="detail-label">Students</span>
                <span className="detail-value">{section.totalStudents}</span>
              </div>
              
              <div className="detail-item">
                <span className="detail-label">Progress</span>
                <div className="progress-bar">
                  <div 
                    className="progress-fill" 
                    style={{ width: `${section.totalStudents > 0 ? 100 : 0}%` }}
                  />
                </div>
                <span className="progress-text">{section.totalStudents > 0 ? '100%' : '0%'} Complete</span>
              </div>

              <div className="section-stats">
                <div className="stat-item">
                  <span className="stat-value">{section.totalStudents}</span>
                  <span className="stat-label">Total</span>
                </div>
                <div className="stat-item">
                  <span className="stat-value">0</span>
                  <span className="stat-label">Pending</span>
                </div>
                <div className="stat-item">
                  <span className="stat-value">0</span>
                  <span className="stat-label">Total Score</span>
                </div>
              </div>
            </div>

            <div className="section-footer">
              <button className="view-details-btn">View Details</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SectionView;