'use client';

const CodingSkeleton = () => {
  return (
    <div className="coding-container">
      <div className="main-content">
        {/* Description Panel Skeleton */}
        <div className="description-panel skeleton">
          <div className="panel-header">
            <div className="skeleton-tabs">
              <div className="skeleton-tab skeleton-element"></div>
              <div className="skeleton-tab skeleton-element"></div>
            </div>
          </div>
          <div className="panel-content">
            <div className="skeleton-title skeleton-element"></div>
            <div className="skeleton-description skeleton-element"></div>
          </div>
        </div>

        {/* Editor Container Skeleton */}
        <div className="editor-container">
          <div className="code-editor skeleton">
            <div className="skeleton-header">
              <div className="skeleton-file-name skeleton-element"></div>
              <div className="skeleton-actions">
                <div className="skeleton-button skeleton-element"></div>
                <div className="skeleton-button skeleton-element"></div>
              </div>
            </div>
            <div className="skeleton-editor"></div>
          </div>

          {/* Console Skeleton */}
          <div className="skeleton-console">
            <div className="skeleton-console-header">
              <div className="skeleton-console-title skeleton-element"></div>
            </div>
            <div className="skeleton-console-content"></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CodingSkeleton; 