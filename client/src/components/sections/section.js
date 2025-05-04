'use client'

import React, { useState, useEffect } from 'react';
import './section.css';
import SectionDetail from './section-detail';
import axios from 'axios';

// Static data for sections - always use 2 sections
const staticSections = [
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
  const [sections, setSections] = useState(staticSections);
  const [selectedSection, setSelectedSection] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Set loading to false immediately since we're using static data
    setLoading(false);
    
    // No need to fetch, just use static data
    console.log('Using static section data');
    setSections(staticSections);
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