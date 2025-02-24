import React from 'react';
import Terminal from '@/components/Terminal';

const ConsoleSection = ({
  isConsoleFolded,
  setIsConsoleFolded,
  testType
}) => {
  return (
    <div className={`console ${isConsoleFolded || testType !== 'code' ? 'folded' : ''}`}>
      <div className="console-header">
        <span>Console</span>
        <button
          className="fold-button"
          onClick={() => setIsConsoleFolded(!isConsoleFolded)}
        >
          {isConsoleFolded ? '▲' : '▼'}
        </button>
      </div>
      <div className="console-content">
        <Terminal />
      </div>
    </div>
  );
};

export default ConsoleSection; 