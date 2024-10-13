import React from 'react';
import { useCodeContext } from '@/app/context/CodeContext';

const Terminal = () => {
  const { output, error } = useCodeContext(); // Access the output and error from context

  return (
    <div
      style={{
        backgroundColor: '#000',
        color: '#00FF00',
        padding: '20px',
        fontFamily: 'monospace',
        borderRadius: '5px',
        height: '200px',
        overflowY: 'scroll',
      }}
    >
      <h2 style={{ color: '#00FF00' }}>Terminal Output</h2>
      <pre style={{ color: error ? 'red' : 'lime' }}>
        {error || output || 'No output yet...'}
      </pre>
    </div>
  );
};

export default Terminal;
