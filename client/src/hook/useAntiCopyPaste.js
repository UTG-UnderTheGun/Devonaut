import { useEffect } from 'react';

/**
 * A custom React hook that prevents copy, cut, and paste operations
 * by blocking the keyboard shortcuts Ctrl+C, Ctrl+X, Ctrl+V, and 
 * Command+C, Command+X, Command+V on macOS.
 * 
 * @returns {void}
 */
const useAntiCopyPaste = () => {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.metaKey && (e.key === 'c' || e.key === 'v' || e.key === 'x')) {
        e.preventDefault();
      }
      if (e.ctrlKey && (e.key === 'c' || e.key === 'v' || e.key === 'x')) {
        e.preventDefault();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);
};

export default useAntiCopyPaste;
