import { useState, useEffect } from 'react';
import './assignment-detail.css';

const AssignmentDetail = ({ assignmentId, onBack }) => {
  const [assignment, setAssignment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentExercise, setCurrentExercise] = useState(0);
  const [showStatus, setShowStatus] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  const [sections, setSections] = useState([]);
  const [students, setStudents] = useState([]);
  const [showAssignmentSettings, setShowAssignmentSettings] = useState(false);
  



  // Fetch assignment data
  useEffect(() => {
    const fetchAssignment = async () => {
      try {
        setLoading(true);
        const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
        console.log(`Fetching assignment with ID: ${assignmentId} from ${API_BASE}`);

        const response = await fetch(`${API_BASE}/assignments/${assignmentId}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        });

        console.log(`Response status: ${response.status}`);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error(`Server error: ${errorText}`);
          throw new Error(`Failed to fetch assignment details: ${response.status} ${errorText}`);
        }

        const data = await response.json();
        console.log(`Assignment data loaded successfully:`, data);
        setAssignment(data);
      } catch (err) {
        console.error('Error loading assignment:', err);
        
        // Handle CORS errors specifically
        if (err.message && err.message.includes('Failed to fetch')) {
          setError('Network error: Could not connect to the server. This might be a CORS issue or the server is down.');
        } else {
          setError(err.message);
        }
      } finally {
        setLoading(false);
      }
    };

    if (assignmentId) {
      fetchAssignment();
    }
  }, [assignmentId]);

  // Fetch sections and students
  useEffect(() => {
    const fetchData = async () => {
      try {
        const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
        
        // Fetch sections
        console.log("Fetching sections...");
        const sectionsResponse = await fetch(`${API_BASE}/teacher/sections`, {
          credentials: 'include',
        });
        
        if (sectionsResponse.ok) {
          const sectionsData = await sectionsResponse.json();
          console.log("Sections loaded:", sectionsData);
          setSections(sectionsData);
        } else {
          console.error("Failed to fetch sections:", await sectionsResponse.text());
          setSections([]);
        }
        
        // Fetch students
        console.log("Fetching students...");
        const studentsResponse = await fetch(`${API_BASE}/users/students`, {
          credentials: 'include',
        });
        
        if (studentsResponse.ok) {
          const data = await studentsResponse.json();
          console.log("Student data response:", data);
          
          // Handle both possible data structures
          let studentList = [];
          if (data && Array.isArray(data)) {
            studentList = data;
          } else if (data && data.users && Array.isArray(data.users)) {
            studentList = data.users;
          }
          
          console.log("Processed student list:", studentList);
          setStudents(studentList);
        } else {
          console.error("Failed to fetch students:", await studentsResponse.text());
          setStudents([]);
        }
      } catch (err) {
        console.error("Error fetching data:", err);
        setError(err.message);
      }
    };
    
    fetchData();
  }, []);

  const handleInputChange = (field, value) => {
    setAssignment(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleExerciseChange = (field, value) => {
    const updatedExercises = [...(assignment.exercises || [])];
    updatedExercises[currentExercise] = {
      ...updatedExercises[currentExercise],
      [field]: value
    };
    setAssignment(prev => ({
      ...prev,
      exercises: updatedExercises
    }));
  };

  const handleAddExercise = () => {
    const newId = `exercise_${Date.now()}`;
    
    // Find the highest exercise number in the existing exercises
    let maxNumber = 0;
    if (assignment.exercises) {
      assignment.exercises.forEach(ex => {
        const match = ex.title.match(/Exercise\s+(\d+)/);
        if (match && match[1]) {
          const num = parseInt(match[1], 10);
          if (!isNaN(num) && num > maxNumber) {
            maxNumber = num;
          }
        }
      });
    }
    
    const newExercise = {
      id: newId,
      title: `Exercise ${maxNumber + 1}`,
      description: "Complete the exercise",
      type: "coding",
      points: 5,
      starter_code: "",
      test_cases: ""
    };
    
    setAssignment(prev => ({
      ...prev,
      exercises: [...(prev.exercises || []), newExercise]
    }));
    setCurrentExercise(assignment.exercises ? assignment.exercises.length : 0);
  };

  const handleRemoveExercise = (index) => {
    if (!assignment.exercises || assignment.exercises.length <= 1) {
      setStatusMessage("Assignment must have at least one exercise");
      setShowStatus(true);
      setTimeout(() => setShowStatus(false), 3000);
      return;
    }
    
    const updatedExercises = assignment.exercises.filter((_, i) => i !== index);
    
    // Update the current exercise index if needed
    let newCurrentExercise = currentExercise;
    if (currentExercise >= updatedExercises.length) {
      newCurrentExercise = updatedExercises.length - 1;
    } else if (currentExercise === index) {
      // If we're removing the current exercise, stay on the same index
      // (which will now point to the next exercise)
      // unless it was the last one
      if (newCurrentExercise >= updatedExercises.length) {
        newCurrentExercise = updatedExercises.length - 1;
      }
    } else if (currentExercise > index) {
      // If we're removing an exercise before the current one, 
      // decrement the current index
      newCurrentExercise = currentExercise - 1;
    }
    
    setAssignment(prev => ({
      ...prev,
      exercises: updatedExercises
    }));
    
    setCurrentExercise(newCurrentExercise);
  };

  const handleSave = async () => {
    if (!assignment || !assignment.title || !assignment.chapter || !assignment.dueDate || !assignment.exercises || assignment.exercises.length === 0) {
      setError('Please fill in all required fields and add at least one exercise');
      setStatusMessage('Please fill in all required fields and add at least one exercise');
      setShowStatus(true);
      setTimeout(() => setShowStatus(false), 3000);
      return;
    }

    try {
      setLoading(true);

      // Format the request body with assignment targeting info
      const requestBody = {
        ...assignment,
        assignmentType: assignment.assignmentType || 'all', // Include the assignment type
        selectedStudents: assignment.assignmentType === 'specific' ? assignment.selectedStudents : [],
        selectedSections: assignment.assignmentType === 'section' ? assignment.selectedSections : []
      };

      const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const response = await fetch(`${API_BASE}/assignments/${assignmentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(requestBody),
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

  const toggleStudentSelection = (studentId) => {
    setAssignment(prev => {
      const selectedStudents = [...(prev.selectedStudents || [])];
      if (selectedStudents.includes(studentId)) {
        return {
          ...prev,
          selectedStudents: selectedStudents.filter(id => id !== studentId)
        };
      } else {
        return {
          ...prev,
          selectedStudents: [...selectedStudents, studentId]
        };
      }
    });
  };

  const toggleSectionSelection = (sectionId) => {
    setAssignment(prev => {
      const selectedSections = [...(prev.selectedSections || [])];
      if (selectedSections.includes(sectionId)) {
        return {
          ...prev,
          selectedSections: selectedSections.filter(id => id !== sectionId)
        };
      } else {
        return {
          ...prev,
          selectedSections: [...selectedSections, sectionId]
        };
      }
    });
  };
  
  // Function to get placeholder text based on exercise type
  const getPlaceholderForType = (type) => {
    switch(type) {
      case 'coding':
        return `# Example for a coding exercise:

def calculate_sum(numbers):
    # Student will implement this function to calculate the sum of numbers
    pass

# You can provide test cases like:
# assert calculate_sum([1, 2, 3]) == 6
# assert calculate_sum([-1, 1]) == 0`;

      case 'explain':
        return `# Example for an explanation exercise:

# Students will need to explain what this code does
numbers = [1, 2, 3, 4, 5]
result = [x * x for x in numbers if x % 2 == 0]
print(result)  # Output: [4, 16]

# They should explain concepts like list comprehension, 
# conditionals, and what the final result represents.`;

      case 'fill':
        return `# Example for a fill-in-the-blanks exercise:
# Use ___ to indicate blanks

def binary_search(arr, target):
    left = 0
    right = ___  # Student should fill: len(arr) - 1
    
    while left <= right:
        mid = ___  # Student should fill: (left + right) // 2
        
        if arr[mid] == target:
            return mid
        elif arr[mid] < target:
            left = ___  # Student should fill: mid + 1
        else:
            right = ___  # Student should fill: mid - 1
            
    return -1`;

      default:
        return "Enter starter code for students...";
    }
  };

  const codeTypes = [
    { id: 'coding', label: 'Coding' },
    { id: 'explain', label: 'Explain' },
    { id: 'fill', label: 'Fill in' }
  ];

  if (loading && !assignment) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <div>Loading assignment details...</div>
      </div>
    );
  }

  if (error && !assignment) {
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

  // Ensure exercises array exists
  if (!assignment.exercises) {
    assignment.exercises = [{
      id: 1,
      title: "Exercise 1",
      description: "Complete the exercise",
      type: "coding",
      points: 5,
      starter_code: "",
      test_cases: ""
    }];
  }

  // Ensure assignment type and related arrays exist
  if (!assignment.assignmentType) {
    assignment.assignmentType = "all";
  }
  if (!assignment.selectedStudents) {
    assignment.selectedStudents = [];
  }
  if (!assignment.selectedSections) {
    assignment.selectedSections = [];
  }

  const currentExerciseData = assignment.exercises[currentExercise];

  return (
    <div className="coding-container">
      <div className="top-bar">
        <button onClick={onBack} className="back-button">
          ← Back to Assignments
        </button>
        <div className="action-buttons">
          <button onClick={handleSave} className="save-button" disabled={loading}>
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      <div className="main-content-detail">
        {/* Left Panel */}
        <div className="description-panel">
          <div className="panel-header">
            <div className="description-selector">
              <button 
                className={`description-button ${!showAssignmentSettings ? 'active' : ''}`}
                onClick={() => setShowAssignmentSettings(false)}
              >
                Assignment Details
              </button>
              <button 
                className={`description-button ${showAssignmentSettings ? 'active' : ''}`}
                onClick={() => setShowAssignmentSettings(true)}
              >
                Assign To
              </button>
            </div>
          </div>

          <div className="panel-content">
            {!showAssignmentSettings ? (
              <div className="assignment-form">
                <div className="form-group">
                  <label>Title <span className="required">*</span></label>
                  <input
                    type="text"
                    value={assignment.title}
                    onChange={(e) => handleInputChange('title', e.target.value)}
                    className="form-input"
                    placeholder="Enter assignment title"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Chapter <span className="required">*</span></label>
                  <input
                    type="text"
                    value={assignment.chapter}
                    onChange={(e) => handleInputChange('chapter', e.target.value)}
                    className="form-input"
                    placeholder="Enter chapter (e.g. Chapter 3: Loops)"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Description</label>
                  <textarea
                    value={assignment.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    className="form-textarea"
                    rows="4"
                    placeholder="Enter assignment description"
                  />
                </div>

                <div className="form-group">
                  <label>Due Date <span className="required">*</span></label>
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
                  <label>Assign to</label>
                  <div className="assignment-type-options">
                    <label className="radio-label">
                      <input
                        type="radio"
                        name="assignmentType"
                        value="all"
                        checked={assignment.assignmentType === "all"}
                        onChange={() => handleInputChange('assignmentType', 'all')}
                      />
                      All Students
                    </label>
                    <label className="radio-label">
                      <input
                        type="radio"
                        name="assignmentType"
                        value="section"
                        checked={assignment.assignmentType === "section"}
                        onChange={() => handleInputChange('assignmentType', 'section')}
                      />
                      Specific Sections
                    </label>
                    <label className="radio-label">
                      <input
                        type="radio"
                        name="assignmentType"
                        value="specific"
                        checked={assignment.assignmentType === "specific"}
                        onChange={() => handleInputChange('assignmentType', 'specific')}
                      />
                      Specific Students
                    </label>
                  </div>
                </div>

                {assignment.assignmentType === "section" && (
                  <div className="form-group">
                    <label>Select Sections</label>
                    <div className="selection-list">
                      {sections.length > 0 ? (
                        sections.map(section => (
                          <div key={section.id} className="selection-item">
                            <label className="checkbox-label">
                              <input
                                type="checkbox"
                                checked={assignment.selectedSections.includes(section.id)}
                                onChange={() => toggleSectionSelection(section.id)}
                              />
                              {section.name}
                            </label>
                          </div>
                        ))
                      ) : (
                        <div className="no-items">No sections available</div>
                      )}
                    </div>
                  </div>
                )}

                {assignment.assignmentType === "specific" && (
                  <div className="form-group">
                    <label>Select Students ({students ? students.length : 0})</label>
                    <input
                      type="text"
                      className="search-input"
                      placeholder="Search students by name or section..."
                      onChange={(e) => {
                        // TODO: Add student filtering
                      }}
                    />
                    <div className="selection-list">
                      {students && students.length > 0 ? (
                        students.map((student, index) => {
                          // Handle various student data formats
                          const studentId = student.id || student._id || `student-${index}`;
                          const studentName = student.name || student.username || "Student " + (index + 1);
                          const studentSection = student.section || "Unassigned";
                          
                          return (
                            <div key={studentId} className="selection-item">
                              <label className="checkbox-label">
                                <input
                                  type="checkbox"
                                  checked={assignment.selectedStudents.includes(studentId)}
                                  onChange={() => toggleStudentSelection(studentId)}
                                />
                                {studentName} {student.student_id && `(${student.student_id})`} - {studentSection}
                              </label>
                            </div>
                          );
                        })
                      ) : (
                        <div className="no-items">
                          {error ? `Error loading students: ${error}` : "No students available"}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Panel - Code Editor */}
        <div className="editor-container">
          <div className="code-editor">
            <div className="panel-header">
              <div className="editor-top">
                <div className="code-type-selector">
                  {codeTypes.map(type => (
                    <button
                      key={type.id}
                      className={`code-type-button ${currentExerciseData?.type === type.id ? 'active' : ''}`}
                      onClick={() => handleExerciseChange('type', type.id)}
                    >
                      {type.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="code-area-wrapper">
              <textarea
                value={currentExerciseData?.starter_code || ""}
                onChange={(e) => handleExerciseChange('starter_code', e.target.value)}
                className="code-area"
                spellCheck="false"
                placeholder={getPlaceholderForType(currentExerciseData?.type)}
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
