"use client"
import { createContext, useContext, useState } from 'react';

// Create a context for the code output
const CodeContext = createContext();

// Provider to wrap the components that need access to the output state
export const CodeProvider = ({ children }) => {
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');

  return (
    <CodeContext.Provider value={{ output, setOutput, error, setError }}>
      {children}
    </CodeContext.Provider>
  );
};

// Hook to use the context
export const useCodeContext = () => {
  return useContext(CodeContext);
};
