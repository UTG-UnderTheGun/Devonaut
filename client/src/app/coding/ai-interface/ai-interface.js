import React, { useState, useEffect, useRef } from 'react';
import './ai-interface.css';

const SendIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M20 4L3 11L10 14L13 21L20 4Z" fill="currentColor" />
  </svg>
);

const formatTime = (date) => {
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: 'numeric',
    hour12: true
  }).format(date);
};

const WELCOME_MESSAGE = {
  id: 0,
  text: "Hi! I'm your AI coding assistant. I can help you understand the problem, debug your code, or guide you towards a solution. What would you like to know?",
  isUser: false,
  timestamp: new Date()
};

const AIChatInterface = () => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [questionsLeft, setQuestionsLeft] = useState(5);
  const messagesEndRef = useRef(null);
  
  const suggestions = [
    "How do I solve this problem?",
    "Can you explain the code?",
    "What's wrong with my solution?",
    "Give me a hint"
  ];

  const handleSendMessage = () => {
    if (newMessage.trim() === '' || questionsLeft <= 0) return;
    
    const userMessage = {
      id: messages.length + 1,
      text: newMessage,
      isUser: true,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setNewMessage('');
    setQuestionsLeft(prev => Math.max(0, prev - 1));

    // Simulate AI response
    setTimeout(() => {
      const aiResponse = {
        id: messages.length + 2,
        text: "I understand your question. Let me help you with that...",
        isUser: false,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, aiResponse]);
    }, 1000);
  };

  // Only scroll when new messages are added (not including welcome message)
  useEffect(() => {
    if (messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleSuggestionClick = (suggestion) => {
    setNewMessage(suggestion);
  };

  return (
    <div className="chat-interface">
      <div className="chat-welcome">
        <div className="welcome-title">AI Coding Assistant</div>
        <div className="welcome-subtitle">Ask me anything about the problem or your code!</div>
      </div>

      <div className="chat-content">
        <div className="chat-messages">
          <div className="message-wrapper ai">
            <div className="ai-message-container">
              <div className="ai-avatar">AI</div>
              <div className="message-content ai">
                <div className="message-text">{WELCOME_MESSAGE.text}</div>
                <div className="message-time">{formatTime(WELCOME_MESSAGE.timestamp)}</div>
              </div>
            </div>
          </div>
          
          {messages.map((message) => (
            <div
              key={message.id}
              className={`message-wrapper ${message.isUser ? 'user' : 'ai'}`}
            >
              {message.isUser ? (
                <div className="message-content user">
                  <div className="message-text">{message.text}</div>
                  <div className="message-time">{formatTime(message.timestamp)}</div>
                </div>
              ) : (
                <div className="ai-message-container">
                  <div className="ai-avatar">AI</div>
                  <div className="message-content ai">
                    <div className="message-text">{message.text}</div>
                    <div className="message-time">{formatTime(message.timestamp)}</div>
                  </div>
                </div>
              )}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="bottom-section">
        <div className="suggestion-chips">
          {questionsLeft > 0 && suggestions.map((suggestion, index) => (
            <button
              key={index}
              className="suggestion-chip"
              onClick={() => handleSuggestionClick(suggestion)}
            >
              {suggestion}
            </button>
          ))}
        </div>
        
        <div className="chat-input-container">
          <div className="chat-input-wrapper">
            <textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask a question about your code..."
              className="chat-input"
              disabled={questionsLeft === 0}
              rows={1}
            />
            <div className="questions-counter">
              {questionsLeft} questions left
            </div>
            <button 
              onClick={handleSendMessage}
              disabled={questionsLeft === 0 || newMessage.trim() === ''}
              className="send-button"
            >
              <SendIcon />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIChatInterface;