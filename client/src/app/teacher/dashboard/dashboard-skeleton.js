'use client';

const DashboardSkeleton = () => {
  return (
    <div className="dashboard-container">
      {/* Stats skeletons */}
      <div className="stats-container skeleton-stats">
        {[1, 2, 3, 4].map((item) => (
          <div key={item} className="stat-card skeleton-stat">
            <div className="skeleton-stat-title"></div>
            <div className="skeleton-stat-value"></div>
          </div>
        ))}
      </div>
      
      {/* Main content skeleton */}
      <div className="main-content-dashboard">
        <div className="table-container skeleton-table-container">
          <div className="table-header">
            <div className="header-content">
              <div>
                <div className="skeleton-table-title"></div>
                <div className="skeleton-table-subtitle"></div>
              </div>
            </div>
          </div>
          
          {/* Search controls skeleton */}
          <div className="skeleton-controls">
            <div className="skeleton-search"></div>
            <div className="skeleton-dropdown"></div>
          </div>
          
          {/* Table skeleton */}
          <div className="skeleton-table-wrap">
            <div className="skeleton-table-header">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="skeleton-th">
                  <div className="skeleton-text"></div>
                </div>
              ))}
            </div>
            <div className="skeleton-table-body">
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
          
          {/* Pagination skeleton */}
          <div className="skeleton-pagination">
            <div className="skeleton-pagination-info"></div>
            <div className="skeleton-pagination-controls"></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardSkeleton; 