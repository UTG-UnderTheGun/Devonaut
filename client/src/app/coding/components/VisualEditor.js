import React, { useState, useEffect, useRef, useCallback } from 'react';
import Editor from '@/components/editor';
import SyntaxHighlighter from 'react-syntax-highlighter';
import { vs } from 'react-syntax-highlighter/dist/cjs/styles/prism';
import './VisualEditor.css';

const VisualEditor = ({
  questionType,
  initialCode,
  onChange,
  placeholder,
  readOnly = false,
  showLineNumbers = true
}) => {
  // Local state
  const [code, setCode] = useState(initialCode || "# เขียนโค้ดของคุณที่นี่\n\n\n\n");
  const [blankCount, setBlankCount] = useState(0);
  const isInitialRender = useRef(true);
  const editorInstanceRef = useRef(null);
  const containerRef = useRef(null);

  // Unique problem index for this editor instance
  const editorProblemIndex = useRef(`question-editor-${Date.now()}`);

  // Set initial code (only once)
  useEffect(() => {
    if (isInitialRender.current) {
      if (initialCode !== undefined) {
        setCode(initialCode);
        if (questionType === 'fill') {
          const count = (initialCode.match(/____/g) || []).length;
          setBlankCount(count);
        }
      }
      isInitialRender.current = false;
    }
  }, [initialCode, questionType]);

  // Update blank count for fill-type questions
  useEffect(() => {
    if (questionType === 'fill') {
      const count = (code.match(/____/g) || []).length;
      setBlankCount(count);
    }
  }, [questionType, code]);

  // Handle code change
  const handleCodeChange = useCallback((newCode) => {
    setCode(newCode);
    if (questionType === 'fill') {
      const count = (newCode.match(/____/g) || []).length;
      setBlankCount(count);
    }
    if (typeof onChange === 'function') {
      onChange(newCode);
    }
  }, [questionType, onChange]);

  // Force editor layout recalculation on container resize
  useEffect(() => {
    const resizeObserver = new ResizeObserver(() => {
      if (editorInstanceRef.current?.editor) {
        editorInstanceRef.current.editor.layout();
      }
    });
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }
    return () => {
      if (containerRef.current) {
        resizeObserver.disconnect();
      }
    };
  }, []);

  // Custom editor options with hidden internal scrollbars.
  const getCustomEditorOptions = useCallback(() => ({
    scrollBeyondLastLine: false,
    minimap: { enabled: false },
    scrollbar: {
      vertical: 'hidden',
      horizontal: 'hidden',
    },
    wordWrap: 'on',           // Enable word wrap to prevent horizontal scrolling
    automaticLayout: true,
  }), []);

  // Render output type editor (read-only or editable)
  const renderOutputEditor = () => {
    if (!readOnly) {
      return (
        <div className="output-editor-container">
          <Editor
            ref={editorInstanceRef}
            isCodeQuestion={true}
            initialValue={code}
            onChange={handleCodeChange}
            problemIndex={editorProblemIndex.current}
            testType="output"
            editorOptions={getCustomEditorOptions()}
          />
          <div className="output-info">
            <p>Students will be asked to predict the output of this code.</p>
          </div>
        </div>
      );
    }
    return (
      <div className="output-editor-container">
        <SyntaxHighlighter
          language="python"
          style={vs}
          showLineNumbers={showLineNumbers}
          customStyle={{
            margin: 0,
            padding: '1rem',
            background: '#f7fafc',
            fontSize: '14px',
            lineHeight: '1.6',
            borderRadius: '6px',
            height: '100%',
            minHeight: '180px',
            maxHeight: '600px',
            overflowY: 'auto',
            fontFamily: "'Fira Code', 'Courier New', monospace",
            color: '#2d3748'
          }}
        >
          {code}
        </SyntaxHighlighter>
      </div>
    );
  };

  // Render the appropriate editor based on question type
  const renderEditor = () => {
    switch (questionType) {
      case 'code':
        return (
          <div className="code-editor-container">
            <Editor
              isCodeQuestion={true}
              initialValue={code}
              onChange={handleCodeChange}
              problemIndex={editorProblemIndex.current}
              testType="code"
              editorOptions={getCustomEditorOptions()}
              ref={editorInstanceRef}
            />
            {blankCount > 0 && (
              <div className="blank-count">
                Fill-in-the-blanks detected: {blankCount}
              </div>
            )}
          </div>
        );
      case 'output':
        return renderOutputEditor();
      case 'fill':
        return (
          <div className="fill-editor-container">
            <Editor
              isCodeQuestion={true}
              initialValue={code}
              onChange={handleCodeChange}
              problemIndex={editorProblemIndex.current}
              testType="fill"
              editorOptions={getCustomEditorOptions()}
              ref={editorInstanceRef}
            />
            <div className="blank-info">
              <p>Use ____ (four underscores) to create blank spaces for students to fill in.</p>
              <p>Current blank count: <strong>{blankCount}</strong></p>
            </div>
          </div>
        );
      default:
        return (
          <div className="code-editor-container">
            <Editor
              isCodeQuestion={true}
              initialValue={code}
              onChange={handleCodeChange}
              problemIndex={editorProblemIndex.current}
              testType="code"
              editorOptions={getCustomEditorOptions()}
              ref={editorInstanceRef}
            />
          </div>
        );
    }
  };

  // Clean up localStorage on unmount
  useEffect(() => {
    return () => {
      localStorage.removeItem(`problem-code-${editorProblemIndex.current}`);
    };
  }, []);

  return (
    <div className="visual-editor" ref={containerRef}>
      {renderEditor()}
    </div>
  );
};

export default VisualEditor;
