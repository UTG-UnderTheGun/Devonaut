import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
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

const AIChatInterface = ({ user_id }) => {
  const [chat, setChat] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [questionsLeft, setQuestionsLeft] = useState(5);
  const messagesEndRef = useRef(null);
  
  const suggestions = [
    "How do I solve this problem?",
    "Can you explain the code?",
    "What's wrong with my solution?",
    "Give me a hint"
  ];

  const handleSendMessage = async () => {
    if (!user_id || !newMessage.trim() || questionsLeft <= 0) {
      console.warn("User ID or message is not set");
      return;
    }

    const userMessageObject = {
      id: chat.length + 1,
      text: newMessage,
      isUser: true,
      timestamp: new Date()
    };

    setChat(prev => [...prev, userMessageObject]);
    setNewMessage('');
    setQuestionsLeft(prev => Math.max(0, prev - 1));

    try {
      const response = await fetch('http://localhost:8000/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          user_id, 
          prompt: newMessage 
        }),
      });

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let aiMessageObject = {
        id: chat.length + 2,
        text: '',
        isUser: false,
        timestamp: new Date()
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        aiMessageObject.text += chunk;
        setChat(prev => {
          const newChat = [...prev];
          const lastMessage = newChat[newChat.length - 1];
          if (lastMessage.isUser) {
            return [...newChat, aiMessageObject];
          } else {
            newChat[newChat.length - 1] = { ...aiMessageObject };
            return newChat;
          }
        });
      }
    } catch (err) {
      console.error('Error sending message:', err);
      const errorMessage = {
        id: chat.length + 2,
        text: 'An error occurred while getting the response.',
        isUser: false,
        timestamp: new Date()
      };
      setChat(prev => [...prev, errorMessage]);
    }
  };

  useEffect(() => {
    if (chat.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [chat]);

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleSuggestionClick = (suggestion) => {
    setNewMessage(suggestion);
  };

  const renderMessage = (message) => {
    if (message.isUser) {
      return (
        <div className="message-content user">
          <div className="message-text">{message.text}</div>
          <div className="message-time">{formatTime(message.timestamp)}</div>
        </div>
      );
    }

    return (
      <div className="ai-message-container">
        <div className="message-content ai">
          <div className="message-text">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {message.text}
            </ReactMarkdown>
          </div>
          <div className="message-time">{formatTime(message.timestamp)}</div>
        </div>
      </div>
    );
  };

  return (
    <div className="chat-interface">
      <div className="chat-content">
        <div className="chat-messages">
          <div className="message-wrapper ai">
            {renderMessage(WELCOME_MESSAGE)}
          </div>
          
          {chat.map((message) => (
            <div
              key={message.id}
              className={`message-wrapper ${message.isUser ? 'user' : 'ai'}`}
            >
              {renderMessage(message)}
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