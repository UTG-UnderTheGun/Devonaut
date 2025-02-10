// components/skeletons/TableSkeleton.js
'use client'

import './skeleton.css';

export const TableSkeleton = () => {
  return (
    <div className="table-wrapper">
      {[...Array(5)].map((_, index) => (
        <div key={index} className="skeleton-table-row">
          <div className="skeleton-cell skeleton-cell-sm skeleton" />
          <div className="skeleton-cell skeleton-cell-lg skeleton" />
          <div className="skeleton-cell skeleton-cell-md skeleton" />
          <div className="skeleton-score-bar">
            <div className="skeleton-bar skeleton" />
            <div className="skeleton-cell skeleton-cell-sm skeleton" />
          </div>
        </div>
      ))}
    </div>
  );
};

// components/skeletons/DetailSkeleton.js
export const DetailSkeleton = () => {
  return (
    <div className="skeleton-modal">
      <div className="skeleton-modal-header">
        <div className="skeleton-modal-title skeleton" />
      </div>
      
      <div className="skeleton-modal-content">
        {/* Personal Information Section */}
        <div className="skeleton-section">
          <div className="skeleton-section-title skeleton" />
          <div className="skeleton-info-grid">
            {[...Array(4)].map((_, index) => (
              <div key={index} className="skeleton-info-item">
                <div className="skeleton-label skeleton" />
                <div className="skeleton-value skeleton" />
              </div>
            ))}
          </div>
        </div>

        {/* Academic Progress Section */}
        <div className="skeleton-section">
          <div className="skeleton-section-title skeleton" />
          <div className="skeleton-stats-grid">
            {[...Array(3)].map((_, index) => (
              <div key={index} className="skeleton-stat-card">
                <div className="skeleton-stat-value skeleton" />
                <div className="skeleton-stat-label skeleton" />
              </div>
            ))}
          </div>
        </div>

        {/* Assignment History Section */}
        <div className="skeleton-section">
          <div className="skeleton-section-title skeleton" />
          <table className="skeleton-table">
            <thead>
              <tr className="skeleton-table-header">
                {[...Array(4)].map((_, index) => (
                  <th key={index} className="skeleton-table-cell">
                    <div className="skeleton-cell skeleton-cell-md skeleton" />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...Array(4)].map((_, rowIndex) => (
                <tr key={rowIndex}>
                  {[...Array(4)].map((_, cellIndex) => (
                    <td key={cellIndex} className="skeleton-table-cell">
                      <div className="skeleton-cell skeleton-cell-md skeleton" />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
