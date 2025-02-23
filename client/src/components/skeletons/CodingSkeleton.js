'use client';

const CodingSkeleton = () => {
  return (
    <div className="coding-container">
      <div className="main-content">
        {/* Description Panel Skeleton */}
        <div className="description-panel skeleton">
          <div className="panel-header">
            <div className="skeleton-tabs">
              <div className="skeleton-tab shimmer"></div>
              <div className="skeleton-tab shimmer"></div>
            </div>
          </div>
          <div className="panel-content">
            <div className="skeleton-title shimmer"></div>
            <div className="skeleton-description shimmer"></div>
          </div>
        </div>

        {/* Editor Container Skeleton */}
        <div className="editor-container">
          <div className="code-editor skeleton">
            <div className="skeleton-header">
              <div className="skeleton-file-name shimmer"></div>
              <div className="skeleton-actions">
                <div className="skeleton-button shimmer"></div>
                <div className="skeleton-button shimmer"></div>
              </div>
            </div>
            <div className="skeleton-editor shimmer"></div>
          </div>

          {/* Console Skeleton */}
          <div className="skeleton-console">
            <div className="skeleton-console-header">
              <div className="skeleton-console-title shimmer"></div>
            </div>
            <div className="skeleton-console-content shimmer"></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CodingSkeleton; 