import React, { useState, useEffect, useCallback, useRef } from 'react';
import Editor from '../../../components/editor.js'; // Import the Editor component
import './QuestionEditor.css';

const QuestionEditor = ({ onSave, onCancel, editingQuestion = null }) => {
  // Create a ref for the editor
  const editorRef = useRef(null);
  
  // Initialize question state.
  // We use a function to initialize so that on first render we check editingQuestion.
  const [question, setQuestion] = useState(() => {
    if (editingQuestion) {
      return {
        ...editingQuestion,
        // Ensure we have all required fields
        code: editingQuestion.code || '# เขียนโค้ดของคุณที่นี่\n\n\n\n',
        userAnswers: editingQuestion.userAnswers || {},
      };
    } else {
      return {
        id: Date.now().toString(),
        title: '',
        description: '',
        code: '# เขียนโค้ดของคุณที่นี่\n\n\n\n',
        type: 'code',
        userAnswers: {}
      };
    }
  });

  // If editingQuestion changes, update state.
  useEffect(() => {
    if (editingQuestion) {
      setQuestion(prev => ({
        ...prev,
        ...editingQuestion,
        code: editingQuestion.code || '# เขียนโค้ดของคุณที่นี่\n\n\n\n',
      }));
    }
  }, [editingQuestion]);

  // Handle text field changes.
  const handleChange = (e) => {
    const { name, value } = e.target;
    setQuestion(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle code editor changes.
  const handleCodeChange = useCallback((newCode) => {
    setQuestion(prev => ({
      ...prev,
      code: newCode
    }));
  }, []);

  // Form submission
  const handleSubmit = (e) => {
    e.preventDefault();

    // Prepare userAnswers based on question type.
    let userAnswers = {};
    if (question.type === 'output') {
      // Use both answer and outputAnswer keys for maximum compatibility
      userAnswers = { 
        answer: '',  // Primary key used in some components
        outputAnswer: '' // Used in other components
      };
    } else if (question.type === 'fill') {
      const blankCount = (question.code.match(/____/g) || []).length;
      const fillAnswers = {};
      for (let i = 0; i < blankCount; i++) {
        fillAnswers[`blank-${i}`] = '';
      }
      userAnswers = { fillAnswers };
    } else {
      userAnswers = { codeAnswer: '' };
    }

    // Prepare the final question object.
    const finalQuestion = {
      ...question,
      starterCode: question.code, // For compatibility
      userAnswers,
      answers: {}  // Placeholder for correct answers
    };

    onSave(finalQuestion);
  };

  // Determine the placeholder text based on question type.
  const getPlaceholderText = () => {
    switch (question.type) {
      case 'code':
        return "# Enter starter code...";
      case 'output':
        return "# Enter code for output prediction...";
      case 'fill':
        return "# Enter code with ____ (4 underscore) for blanks...";
      default:
        return "# Enter code here...";
    }
  };

  // Determine the code label based on question type.
  const getCodeLabel = () => {
    switch (question.type) {
      case 'code':
        return 'Starter Code:';
      case 'output':
        return 'Code to Analyze:';
      case 'fill':
        return 'Code with Blanks (use ____ (4 underscore) for blanks):';
      default:
        return 'Code:';
    }
  };

  // Create a unique problem index for this editor to avoid localStorage conflicts
  const editorProblemIndex = `question-editor-${question.id}`;

  return (
    <div className="question-editor-container">
      <h2>{editingQuestion ? 'Edit Question' : 'Create New Question'}</h2>
      <form onSubmit={handleSubmit} className="question-form">
        <div className="form-group">
          <label htmlFor="title">Question Title:</label>
          <input
            type="text"
            id="title"
            name="title"
            value={question.title}
            onChange={handleChange}
            required
            placeholder="Enter question title..."
          />
        </div>

        <div className="form-group">
          <label htmlFor="type">Question Type:</label>
          <select
            id="type"
            name="type"
            value={question.type}
            onChange={handleChange}
            required
          >
            <option value="code">Code Writing</option>
            <option value="output">Output Prediction</option>
            <option value="fill">Fill in the Blanks</option>
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="description">Description:</label>
          <textarea
            id="description"
            name="description"
            value={question.description}
            onChange={handleChange}
            required
            placeholder="Enter question description..."
            rows={4}
          />
        </div>

        <div className="form-group">
          <label htmlFor="code">{getCodeLabel()}</label>
          <div className="editor-wrapper" style={{ height: '300px', border: '1px solid #ddd', borderRadius: '4px' }}>
            <Editor
              ref={editorRef}
              isCodeQuestion={true}
              initialValue={question.code}
              onChange={handleCodeChange}
              problemIndex={editorProblemIndex}
              testType={question.type}
            />
          </div>
        </div>

        {question.type === 'output' && (
          <div className="form-group">
            <label htmlFor="expectedOutput">Expected Output (optional):</label>
            <textarea
              id="expectedOutput"
              name="expectedOutput"
              value={question.expectedOutput || ''}
              onChange={handleChange}
              placeholder="Enter the expected output..."
              rows={2}
            />
            <small>This will be used for automatic grading</small>
          </div>
        )}

        <div className="button-group">
          <button type="submit" className="save-btn">Save Question</button>
          <button type="button" className="cancel-btn" onClick={onCancel}>Cancel</button>
        </div>
      </form>
    </div>
  );
};

export default QuestionEditor;
