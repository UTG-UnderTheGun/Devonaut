'use client'

import React, { useState } from 'react';
import './section.css';
import SectionDetail from './section-detail';

const SectionView = ({ data, sortConfig, onSort, loading }) => {
  const [selectedSection, setSelectedSection] = useState(null);

  const handleSectionClick = (section) => {
    setSelectedSection(section);
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
        {data.map((section) => (
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
                <span className="detail-label">Schedule</span>
                <span className="detail-value">{section.schedule}</span>
              </div>
              
              <div className="detail-item">
                <span className="detail-label">Progress</span>
                <div className="progress-bar">
                  <div 
                    className="progress-fill" 
                    style={{ width: `${section.completionRate}%` }}
                  />
                </div>
                <span className="progress-text">{section.completionRate}% Complete</span>
              </div>

              <div className="section-stats">
                <div className="stat-item">
                  <span className="stat-value">{section.assignmentsCompleted}</span>
                  <span className="stat-label">Completed</span>
                </div>
                <div className="stat-item">
                  <span className="stat-value">{section.assignmentsPending}</span>
                  <span className="stat-label">Pending</span>
                </div>
                <div className="stat-item">
                  <span className="stat-value">{section.averageScore.toFixed(1)}</span>
                  <span className="stat-label">Avg. Score</span>
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