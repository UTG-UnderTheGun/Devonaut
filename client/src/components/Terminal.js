import { useCodeContext } from '@/app/context/CodeContext';
import './Terminal.css';
import { useState, useRef, useEffect } from 'react';

const Terminal = () => {
  const { output, error, setOpenTerm } = useCodeContext();
  const [isClosing, setIsClosing] = useState(false);
  const [selectedText, setSelectedText] = useState('');
  const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0, text: '' });
  const [displayedOutput, setDisplayedOutput] = useState('');
  const terminalRef = useRef(null);

  const hasError = Boolean(error);

  // Update displayed output when output or error changes
  useEffect(() => {
    const newOutput = error || output || '';
    setDisplayedOutput(newOutput);
  }, [output, error]);

  // Listen for console output updates
  useEffect(() => {
    const handleOutputUpdate = (event) => {
      const { output: newOutput } = event.detail;
      setDisplayedOutput(newOutput);
    };

    window.addEventListener('console-output-updated', handleOutputUpdate);
    return () => window.removeEventListener('console-output-updated', handleOutputUpdate);
  }, []);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => setOpenTerm(false), 300);
  };

  const handleContextMenu = (e) => {
    e.preventDefault();
    const selection = window.getSelection();
    const text = selection.toString().trim();
    
    if (text) {
      setSelectedText(text);
      // Calculate position relative to terminal
      const terminalRect = terminalRef.current.getBoundingClientRect();
      setContextMenu({
        visible: true,
        x: e.clientX - terminalRect.left,
        y: e.clientY - terminalRect.top,
        text: text
      });
    } else {
      setContextMenu({ visible: false, x: 0, y: 0, text: '' });
    }
  };

  const handleAskAi = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    console.log('Ask AI button clicked');
    
    // Create the message for AI
    const messageText = hasError 
      ? `What caused this error?\n\`\`\`\n${contextMenu.text}\n\`\`\``
      : `Can you explain this console output?\n\`\`\`\n${contextMenu.text}\n\`\`\``;

    console.log('Creating message:', messageText);

    // Create message event
    const message = {
      id: Date.now(),
      text: messageText,
      isUser: true,
      timestamp: new Date()
    };

    try {
      // First dispatch the switch tab event
      const switchEvent = new CustomEvent('switch-description-tab', {
        detail: { 
          tab: 'ASK AI',
          pendingMessage: message
        }
      });
      window.dispatchEvent(switchEvent);
      console.log('Switch event dispatched');

      // Reset states
      setSelectedText('');
      setContextMenu({ visible: false, x: 0, y: 0, text: '' });
    } catch (error) {
      console.error('Error handling Ask AI:', error);
    }
  };

  // Hide context menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (terminalRef.current && !terminalRef.current.contains(event.target)) {
        setContextMenu({ visible: false, x: 0, y: 0, text: '' });
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('scroll', () => setContextMenu({ visible: false, x: 0, y: 0, text: '' }));
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('scroll', () => setContextMenu({ visible: false, x: 0, y: 0, text: '' }));
    };
  }, []);

  // Format error message for better display
  const formatErrorMessage = (message) => {
    if (!hasError) return message;
    
    return message.split('\n').map((line, index) => {
      if (line.includes('Traceback')) {
        return <div key={index} className="error-header">{line}</div>;
      } else if (line.includes('File "')) {
        return <div key={index} className="error-file">{line}</div>;
      } else if (line.includes('Error:')) {
        return <div key={index} className="error-type">{line}</div>;
      }
      return <div key={index}>{line}</div>;
    });
  };

  return (
    <div 
      ref={terminalRef}
      className="terminal-content"
      onContextMenu={handleContextMenu}
    >
      <pre style={{ 
        color: hasError ? 'red' : 'dark', 
        marginLeft: '.1rem', 
        marginTop: '.1rem',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word'
      }}>
        {formatErrorMessage(displayedOutput)}
      </pre>
      {contextMenu.visible && contextMenu.text && (
        <div
          className="context-menu"
          style={{
            position: 'absolute',
            left: `${contextMenu.x}px`,
            top: `${contextMenu.y}px`,
          }}
        >
          <button onClick={handleAskAi}>
            Ask AI
          </button>
        </div>
      )}
    </div>
  );
};

export default Terminal;
