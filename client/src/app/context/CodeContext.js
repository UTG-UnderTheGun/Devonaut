"use client"
import { createContext, useContext, useState } from 'react';

const CodeContext = createContext();

export const CodeProvider = ({ children }) => {
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');
  const [openTerm, setOpenTerm] = useState(false)
  const [openChat, setOpenChat] = useState(false)
  const [openCreate, setOpenCreate] = useState(false)

  return (
    <CodeContext.Provider value={{ output, setOutput, error, setError, openTerm, setOpenTerm, openChat, setOpenChat, openCreate, setOpenCreate }}>
      {children}
    </CodeContext.Provider>
  );
};

export const useCodeContext = () => {
  return useContext(CodeContext);
};
