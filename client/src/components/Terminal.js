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
    <div className={`terminal-container ${hasError ? 'error' : ''} ${isClosing ? 'closing' : ''}`}>
      <hr className='terminal-tab' />
      <div className='term-tabs'>
        <h2 style={{ color: 'white', fontWeight: 'bold', marginTop: '.5rem', marginBottom: '.5rem' }}>Terminal</h2>
        <button onClick={handleClose} className='close-term'></button>
      </div>
      <hr />
      <pre style={{ color: hasError ? 'red' : 'lime', marginLeft: '1rem', marginTop: '1rem' }}>
        {error || output || ''}
      </pre>
    </div>
  );
};

export default Terminal;
