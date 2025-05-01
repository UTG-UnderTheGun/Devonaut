import { useCodeContext } from '@/app/context/CodeContext';
import './Terminal.css';
import { useState, useRef, useEffect } from 'react';
import axios from 'axios';

const Terminal = () => {
  const { output, error, setOpenTerm, setOutput, setError } = useCodeContext();
  const [isClosing, setIsClosing] = useState(false);
  const [selectedText, setSelectedText] = useState('');
  const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0, text: '' });
  const [displayedOutput, setDisplayedOutput] = useState('');
  const [isWaitingForInput, setIsWaitingForInput] = useState(false);
  const [userInput, setUserInput] = useState('');
  const [cursorPosition, setCursorPosition] = useState(0);
  const terminalRef = useRef(null);
  const inputRef = useRef(null);
  const cursorRef = useRef(null);

  const hasError = Boolean(error);

  // Update cursor position when input changes
  useEffect(() => {
    if (cursorRef.current && inputRef.current) {
      // Calculate position based on text measurement
      const textMeasure = document.createElement('span');
      textMeasure.style.visibility = 'hidden';
      textMeasure.style.position = 'absolute';
      textMeasure.style.whiteSpace = 'pre';
      textMeasure.style.font = window.getComputedStyle(inputRef.current).font;
      textMeasure.textContent = userInput;
      document.body.appendChild(textMeasure);
      
      // Get the prompt width
      const promptWidth = document.querySelector('.terminal-prompt')?.offsetWidth || 0;
      
      // Position cursor after text plus prompt width
      const textWidth = textMeasure.offsetWidth;
      setCursorPosition(promptWidth + textWidth);
      
      // Clean up
      document.body.removeChild(textMeasure);
    }
  }, [userInput]);

  // Update displayed output when output or error changes
  useEffect(() => {
    const newOutput = error || output || '';
    
    // Always set the displayed output directly - no need to clean
    setDisplayedOutput(newOutput);
    
    // Check if we need input based on context data
    const contextData = window.lastResponseContext || {};
    if (!error && (contextData.needs_input || contextData.input_marker === "__INPUT_REQUIRED__")) {
      setIsWaitingForInput(true);
      if (inputRef.current) {
        setTimeout(() => {
          // Add null check inside the callback
          if (inputRef.current) {
            inputRef.current.focus();
          }
        }, 50);
      }
    } else {
      setIsWaitingForInput(false);
    }
  }, [output, error]);

  // Listen for console output updates
  useEffect(() => {
    const handleOutputUpdate = (event) => {
      const { output: newOutput, context } = event.detail;
      
      // Set output without any cleaning needed
      setDisplayedOutput(newOutput);
      
      // Check if we need input based on context
      if (context && (context.needs_input || context.input_marker === "__INPUT_REQUIRED__")) {
        setIsWaitingForInput(true);
        if (inputRef.current) {
          setTimeout(() => {
            // Add null check inside the callback
            if (inputRef.current) {
              inputRef.current.focus();
            }
          }, 50);
        }
      } else {
        setIsWaitingForInput(false);
      }
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

  // Handle form submission for input
  const handleInputSubmit = async (e) => {
    e.preventDefault();
    
    try {
      // Store current input and clear the field
      const input = userInput;
      setUserInput('');
      
      // Update the displayed output to include the user's input with prompt
      setDisplayedOutput(prevOutput => prevOutput + '$ ' + input + '\n');
      
      // Send the input to the server
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/code/send-input`,
        { input },
        { withCredentials: true }
      );
      
      // Store response context for later use
      window.lastResponseContext = {
        needs_input: response.data.needs_input || false,
        input_marker: response.data.input_marker || null
      };
      
      // Process the response
      if (response.data.error) {
        setError(response.data.error);
        setIsWaitingForInput(false);
      } else if (response.data.output) {
        // Check if there's an input marker or needs_input flag
        if (response.data.needs_input || response.data.input_marker === "__INPUT_REQUIRED__") {
          // Still waiting for more input
          setOutput(response.data.output);
          setDisplayedOutput(response.data.output);
          setIsWaitingForInput(true);
          if (inputRef.current) {
            setTimeout(() => {
              // Add null check inside the callback
              if (inputRef.current) {
                inputRef.current.focus();
              }
            }, 50);
          }
        } else {
          // Processing complete
          setOutput(response.data.output);
          setDisplayedOutput(response.data.output);
          setIsWaitingForInput(false);
        }
      }
    } catch (err) {
      console.error('Error sending input:', err);
      setError('Error connecting to the server');
      setIsWaitingForInput(false);
    }
  };

  // Clean output by removing any unwanted markers
  const cleanOutput = (output) => {
    if (!output) return '';
    // Remove any __INPUT_REQUIRED__ markers that might have slipped through
    return output.replace(/__INPUT_REQUIRED__/g, '');
  };

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
        color: hasError ? 'red' : 'inherit', 
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word'
      }}>
        {formatErrorMessage(cleanOutput(displayedOutput))}
        
        {/* Inline input area that appears when waiting for input */}
        {isWaitingForInput && (
          <form onSubmit={handleInputSubmit} className="terminal-input-container">
            <span className="terminal-prompt">$</span>
            <input
              type="text"
              ref={inputRef}
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              className="terminal-input"
              placeholder="Type here..."
              autoFocus
            />
            {/* Custom block cursor that follows text position */}
            <div 
              ref={cursorRef}
              className="terminal-block-cursor"
              style={{ left: `${cursorPosition}px` }}
            />
            <button type="submit" className="terminal-input-submit">
              Enter
            </button>
          </form>
        )}
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
