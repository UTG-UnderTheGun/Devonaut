import { useState, useEffect } from 'react';
import './assignment-detail.css';


const AssignmentEdit = ({ onBack }) => {
  const [assignment, setAssignment] = useState({
    title: 'For Loop Assignment',
    description: `Write a function that calculates the sum of even numbers in a list.

Requirements:
1. Function should take a list of numbers as input
2. Calculate sum of all even numbers
3. Return the final sum
4. Handle empty list case (return 0)
5. Handle no even numbers case (return 0)`,
    chapter: 'Chapter 6: Loops',
    dueDate: '2025-02-14T23:59',
    points: 10,
    codeType: 'coding',
    starterCode: `def sum_even_numbers(numbers):
    # Your code here
    total = 0
    # TODO: Calculate sum of even numbers
    return total`,
    testCases: `Example Test Cases:
Input: [1, 2, 3, 4, 5, 6]
Output: 12
Explanation: 2 + 4 + 6 = 12

Input: [1, 3, 5]
Output: 0
Explanation: No even numbers`
  });

  const [selectedTab, setSelectedTab] = useState('Description');
  const [showStatus, setShowStatus] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  const handleInputChange = (field, value) => {
    setAssignment(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = () => {
    setStatusMessage('Changes saved successfully!');
    setShowStatus(true);
    setTimeout(() => setShowStatus(false), 3000);
  };

  const codeTypes = [
    { id: 'coding', label: 'Coding' },
    { id: 'explain', label: 'Explain' },
    { id: 'fill', label: 'Fill in' }
  ];

  const detailType =[
    {id:'description', label:'Description'},
    {id:'setting', label:'Setting'}
  ];

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
                    value={assignment.testCases}
                    onChange={(e) => handleInputChange('testCases', e.target.value)}
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
                    value={assignment.dueDate}
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
                      className={`code-type-button ${assignment.codeType === type.id ? 'active' : ''}`}
                      onClick={() => handleInputChange('codeType', type.id)}
                    >
                      {type.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="code-area-wrapper">
              <textarea
                value={assignment.starterCode}
                onChange={(e) => handleInputChange('starterCode', e.target.value)}
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

export default AssignmentEdit;