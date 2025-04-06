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
    
    // Detect if we're in an imported state
    const isImported = localStorage.getItem('is-imported') === 'true';
    const importComplete = localStorage.getItem('import-complete') === 'true';
    
    // Check if there's problem-answers with code answers first (imported case)
    if (isImported) {
      try {
        const allAnswers = JSON.parse(localStorage.getItem('problem-answers') || '{}');
        
        // Check for structured code answers (new format)
        if (allAnswers.codeAnswers && typeof allAnswers.codeAnswers === 'object') {
          Object.keys(allAnswers.codeAnswers).forEach(index => {
            const numIndex = parseInt(index, 10);
            if (!isNaN(numIndex)) {
              const code = allAnswers.codeAnswers[index];
              const stateKey = `code-${numIndex}`;
              savedCodes[stateKey] = code;
              
              // Also add with the full type for compatibility
              const typeKey = `code-${numIndex}`;
              savedCodes[typeKey] = code;
            }
          });
        }
        
        // Check for legacy format code answer
        if (allAnswers.codeAnswer && typeof allAnswers.codeAnswer === 'string') {
          // If we have a general codeAnswer, we'll use it for the current problem
          // This is a compatibility measure for older exported files
          savedCodes['code-0'] = allAnswers.codeAnswer;
        }
      } catch (e) {
        console.error('Error loading code answers from problem-answers:', e);
      }
    }
    
    // Then load all problem-code-* keys from localStorage
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
      // Also check for the alternative storage format
      else if (key && key.startsWith('code-')) {
        // Extract the type and index from key format: code-type-index
        const parts = key.split('-');
        if (parts.length >= 3) {
          const type = parts[1];
          const index = parseInt(parts[2], 10);
          if (!isNaN(index)) {
            const stateKey = `${type}-${index}`;
            savedCodes[stateKey] = localStorage.getItem(key);
          }
        }
      }
    }
    
    // Update state with all the codes we found
    setState(prev => ({
      ...prev,
      codes: savedCodes
    }));
    
    // Add event listener for import-complete to reload codes
    const handleImportComplete = () => {
      console.log("Reloading codes after import complete");
      // Force a reload of codes from localStorage after import
      setTimeout(() => {
        const refreshedCodes = {};
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && (key.startsWith('problem-code-') || key.startsWith('code-'))) {
            // Process problem-code-type-index format
            if (key.startsWith('problem-code-')) {
              const parts = key.replace('problem-code-', '').split('-');
              if (parts.length >= 2) {
                const type = parts[0];
                const index = parseInt(parts[1], 10);
                if (!isNaN(index)) {
                  const stateKey = `${type}-${index}`;
                  refreshedCodes[stateKey] = localStorage.getItem(key);
                }
              }
            }
            // Process code-type-index format
            else if (key.startsWith('code-')) {
              const parts = key.split('-');
              if (parts.length >= 3) {
                const type = parts[1];
                const index = parseInt(parts[2], 10);
                if (!isNaN(index)) {
                  const stateKey = `${type}-${index}`;
                  refreshedCodes[stateKey] = localStorage.getItem(key);
                }
              }
            }
          }
        }
        
        setState(prev => ({
          ...prev,
          codes: refreshedCodes
        }));
      }, 200);
    };
    
    window.addEventListener('import-complete', handleImportComplete);
    return () => window.removeEventListener('import-complete', handleImportComplete);
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