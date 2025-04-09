import { useState, useEffect } from 'react';
import './assignment-detail.css';

const AssignmentDetail = ({ assignmentId, onBack }) => {
  const [assignment, setAssignment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedTab, setSelectedTab] = useState('Description');
  const [showStatus, setShowStatus] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  // Fetch assignment data
  useEffect(() => {
    const fetchAssignment = async () => {
      try {
        setLoading(true);
        const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
        const response = await fetch(`${API_BASE}/assignments/${assignmentId}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        });

        if (!response.ok) {
          throw new Error('Failed to fetch assignment details');
        }

        const data = await response.json();
        setAssignment(data);
      } catch (err) {
        setError(err.message);
        console.error('Error loading assignment:', err);
      } finally {
        setLoading(false);
      }
    };

    if (assignmentId) {
      fetchAssignment();
    }
  }, [assignmentId]);

  const handleInputChange = (field, value) => {
    setAssignment(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const response = await fetch(`${API_BASE}/assignments/${assignmentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          title: assignment.title,
          chapter: assignment.chapter,
          description: assignment.description,
          dueDate: assignment.dueDate,
          points: assignment.points,
          exercises: assignment.exercises
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update assignment');
      }

      setStatusMessage('Changes saved successfully!');
      setShowStatus(true);
      setTimeout(() => setShowStatus(false), 3000);
    } catch (err) {
      setError(err.message);
      setStatusMessage('Error saving changes: ' + err.message);
      setShowStatus(true);
      setTimeout(() => setShowStatus(false), 3000);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <div>Loading assignment details...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <div>Error: {error}</div>
        <button onClick={onBack} className="back-button">
          ← Back to Assignments
        </button>
      </div>
    );
  }

  if (!assignment) {
    return (
      <div className="not-found-container">
        <div>Assignment not found</div>
        <button onClick={onBack} className="back-button">
          ← Back to Assignments
        </button>
      </div>
    );
  }

  const codeTypes = [
    { id: 'coding', label: 'Coding' },
    { id: 'explain', label: 'Explain' },
    { id: 'fill', label: 'Fill in' }
  ];

  // Get the first exercise's type or default to 'coding'
  const codeType = assignment.exercises && assignment.exercises.length > 0
    ? assignment.exercises[0].type
    : 'coding';

  // Get starter code from first exercise or empty string
  const starterCode = assignment.exercises && assignment.exercises.length > 0
    ? assignment.exercises[0].starter_code || ''
    : '';

  return (
    <div className="coding-container">
      <div className="top-bar">
        <button onClick={onBack} className="back-button">
          ← Back to Assignments
        </button>
        <button onClick={handleSave} className="save-button">
          Save Changes
        </button>
      </div>

      <div className="main-content-detail">
        {/* Left Panel */}
        <div className="description-panel">
          <div className="panel-header">
            <div className="description-selector">
              <button
                className={`description-button ${selectedTab === 'Description' ? 'active' : ''}`}
                onClick={() => setSelectedTab('Description')}
              >
                Assignment Details
              </button>
              <button
                className={`description-button ${selectedTab === 'Settings' ? 'active' : ''}`}
                onClick={() => setSelectedTab('Settings')}
              >
                Settings
              </button>
            </div>
          </div>

          <div className="panel-content">
            {selectedTab === 'Description' ? (
              <div className="assignment-form">
                <div className="form-group">
                  <label>Title</label>
                  <input
                    type="text"
                    value={assignment.title}
                    onChange={(e) => handleInputChange('title', e.target.value)}
                    className="form-input"
                    placeholder="Enter assignment title"
                  />
                </div>

                <div className="form-group">
                  <label>Chapter</label>
                  <input
                    type="text"
                    value={assignment.chapter}
                    onChange={(e) => handleInputChange('chapter', e.target.value)}
                    className="form-input"
                    placeholder="Enter chapter"
                  />
                </div>

                <div className="form-group">
                  <label>Description</label>
                  <textarea
                    value={assignment.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    className="form-textarea"
                    rows="8"
                    placeholder="Enter assignment description"
                  />
                </div>

                <div className="form-group">
                  <label>Test Cases</label>
                  <textarea
                    value={assignment.exercises && assignment.exercises.length > 0
                      ? assignment.exercises[0].test_cases || ''
                      : ''}
                    onChange={(e) => {
                      const updatedExercises = [...(assignment.exercises || [])];
                      if (updatedExercises.length > 0) {
                        updatedExercises[0].test_cases = e.target.value;
                      } else {
                        updatedExercises.push({
                          id: 1,
                          title: "Exercise 1",
                          description: "Complete the exercise",
                          type: "coding",
                          points: assignment.points || 10,
                          test_cases: e.target.value
                        });
                      }
                      handleInputChange('exercises', updatedExercises);
                    }}
                    className="form-textarea"
                    rows="6"
                    placeholder="Enter test cases"
                  />
                </div>
              </div>
            ) : (
              <div className="assignment-settings">
                <div className="form-group">
                  <label>Due Date</label>
                  <input
                    type="datetime-local"
                    value={new Date(assignment.dueDate).toISOString().slice(0, 16)}
                    onChange={(e) => handleInputChange('dueDate', e.target.value)}
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label>Points</label>
                  <input
                    type="number"
                    value={assignment.points}
                    onChange={(e) => handleInputChange('points', parseInt(e.target.value))}
                    className="form-input"
                    min="0"
                    placeholder="Enter points"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Panel - Code Editor */}
        <div className="editor-container">
          <div className="code-editor">
            <div className="panel-header">
              <div className="editor-top">
                <span className="editor-title"></span>
                <div className="code-type-selector">
                  {codeTypes.map(type => (
                    <button
                      key={type.id}
                      className={`code-type-button ${codeType === type.id ? 'active' : ''}`}
                      onClick={() => {
                        const updatedExercises = [...(assignment.exercises || [])];
                        if (updatedExercises.length > 0) {
                          updatedExercises[0].type = type.id;
                        } else {
                          updatedExercises.push({
                            id: 1,
                            title: "Exercise 1",
                            description: "Complete the exercise",
                            type: type.id,
                            points: assignment.points || 10
                          });
                        }
                        handleInputChange('exercises', updatedExercises);
                      }}
                    >
                      {type.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="code-area-wrapper">
              <textarea
                value={starterCode}
                onChange={(e) => {
                  const updatedExercises = [...(assignment.exercises || [])];
                  if (updatedExercises.length > 0) {
                    updatedExercises[0].starter_code = e.target.value;
                  } else {
                    updatedExercises.push({
                      id: 1,
                      title: "Exercise 1",
                      description: "Complete the exercise",
                      type: "coding",
                      points: assignment.points || 10,
                      starter_code: e.target.value
                    });
                  }
                  handleInputChange('exercises', updatedExercises);
                }}
                className="code-area"
                spellCheck="false"
                placeholder="Enter starter code for students..."
              />
            </div>
          </div>
        </div>
      </div>

      {/* Status Message */}
      <div className={`status-message ${showStatus ? 'show' : ''}`}>
        {statusMessage}
      </div>
    </div>
  );
};

export default AssignmentDetail;
