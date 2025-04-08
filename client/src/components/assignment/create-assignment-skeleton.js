import './create-assignment.css';

const CreateAssignmentSkeleton = () => {
  return (
    <div className="coding-container create-assignment-container">
      <div className="top-bar skeleton-top-bar">
        <div className="skeleton-back-button"></div>
        <div className="skeleton-save-button"></div>
      </div>

      <div className="main-content-detail">
        {/* Left Panel */}
        <div className="description-panel">
          <div className="panel-header">
            <div className="skeleton-selector"></div>
          </div>

          <div className="panel-content">
            <div className="assignment-form">
              <div className="form-group">
                <div className="skeleton-label"></div>
                <div className="skeleton-input"></div>
              </div>

              <div className="form-group">
                <div className="skeleton-label"></div>
                <div className="skeleton-input"></div>
              </div>

              <div className="form-group">
                <div className="skeleton-label"></div>
                <div className="skeleton-textarea"></div>
              </div>

              <div className="form-group">
                <div className="skeleton-label"></div>
                <div className="skeleton-input"></div>
              </div>

              <div className="form-group">
                <div className="skeleton-label"></div>
                <div className="skeleton-input"></div>
              </div>

              <div className="form-group">
                <div className="skeleton-label"></div>
                <div className="skeleton-tabs">
                  <div className="skeleton-tab"></div>
                  <div className="skeleton-tab"></div>
                  <div className="skeleton-add"></div>
                </div>
              </div>

              <div className="form-group">
                <div className="skeleton-label"></div>
                <div className="skeleton-input"></div>
              </div>
              
              <div className="form-group">
                <div className="skeleton-label"></div>
                <div className="skeleton-textarea"></div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel */}
        <div className="editor-container">
          <div className="code-editor">
            <div className="panel-header">
              <div className="skeleton-type-selector">
                <div className="skeleton-type-button"></div>
                <div className="skeleton-type-button"></div>
                <div className="skeleton-type-button"></div>
              </div>
            </div>
            <div className="code-area-wrapper skeleton-code-area">
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateAssignmentSkeleton; 