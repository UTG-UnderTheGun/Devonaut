'use client';
import { useState, useEffect } from 'react';
import './code-explainer.css';

export default function CodeExplainer() {
  const [isVisible, setIsVisible] = useState(false);
  const [explanation, setExplanation] = useState('');
  const [selectedCode, setSelectedCode] = useState('');
  const [currentExerciseId, setCurrentExerciseId] = useState(null);

  useEffect(() => {
    // Listen for explain-code events
    const handleExplainCode = (event) => {
      const { code, explanation } = event.detail;
      setSelectedCode(code);
      setExplanation(explanation);
      setIsVisible(true);
    };

    // Listen for problem-changed events to track current exercise
    const handleProblemChange = (event) => {
      const { problemId } = event.detail;
      if (problemId) {
        console.log(`CodeExplainer: Exercise ID changed to ${problemId}`);
        setCurrentExerciseId(problemId);
      }
    };

    window.addEventListener('explain-code', handleExplainCode);
    window.addEventListener('problem-changed', handleProblemChange);
    
    return () => {
      window.removeEventListener('explain-code', handleExplainCode);
      window.removeEventListener('problem-changed', handleProblemChange);
    };
  }, []);

  // Function to ask AI to explain the code
  const askAiToExplain = () => {
    if (!selectedCode) return;

    // Create a message object for AI
    const message = {
      id: Date.now(),
      text: `Can you explain this code?: \n\`\`\`python\n${selectedCode}\n\`\`\``,
      isUser: true,
      timestamp: new Date()
    };

    // First switch to AI tab
    const switchEvent = new CustomEvent('switch-description-tab', {
      detail: { 
        tab: 'ASK AI',
        pendingMessage: message
      }
    });
    
    window.dispatchEvent(switchEvent);
    
    // Hide the explainer panel
    setIsVisible(false);
  };

  return (
    <div className={`code-explainer ${isVisible ? 'visible' : ''}`}>
      <div className="explainer-header">
        <h3>Code Explanation</h3>
        <div className="explainer-actions">
          <button 
            className="ask-ai-button"
            onClick={askAiToExplain}
          >
            Ask AI
          </button>
          <button 
            className="close-button"
            onClick={() => setIsVisible(false)}
          >
            ×
          </button>
        </div>
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
