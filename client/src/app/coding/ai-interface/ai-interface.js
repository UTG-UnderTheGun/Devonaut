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
  }).format(new Date(date));
};

const WELCOME_MESSAGE = {
  id: 0,
  text: "สวัสดีครับ! ผมเป็นผู้ช่วยด้านการเขียนโค้ด AI ที่พร้อมช่วยคุณครับ ผมสามารถช่วยคุณทำความเข้าใจปัญหา แก้ไขข้อผิดพลาดในโค้ด หรือแนะนำคุณไปสู่วิธีแก้ปัญหาได้ คุณอยากทราบเรื่องอะไรครับ?",
  isUser: false,
  timestamp: new Date()
};

const TypingIndicator = () => (
  <div className="typing-indicator">
    <div className="typing-dots">
      <div className="dot"></div>
      <div className="dot"></div>
      <div className="dot"></div>
    </div>
  </div>
);

const AIChatInterface = ({ user_id }) => {
  const [chat, setChat] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [questionsLeft, setQuestionsLeft] = useState(10);
  const messagesEndRef = useRef(null);
  const [isTyping, setIsTyping] = useState(false);
  
  const suggestions = [
    "How do I solve this problem?",
    "Can you explain the code?",
    "What's wrong with my solution?",
    "Give me a hint"
  ];

  // Load chat history and questions left from localStorage when component mounts
  useEffect(() => {
    if (user_id) {
      // Load chat history
      const savedChat = localStorage.getItem(`chat_${user_id}`);
      if (savedChat) {
        try {
          const parsedChat = JSON.parse(savedChat);
          setChat(parsedChat);
        } catch (error) {
          console.error('Error parsing saved chat:', error);
          localStorage.removeItem(`chat_${user_id}`);
        }
      } else {
        // If no chat history, just show welcome message
        setChat([]);
      }
      
      // Load questions left
      const savedQuestionsLeft = localStorage.getItem(`questionsLeft_${user_id}`);
      if (savedQuestionsLeft) {
        const questionsLeftValue = parseInt(savedQuestionsLeft, 10);
        if (!isNaN(questionsLeftValue)) {
          setQuestionsLeft(questionsLeftValue);
        }
      }
    }
  }, [user_id]);

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ 
        behavior: "smooth",
        block: "end"
      });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [chat]);

  const handleSendMessage = async () => {
    if (!user_id || !newMessage.trim() || questionsLeft <= 0) {
      return;
    }

    const userMessageObject = {
      id: chat.length + 1,
      text: newMessage,
      isUser: true,
      timestamp: new Date()
    };

    // Update chat with user message
    const updatedChat = [...chat, userMessageObject];
    setChat(updatedChat);
    
    // Save to localStorage
    localStorage.setItem(`chat_${user_id}`, JSON.stringify(updatedChat));
    
    setNewMessage('');
    
    // Update and save questions left
    setQuestionsLeft(prev => {
      const newValue = Math.max(0, prev - 1);
      localStorage.setItem(`questionsLeft_${user_id}`, newValue.toString());
      return newValue;
    });
    
    setIsTyping(true); // Show typing indicator

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

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let aiMessageObject = {
        id: chat.length + 2,
        text: '',
        isUser: false,
        timestamp: new Date(),
        isStreaming: true
      };

      // Add initial AI message and save to localStorage
      const chatWithAiMessage = [...updatedChat, aiMessageObject];
      setChat(chatWithAiMessage);
      localStorage.setItem(`chat_${user_id}`, JSON.stringify(chatWithAiMessage));

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        aiMessageObject.text += chunk;
        
        setChat(prev => {
          const newChat = [...prev];
          const lastMessage = newChat[newChat.length - 1];
          if (!lastMessage.isUser) {
            newChat[newChat.length - 1] = { ...aiMessageObject };
            // Save updated chat with new AI message content
            localStorage.setItem(`chat_${user_id}`, JSON.stringify(newChat));
          }
          return newChat;
        });
      }
      
      // Update final message to remove streaming flag once complete
      setChat(prev => {
        const newChat = [...prev];
        const lastMessage = newChat[newChat.length - 1];
        if (!lastMessage.isUser) {
          const updatedMessage = { 
            ...lastMessage, 
            isStreaming: false 
          };
          newChat[newChat.length - 1] = updatedMessage;
          // Save the final state
          localStorage.setItem(`chat_${user_id}`, JSON.stringify(newChat));
        }
        return newChat;
      });
    } catch (error) {
      console.error('Error:', error);
      const errorMessage = {
        id: chat.length + 2,
        text: 'Sorry, there was an error processing your request.',
        isUser: false,
        timestamp: new Date()
      };
      
      // Add error message and save to localStorage
      const chatWithError = [...updatedChat, errorMessage];
      setChat(chatWithError);
      localStorage.setItem(`chat_${user_id}`, JSON.stringify(chatWithError));
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleSuggestionClick = (suggestion) => {
    setNewMessage(suggestion);
  };

  const handleTextareaInput = (e) => {
    const textarea = e.target;
    textarea.style.height = '32px'; // Reset to single line height
    textarea.style.height = `${textarea.scrollHeight}px`;
    setNewMessage(e.target.value);
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
      <div className="message-content ai">
        <div className={`message-text ${message.isStreaming ? 'streaming' : ''}`}>
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {message.text}
          </ReactMarkdown>
        </div>
        <div className="message-time">{formatTime(message.timestamp)}</div>
      </div>
    );
  };

  // Add event listener for code explanation
  useEffect(() => {
    const handleExplainCode = async (event) => {
      const message = event.detail;
      
      // Add user message and save to localStorage
      const updatedChat = [...chat, message];
      setChat(updatedChat);
      localStorage.setItem(`chat_${user_id}`, JSON.stringify(updatedChat));
      
      // Decrement questions left and save
      setQuestionsLeft(prev => {
        const newValue = Math.max(0, prev - 1);
        localStorage.setItem(`questionsLeft_${user_id}`, newValue.toString());
        return newValue;
      });
      
      // Send message directly without setting input
      try {
        setIsTyping(true);
        const response = await fetch('http://localhost:8000/ai/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            user_id, 
            prompt: message.text 
          }),
        });

        if (!response.ok) {
          throw new Error('Network response was not ok');
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let aiMessageObject = {
          id: updatedChat.length + 1,
          text: '',
          isUser: false,
          timestamp: new Date(),
          isStreaming: true
        };

        // Add initial AI message
        const chatWithAiMessage = [...updatedChat, aiMessageObject];
        setChat(chatWithAiMessage);
        localStorage.setItem(`chat_${user_id}`, JSON.stringify(chatWithAiMessage));

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          aiMessageObject.text += chunk;
          
          setChat(prev => {
            const newChat = [...prev];
            const lastMessage = newChat[newChat.length - 1];
            if (!lastMessage.isUser) {
              newChat[newChat.length - 1] = { ...aiMessageObject };
              // Save updated chat with new AI message content
              localStorage.setItem(`chat_${user_id}`, JSON.stringify(newChat));
            } else {
              const updatedChatWithAi = [...newChat, aiMessageObject];
              localStorage.setItem(`chat_${user_id}`, JSON.stringify(updatedChatWithAi));
              return updatedChatWithAi;
            }
            return newChat;
          });
        }
        
        // Update final message to remove streaming flag once complete
        setChat(prev => {
          const newChat = [...prev];
          const lastMessage = newChat[newChat.length - 1];
          if (!lastMessage.isUser) {
            const updatedMessage = { 
              ...lastMessage, 
              isStreaming: false 
            };
            newChat[newChat.length - 1] = updatedMessage;
            // Save the final state
            localStorage.setItem(`chat_${user_id}`, JSON.stringify(newChat));
          }
          return newChat;
        });
      } catch (err) {
        console.error('Error sending message:', err);
        const errorMessage = {
          id: updatedChat.length + 1,
          text: 'An error occurred while getting the response.',
          isUser: false,
          timestamp: new Date()
        };
        
        // Add error message and save to localStorage
        const chatWithError = [...updatedChat, errorMessage];
        setChat(chatWithError);
        localStorage.setItem(`chat_${user_id}`, JSON.stringify(chatWithError));
      } finally {
        setIsTyping(false);
        scrollToBottom();
      }
    };

    window.addEventListener('add-chat-message', handleExplainCode);
    return () => window.removeEventListener('add-chat-message', handleExplainCode);
  }, [chat, user_id]);

  // Function to clear chat history
  const clearChat = () => {
    setChat([]);
    localStorage.removeItem(`chat_${user_id}`);
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
          {isTyping && (
            <div className="message-wrapper ai">
              <TypingIndicator />
            </div>
          )}
          <div ref={messagesEndRef} style={{ height: '1px' }} />
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
              onChange={handleTextareaInput}
              onKeyPress={handleKeyPress}
              placeholder="Ask a question about your code..."
              className="chat-input"
              disabled={questionsLeft === 0}
              rows={1}
              style={{ minHeight: '24px', maxHeight: '150px', overflowY: 'auto' }}
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
