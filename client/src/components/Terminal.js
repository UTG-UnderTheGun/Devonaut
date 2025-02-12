import { useCodeContext } from '@/app/context/CodeContext';
import './Terminal.css';
import { useState } from 'react';

const Terminal = () => {
  const { output, error, setOpenTerm } = useCodeContext();
  const [isClosing, setIsClosing] = useState(false);

  const hasError = Boolean(error);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => setOpenTerm(false), 300);
  };

  return (
    <pre style={{ color: hasError ? 'red' : 'dark', marginLeft: '.1rem', marginTop: '.1rem' }}>
      {error || output || ''}
    </pre>
  );
};

export default Terminal;
