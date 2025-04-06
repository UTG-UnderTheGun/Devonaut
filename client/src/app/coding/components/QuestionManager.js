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
  const [showFilenameDialog, setShowFilenameDialog] = useState(false);
  const [filenameInput, setFilenameInput] = useState('');
  const [questionsToExport, setQuestionsToExport] = useState([]);

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

    // Get current date for default filename
    const today = new Date();
    const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const defaultFilename = `questions-${dateStr}.json`;
    
    // Set default filename in the input field
    setFilenameInput(defaultFilename);
    
    // Store questions to export and show the custom filename dialog
    setQuestionsToExport(questionsToExport);
    setShowFilenameDialog(true);
  };

  // When user confirms the filename
  const handleDownload = () => {
    try {
      // Format JSON with 2-space indentation for readability
      const jsonString = JSON.stringify(questionsToExport, null, 2);

      // Create a Blob and downloadable link
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      // Use provided filename or default if empty
      const filename = filenameInput.trim() || `questions-${new Date().toISOString().slice(0, 10)}.json`;
      const finalFilename = filename.endsWith('.json') ? filename : `${filename}.json`;

      // Create and click a download link
      const a = document.createElement('a');
      a.href = url;
      a.download = finalFilename;
      document.body.appendChild(a);
      a.click();

      // Clean up
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 0);

      if (typeof onSuccess === 'function') {
        onSuccess(`Exported ${questionsToExport.length} questions to ${finalFilename}`);
      } else {
        alert(`Exported ${questionsToExport.length} questions to ${finalFilename}`);
      }
    } catch (error) {
      console.error('Export error:', error);
      if (typeof onError === 'function') {
        onError(`Export failed: ${error.message}`);
      } else {
        alert(`Export failed: ${error.message}`);
      }
    } finally {
      // Close the dialog and reset state
      setShowFilenameDialog(false);
      setIsExporting(false);
    }
  };

  // Cancel the export
  const handleCancelExport = () => {
    setShowFilenameDialog(false);
    setIsExporting(false);
    if (typeof onError === 'function') {
      onError('Export cancelled by user');
    }
  };

  // Import questions from a file
  const handleImport = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setIsImporting(true);

    // Check file size before proceeding (limit to 10MB)
    const maxFileSize = 10 * 1024 * 1024; // 10MB in bytes
    if (file.size > maxFileSize) {
      if (typeof onError === 'function') {
        onError(`File is too large. Maximum size is 10MB. Your file is ${(file.size / (1024 * 1024)).toFixed(2)}MB.`);
      } else {
        alert(`File is too large. Maximum size is 10MB. Your file is ${(file.size / (1024 * 1024)).toFixed(2)}MB.`);
      }
      setIsImporting(false);
      event.target.value = '';
      return;
    }

    // Check file type - should be .json
    if (!file.name.toLowerCase().endsWith('.json')) {
      // Ask for confirmation if it's not a .json file
      const continueImport = window.confirm(`The file "${file.name}" does not have a .json extension. Are you sure it's a valid JSON file and you want to continue?`);
      if (!continueImport) {
        setIsImporting(false);
        event.target.value = '';
        return;
      }
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedQuestions = JSON.parse(e.target.result);
        
        // Check if we should append or replace existing questions
        let finalQuestions;
        let mode = "replace";

        if (questions.length > 0) {
          const importChoice = window.confirm(
            `You already have ${questions.length} existing questions. Would you like to:\n\n` +
            `• Click "OK" to APPEND the imported questions to your existing set\n` +
            `• Click "Cancel" to REPLACE all existing questions with the imported ones`
          );
          mode = importChoice ? "append" : "replace";
        }

        // Handle array of questions
        if (Array.isArray(importedQuestions)) {
          if (mode === "append") {
            // Append to existing questions, ensuring IDs are sequential
            finalQuestions = [...questions, ...importedQuestions].map((q, idx) => ({
              ...q,
              id: idx + 1
            }));
          } else {
            // Replace existing questions
            finalQuestions = importedQuestions.map((q, idx) => ({
              ...q,
              id: idx + 1
            }));
          }

          setQuestions(finalQuestions);

          // Call the onImport callback to notify parent components
          if (typeof onImport === 'function') {
            onImport(finalQuestions);
          }

          // Show success message
          const actionVerb = mode === "append" ? "Appended" : "Imported";
          if (typeof onSuccess === 'function') {
            onSuccess(`${actionVerb} ${importedQuestions.length} questions from "${file.name}"`);
          } else {
            alert(`${actionVerb} ${importedQuestions.length} questions from "${file.name}"`);
          }

          // Dispatch custom event for integration with existing code
          const importEvent = new CustomEvent('file-import', {
            detail: finalQuestions
          });
          window.dispatchEvent(importEvent);
        } else if (typeof importedQuestions === 'object' && importedQuestions !== null) {
          // Try to handle single question object
          if (mode === "append") {
            finalQuestions = [...questions, importedQuestions].map((q, idx) => ({
              ...q,
              id: idx + 1
            }));
          } else {
            finalQuestions = [importedQuestions].map((q, idx) => ({
              ...q,
              id: idx + 1
            }));
          }
          
          setQuestions(finalQuestions);

          if (typeof onImport === 'function') {
            onImport(finalQuestions);
          }

          const actionVerb = mode === "append" ? "Appended" : "Imported";
          if (typeof onSuccess === 'function') {
            onSuccess(`${actionVerb} 1 question from "${file.name}"`);
          } else {
            alert(`${actionVerb} 1 question from "${file.name}"`);
          }

          const importEvent = new CustomEvent('file-import', {
            detail: finalQuestions
          });
          window.dispatchEvent(importEvent);
        } else {
          if (typeof onError === 'function') {
            onError(`Invalid file format in "${file.name}". Expected an array of questions or a single question object.`);
          } else {
            alert(`Invalid file format in "${file.name}". Expected an array of questions or a single question object.`);
          }
        }
      } catch (error) {
        console.error('Error parsing imported file:', error);
        if (typeof onError === 'function') {
          onError(`Import error in "${file.name}": ${error.message}`);
        } else {
          alert(`Import error in "${file.name}": ${error.message}`);
        }
      } finally {
        setIsImporting(false);
      }
    };

    reader.onerror = () => {
      if (typeof onError === 'function') {
        onError(`Error reading file "${file.name}"`);
      } else {
        alert(`Error reading file "${file.name}"`);
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

      {/* Custom filename dialog for exports */}
      {showFilenameDialog && (
        <div className="filename-dialog-overlay">
          <div className="filename-dialog">
            <div className="filename-dialog-header">
              <h3>Export Questions</h3>
              <button className="filename-dialog-close" onClick={handleCancelExport}>×</button>
            </div>
            <div className="filename-dialog-body">
              <p>Enter a filename for your exported questions:</p>
              <input
                type="text"
                className="filename-input"
                value={filenameInput}
                onChange={(e) => setFilenameInput(e.target.value)}
                placeholder="questions.json"
                autoFocus
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleDownload();
                  }
                }}
              />
            </div>
            <div className="filename-dialog-footer">
              <button className="cancel-btn" onClick={handleCancelExport}>Cancel</button>
              <button className="download-btn" onClick={handleDownload}>
                Download
              </button>
            </div>
          </div>
        </div>
      )}

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
                    <label className="import-btn" title="Import questions from a JSON file">
                      Import Questions
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
                      title="Export questions to a JSON file"
                    >
                      {selectedQuestions.length > 0
                        ? `Export Selected (${selectedQuestions.length})`
                        : 'Export All Questions'}
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
