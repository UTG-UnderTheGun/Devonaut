'use client';
import { useState, useEffect } from 'react';
import './code-explainer.css';

export default function CodeExplainer() {
  const [isVisible, setIsVisible] = useState(false);
  const [explanation, setExplanation] = useState('');
  const [selectedCode, setSelectedCode] = useState('');

  useEffect(() => {
    const handleExplainCode = (event) => {
      const { code, explanation } = event.detail;
      setSelectedCode(code);
      setExplanation(explanation);
      setIsVisible(true);
    };

    window.addEventListener('explain-code', handleExplainCode);
    return () => window.removeEventListener('explain-code', handleExplainCode);
  }, []);

  return (
    <div className={`code-explainer ${isVisible ? 'visible' : ''}`}>
      <div className="explainer-header">
        <h3>Code Explanation</h3>
        <button 
          className="close-button"
          onClick={() => setIsVisible(false)}
        >
          ×
        </button>
      </div>
      <div className="selected-code">
        <pre><code>{selectedCode}</code></pre>
      </div>
      <div className="explanation">
        {explanation}
      </div>
    </div>
  );
} 