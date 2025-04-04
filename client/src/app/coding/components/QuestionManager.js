import React, { useState, useEffect } from 'react';
import { StorageService } from '@/services/StorageService';
import QuestionEditor from './QuestionEditor';
import './QuestionManager.css';

const QuestionManager = ({ onImport, onError, onSuccess }) => {
  const [questions, setQuestions] = useState([]);
  const [showEditor, setShowEditor] = useState(false);
  const [editingIndex, setEditingIndex] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [sortOrder, setSortOrder] = useState('asc');
  const [sortField, setSortField] = useState('id');
  const [isImporting, setIsImporting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [selectedQuestions, setSelectedQuestions] = useState([]);

  // Load saved questions from localStorage on mount
  useEffect(() => {
    const savedQuestions = localStorage.getItem('saved-questions');
    if (savedQuestions) {
      try {
        const parsedQuestions = JSON.parse(savedQuestions);
        if (Array.isArray(parsedQuestions) && parsedQuestions.length > 0) {
          setQuestions(parsedQuestions);
        }
      } catch (error) {
        console.error('Error parsing saved questions:', error);
      }
    }
  }, []);

  // Save questions to localStorage when they change
  useEffect(() => {
    if (questions.length > 0) {
      localStorage.setItem('saved-questions', JSON.stringify(questions));
    }
  }, [questions]);

  // Add a new question
  const handleAddQuestion = () => {
    setEditingIndex(null);
    setShowEditor(true);
  };

  // Edit an existing question
  const handleEditQuestion = (index) => {
    setEditingIndex(index);
    setShowEditor(true);
  };

  // Delete a question with confirmation
  const handleDeleteQuestion = (index) => {
    if (window.confirm('Are you sure you want to delete this question?')) {
      const newQuestions = [...questions];
      newQuestions.splice(index, 1);
      setQuestions(newQuestions);

      // If we deleted all questions, clear localStorage
      if (newQuestions.length === 0) {
        localStorage.removeItem('saved-questions');
      }
    }
  };

  // Delete multiple selected questions
  const handleDeleteSelected = () => {
    if (selectedQuestions.length === 0) {
      if (typeof onError === 'function') {
        onError('No questions selected');
      } else {
        alert('No questions selected');
      }
      return;
    }

    if (window.confirm(`Are you sure you want to delete ${selectedQuestions.length} selected questions?`)) {
      const newQuestions = questions.filter((_, index) => !selectedQuestions.includes(index));
      setQuestions(newQuestions);
      setSelectedQuestions([]);

      // If we deleted all questions, clear localStorage
      if (newQuestions.length === 0) {
        localStorage.removeItem('saved-questions');
      }

      if (typeof onSuccess === 'function') {
        onSuccess(`Deleted ${selectedQuestions.length} questions`);
      } else {
        alert(`Deleted ${selectedQuestions.length} questions`);
      }
    }
  };

  // Save a question (new or edited)
  const handleSaveQuestion = (question) => {
    let newQuestions = [...questions];

    if (editingIndex !== null) {
      // Update existing question
      newQuestions[editingIndex] = question;
    } else {
      // Add new question
      newQuestions.push(question);
    }

    // Ensure all questions have sequential IDs
    newQuestions = newQuestions.map((q, index) => ({
      ...q,
      id: index + 1
    }));

    setQuestions(newQuestions);
    setShowEditor(false);
    setEditingIndex(null);
  };

  // Handle export functionality
  const handleExport = () => {
    setIsExporting(true);

    // Export function
    const exportToJson = (questionsToExport) => {
      try {
        // Format JSON with 2-space indentation for readability
        const jsonString = JSON.stringify(questionsToExport, null, 2);

        // Create a Blob and downloadable link
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        // Prompt for filename
        const filename = prompt('Enter filename for export:', 'questions.json') || 'questions.json';

        // Create and click a download link
        const a = document.createElement('a');
        a.href = url;
        a.download = filename.endsWith('.json') ? filename : `${filename}.json`;
        document.body.appendChild(a);
        a.click();

        // Clean up
        setTimeout(() => {
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }, 0);

        if (typeof onSuccess === 'function') {
          onSuccess(`Exported ${questionsToExport.length} questions to ${a.download}`);
        } else {
          alert(`Exported ${questionsToExport.length} questions to ${a.download}`);
        }
      } catch (error) {
        console.error('Export error:', error);
        if (typeof onError === 'function') {
          onError(`Export failed: ${error.message}`);
        } else {
          alert(`Export failed: ${error.message}`);
        }
      }
    };

    // Get questions to export - either selected ones or all
    const questionsToExport = selectedQuestions.length > 0
      ? selectedQuestions.map(index => questions[index])
      : questions;

    if (questionsToExport.length === 0) {
      if (typeof onError === 'function') {
        onError('No questions to export');
      } else {
        alert('No questions to export');
      }
      setIsExporting(false);
      return;
    }

    exportToJson(questionsToExport);
    setIsExporting(false);
  };

  // Import questions from a file
  const handleImport = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setIsImporting(true);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedQuestions = JSON.parse(e.target.result);
        if (Array.isArray(importedQuestions)) {
          setQuestions(importedQuestions);

          // Call the onImport callback to notify parent components
          if (typeof onImport === 'function') {
            onImport(importedQuestions);
          }

          // Show success message
          if (typeof onSuccess === 'function') {
            onSuccess(`Successfully imported ${importedQuestions.length} questions`);
          } else {
            alert(`Successfully imported ${importedQuestions.length} questions`);
          }

          // Dispatch custom event for integration with existing code
          const importEvent = new CustomEvent('file-import', {
            detail: importedQuestions
          });
          window.dispatchEvent(importEvent);
        } else if (typeof importedQuestions === 'object' && importedQuestions !== null) {
          // Try to handle single question object
          const questionArray = [importedQuestions];
          setQuestions(questionArray);

          if (typeof onImport === 'function') {
            onImport(questionArray);
          }

          if (typeof onSuccess === 'function') {
            onSuccess('Successfully imported 1 question');
          } else {
            alert('Successfully imported 1 question');
          }

          const importEvent = new CustomEvent('file-import', {
            detail: questionArray
          });
          window.dispatchEvent(importEvent);
        } else {
          if (typeof onError === 'function') {
            onError('Invalid file format. Expected an array of questions or a single question object.');
          } else {
            alert('Invalid file format. Expected an array of questions or a single question object.');
          }
        }
      } catch (error) {
        console.error('Error parsing imported file:', error);
        if (typeof onError === 'function') {
          onError(`Import error: ${error.message}`);
        } else {
          alert(`Import error: ${error.message}`);
        }
      } finally {
        setIsImporting(false);
      }
    };

    reader.onerror = () => {
      if (typeof onError === 'function') {
        onError('Error reading file');
      } else {
        alert('Error reading file');
      }
      setIsImporting(false);
    };

    reader.readAsText(file);

    // Reset the file input
    event.target.value = '';
  };

  // Use the current set of questions
  const handleUseQuestions = () => {
    if (questions.length === 0) {
      if (typeof onError === 'function') {
        onError('No questions to use. Please add questions first.');
      } else {
        alert('No questions to use. Please add questions first.');
      }
      return;
    }

    // Notify parent components that we want to use these questions
    if (typeof onImport === 'function') {
      onImport(questions);
    }

    // Fire the custom event that existing code listens for
    const importEvent = new CustomEvent('file-import', {
      detail: questions
    });
    window.dispatchEvent(importEvent);

    setIsModalOpen(false);

    if (typeof onSuccess === 'function') {
      onSuccess(`Using ${questions.length} questions`);
    }
  };

  // Open the question manager modal
  const openModal = () => {
    setIsModalOpen(true);
  };

  // Close the question manager modal
  const closeModal = () => {
    setIsModalOpen(false);
    setShowEditor(false);
    setSelectedQuestions([]);
  };

  // Toggle question selection for multi-select operations
  const toggleQuestionSelection = (index) => {
    setSelectedQuestions(prev => {
      if (prev.includes(index)) {
        return prev.filter(i => i !== index);
      } else {
        return [...prev, index];
      }
    });
  };

  // Select all questions
  const selectAllQuestions = () => {
    if (selectedQuestions.length === filteredQuestions.length) {
      setSelectedQuestions([]);
    } else {
      setSelectedQuestions(filteredQuestions.map((_, index) => index));
    }
  };

  // Sort the questions
  const handleSort = (field) => {
    if (sortField === field) {
      // Toggle sort order if clicking the same field
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new sort field and default to ascending
      setSortField(field);
      setSortOrder('asc');
    }
  };

  // Filter and sort questions
  const filteredQuestions = questions
    .filter(q =>
      q.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      q.description.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      if (sortField === 'id') {
        return sortOrder === 'asc' ? a.id - b.id : b.id - a.id;
      } else if (sortField === 'title') {
        return sortOrder === 'asc'
          ? a.title.localeCompare(b.title)
          : b.title.localeCompare(a.title);
      } else if (sortField === 'type') {
        return sortOrder === 'asc'
          ? a.type.localeCompare(b.type)
          : b.type.localeCompare(a.type);
      }
      return 0;
    });

  return (
    <>
      <button className="open-manager-btn" onClick={openModal}>
        Manage Questions
      </button>

      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Question Manager</h2>
              <button className="close-modal-btn" onClick={closeModal}>×</button>
            </div>

            {showEditor ? (
              <QuestionEditor
                onSave={handleSaveQuestion}
                onCancel={() => setShowEditor(false)}
                editingQuestion={editingIndex !== null ? questions[editingIndex] : null}
              />
            ) : (
              <>
                <div className="question-controls">
                  <div className="left-controls">
                    <button className="add-question-btn" onClick={handleAddQuestion}>
                      + Add Question
                    </button>
                    <input
                      type="search"
                      placeholder="Search questions..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="search-input"
                    />
                  </div>
                  <div className="right-controls">
                    <label className="import-btn">
                      Import
                      <input
                        type="file"
                        accept=".json"
                        onChange={handleImport}
                        disabled={isImporting}
                        style={{ display: 'none' }}
                      />
                    </label>
                    {isImporting && <span className="status-text">Importing...</span>}

                    <button
                      className="export-btn"
                      onClick={handleExport}
                      disabled={isExporting || questions.length === 0}
                    >
                      {selectedQuestions.length > 0
                        ? `Export (${selectedQuestions.length})`
                        : 'Export All'}
                    </button>
                    {isExporting && <span className="status-text">Exporting...</span>}

                    <button
                      className="use-questions-btn"
                      onClick={handleUseQuestions}
                      disabled={questions.length === 0}
                    >
                      Use These Questions
                    </button>
                  </div>
                </div>

                {selectedQuestions.length > 0 && (
                  <div className="bulk-actions">
                    <span>{selectedQuestions.length} questions selected</span>
                    <button
                      className="delete-selected-btn"
                      onClick={handleDeleteSelected}
                    >
                      Delete Selected
                    </button>
                  </div>
                )}

                <div className="questions-table">
                  <div className="questions-table-header">
                    <div className="checkbox-column">
                      <input
                        type="checkbox"
                        checked={selectedQuestions.length === filteredQuestions.length && filteredQuestions.length > 0}
                        onChange={selectAllQuestions}
                        title="Select all"
                      />
                    </div>
                    <div
                      className={`id-column sortable ${sortField === 'id' ? 'sorted-' + sortOrder : ''}`}
                      onClick={() => handleSort('id')}
                    >
                      ID {sortField === 'id' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </div>
                    <div
                      className={`title-column sortable ${sortField === 'title' ? 'sorted-' + sortOrder : ''}`}
                      onClick={() => handleSort('title')}
                    >
                      Title {sortField === 'title' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </div>
                    <div
                      className={`type-column sortable ${sortField === 'type' ? 'sorted-' + sortOrder : ''}`}
                      onClick={() => handleSort('type')}
                    >
                      Type {sortField === 'type' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </div>
                    <div className="actions-column">Actions</div>
                  </div>

                  <div className="questions-list">
                    {filteredQuestions.length > 0 ? (
                      filteredQuestions.map((question, index) => (
                        <div key={question.id || index} className="question-item">
                          <div className="checkbox-column">
                            <input
                              type="checkbox"
                              checked={selectedQuestions.includes(index)}
                              onChange={() => toggleQuestionSelection(index)}
                            />
                          </div>
                          <div className="id-column">#{question.id || index + 1}</div>
                          <div className="title-column">{question.title || 'No Title'}</div>
                          <div className="type-column">{(question.type || 'code').toUpperCase()}</div>
                          <div className="actions-column">
                            <button
                              className="edit-btn"
                              onClick={() => handleEditQuestion(index)}
                            >
                              Edit
                            </button>
                            <button
                              className="delete-btn"
                              onClick={() => handleDeleteQuestion(index)}
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="no-questions">
                        {searchTerm ? 'No matching questions found.' : 'No questions yet. Click "Add Question" to create one.'}
                      </div>
                    )}
                  </div>
                </div>

                {filteredQuestions.length > 0 && (
                  <div className="pagination-info">
                    Showing {filteredQuestions.length} of {questions.length} questions
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default QuestionManager;
