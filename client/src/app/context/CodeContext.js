"use client"
import { createContext, useContext, useState, useCallback, useEffect } from 'react';

const CodeContext = createContext();

// Default initial state
const initialState = {
  codes: {}, // Store codes for each question separately by problemIndex and type
  output: '',
  error: null,
  openTerm: false,
  openChat: false,
  openCreate: false,
  currentProblemIndex: 0,
  currentType: 'code',
};

export const CodeProvider = ({ children, initialOutput = '' }) => {
  const [state, setState] = useState({
    ...initialState,
    output: initialOutput,
  });

  // Get the active code for the current problem
  const getActiveCode = useCallback(() => {
    const { codes, currentProblemIndex, currentType } = state;
    const key = `${currentType}-${currentProblemIndex}`;
    return codes[key] || '# write code here';
  }, [state]);

  // Set code for a specific problem
  const setCode = useCallback((code, problemIndex, type) => {
    setState(prev => {
      // If problemIndex and type are provided, use them to create a specific key
      if (problemIndex !== undefined && type) {
        const key = `${type}-${problemIndex}`;
        return { 
          ...prev, 
          codes: { 
            ...prev.codes, 
            [key]: code 
          } 
        };
      } 
      // Otherwise, use the current problem index and type from state
      else {
        const key = `${prev.currentType}-${prev.currentProblemIndex}`;
        return { 
          ...prev, 
          codes: { 
            ...prev.codes, 
            [key]: code 
          } 
        };
      }
    });
  }, []);

  // Set the current active problem index and type
  const setActiveProblem = useCallback((problemIndex, type) => {
    setState(prev => ({
      ...prev,
      currentProblemIndex: problemIndex !== undefined ? problemIndex : prev.currentProblemIndex,
      currentType: type || prev.currentType
    }));
  }, []);

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

  const resetState = useCallback(() => {
    setState(initialState);
  }, []);

  // Load codes from localStorage on initial mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const savedCodes = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('problem-code-')) {
        // Extract the type and index from key format: problem-code-type-index
        const parts = key.replace('problem-code-', '').split('-');
        if (parts.length >= 2) {
          const type = parts[0];
          const index = parseInt(parts[1], 10);
          if (!isNaN(index)) {
            const stateKey = `${type}-${index}`;
            savedCodes[stateKey] = localStorage.getItem(key);
          }
        }
      }
    }
    
    setState(prev => ({
      ...prev,
      codes: savedCodes
    }));
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      resetState();
    };
  }, [resetState]);

  const contextValue = {
    ...state,
    code: getActiveCode(), // Return current active code
    setCode,
    setActiveProblem,
    getActiveCode,
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

export const useCodeContext = () => {
  const context = useContext(CodeContext);
  
  if (!context) {
    throw new Error('useCodeContext must be used within a CodeProvider');
  }
  
  return context;
};

export const useCodeState = () => {
  const { code, output, error, openTerm, openChat, openCreate } = useCodeContext();
  return { code, output, error, openTerm, openChat, openCreate };
};  