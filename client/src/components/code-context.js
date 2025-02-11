"use client"
import { createContext, useContext, useState, useCallback, useEffect } from 'react';

// Create context
const CodeContext = createContext();

// Initial state
const initialState = {
  output: '',
  error: null,
  openTerm: false,
  openChat: false,
  openCreate: false,
};

export const CodeProvider = ({ children, initialOutput = '' }) => {
  // Initialize state with custom initial values if provided
  const [state, setState] = useState({
    ...initialState,
    output: initialOutput,
  });

  // Action handlers using useCallback for memoization
  const setOutput = useCallback((output) => {
    setState(prev => ({ ...prev, output }));
  }, []);

  const setError = useCallback((error) => {
    setState(prev => ({ ...prev, error }));
  }, []);

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  const toggleTerminal = useCallback(() => {
    setState(prev => ({ ...prev, openTerm: !prev.openTerm }));
  }, []);

  const toggleChat = useCallback(() => {
    setState(prev => ({ ...prev, openChat: !prev.openChat }));
  }, []);

  const toggleCreate = useCallback(() => {
    setState(prev => ({ ...prev, openCreate: !prev.openCreate }));
  }, []);

  // Reset all state to initial values
  const resetState = useCallback(() => {
    setState(initialState);
  }, []);

  // Cleanup function when component unmounts
  useEffect(() => {
    return () => {
      resetState();
    };
  }, [resetState]);

  const contextValue = {
    ...state,
    setOutput,
    setError,
    clearError,
    toggleTerminal,
    toggleChat,
    toggleCreate,
    resetState,
  };

  return (
    <CodeContext.Provider value={contextValue}>
      {children}
    </CodeContext.Provider>
  );
};

// Custom hook with error handling
export const useCodeContext = () => {
  const context = useContext(CodeContext);
  
  if (!context) {
    throw new Error('useCodeContext must be used within a CodeProvider');
  }
  
  return context;
};

// Optional: Export a hook for just reading state without actions
export const useCodeState = () => {
  const { output, error, openTerm, openChat, openCreate } = useCodeContext();
  return { output, error, openTerm, openChat, openCreate };
};