"use client"
import { createContext, useContext, useState, useCallback, useEffect } from 'react';

const CodeContext = createContext();

// เพิ่ม code ใน initialState
const initialState = {
  code: '', // เปลี่ยนจาก '# write code here' เป็น string ว่าง
  output: '',
  error: null,
  openTerm: false,
  openChat: false,
  openCreate: false,
};

export const CodeProvider = ({ children, initialOutput = '' }) => {
  const [state, setState] = useState({
    ...initialState,
    output: initialOutput,
  });

  // เพิ่ม setCode function
  const setCode = useCallback((code) => {
    setState(prev => ({ ...prev, code }));
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

  useEffect(() => {
    return () => {
      resetState();
    };
  }, [resetState]);

  const contextValue = {
    ...state,
    setCode,      // เพิ่มบรรทัดนี้
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