'use client';
import './skeleton.css';

export default function DashboardSkeleton() {
  return (
    <div className="dashboard">
      <nav className="tabs skeleton-tabs">
        <div className="tab-container skeleton-tab-container">
          <div className="skeleton-tab-indicator"></div>
          <div className="skeleton-tab"></div>
          <div className="skeleton-tab"></div>
          <div className="skeleton-tab"></div>
        </div>
      </nav>

      <main className="dashboard-content">
        <section className="assignments skeleton-section">
          <div className="section-header skeleton-header">
            <div className="skeleton-title"></div>
            <div className="skeleton-subtitle"></div>
          </div>
          
          <div className="assignment-list">
            {[1, 2, 3].map((item) => (
              <div key={item} className="skeleton-card">
                <div className="skeleton-card-header">
                  <div className="skeleton-card-info">
                    <div className="skeleton-title-row">
                      <div className="skeleton-icon"></div>
                      <div className="skeleton-title"></div>
                    </div>
                    <div className="skeleton-meta">
                      <div className="skeleton-meta-item"></div>
                      <div className="skeleton-meta-item"></div>
                      <div className="skeleton-meta-item"></div>
                    </div>
                    <div className="skeleton-progress">
                      <div className="skeleton-progress-bar"></div>
                      <div className="skeleton-progress-text"></div>
                    </div>
                  </div>
                  <div className="skeleton-actions">
                    <div className="skeleton-points"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="performance skeleton-section">
          <div className="section-header2 skeleton-header">
            <div className="skeleton-title"></div>
            <div className="skeleton-score"></div>
          </div>

          <div className="progress-container">
            {[1, 2, 3, 4].map((item) => (
              <div key={item} className="progress-row skeleton-progress-row">
                <div className="skeleton-progress-info">
                  <div className="skeleton-progress-label"></div>
                  <div className="skeleton-progress-title"></div>
                </div>
                <div className="skeleton-progress-bar"></div>
                <div className="skeleton-progress-score"></div>
              </div>
            ))}
            
            <div className="progress-row total skeleton-progress-row">
              <div className="skeleton-progress-info">
                <div className="skeleton-progress-label"></div>
              </div>
              <div className="skeleton-progress-bar"></div>
              <div className="skeleton-progress-score"></div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
} 