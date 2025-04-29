import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import './ai-interface.css';
import { useSearchParams } from 'next/navigation';

const SendIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M20 4L3 11L10 14L13 21L20 4Z" fill="currentColor" />
  </svg>
);

const formatTime = (date) => {
  if (!date) return "Invalid Date"; // Handle missing date

  const parsedDate = new Date(date);
  if (isNaN(parsedDate.getTime())) return "Invalid Date"; // Handle incorrect format

  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: 'numeric',
    hour12: true
  }).format(parsedDate);
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

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const AIChatInterface = ({ user_id, exercise_id }) => {
  const [chat, setChat] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [questionsRemaining, setQuestionsRemaining] = useState(10);
  const [maxQuestions, setMaxQuestions] = useState(10);
  const [resetTimestamp, setResetTimestamp] = useState(null);
  const [timeUntilReset, setTimeUntilReset] = useState('');
  const messagesEndRef = useRef(null);
  const [isTyping, setIsTyping] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const timerRef = useRef(null);
  const previousExerciseIdRef = useRef(exercise_id);
  const initialLoadRef = useRef(true);
  const searchParams = useSearchParams();
  const assignmentId = searchParams ? searchParams.get('assignment') : null;
  const previousAssignmentIdRef = useRef(assignmentId);

  const suggestions = [
    "How do I solve this problem?",
    "Can you explain the code?",
    "What's wrong with my solution?",
    "Give me a hint"
  ];

  // Update timer display every minute
  useEffect(() => {
    const updateTimerDisplay = () => {
      if (!resetTimestamp) return;

      const now = new Date();
      const timeDiff = resetTimestamp - now;

      if (timeDiff <= 0) {
        // Reset time has passed, refresh question count
        fetchQuestionsRemaining();
        return;
      }

      // Calculate hours and minutes
      const hours = Math.floor(timeDiff / (1000 * 60 * 60));
      const minutes = Math.ceil((timeDiff % (1000 * 60 * 60)) / (1000 * 60));

      // Format display text
      let displayText = '';
      if (hours > 0) {
        displayText = `${hours}h ${minutes}m`;
      } else {
        displayText = `${minutes}m`;
      }

      setTimeUntilReset(displayText);
    };

    // Initial update
    updateTimerDisplay();

    // Clear existing timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    // Set up timer to update every minute
    timerRef.current = setInterval(updateTimerDisplay, 60000);

    // Cleanup on unmount
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [resetTimestamp]);

  // Listen for reset-chat-history event
  useEffect(() => {
    const handleResetChat = () => {
      console.log('Resetting AIChatInterface chat history');
      setChat([]);
      // Clear local storage for this specific exercise if available
      const chatKey = getChatStorageKey();
      localStorage.removeItem(chatKey);
    };

    window.addEventListener('reset-chat-history', handleResetChat);
    return () => window.removeEventListener('reset-chat-history', handleResetChat);
  }, [user_id, exercise_id]);

  // Track both exercise_id AND assignment_id changes and reset chat accordingly
  useEffect(() => {
    const exerciseChanged = previousExerciseIdRef.current !== exercise_id;
    const assignmentChanged = previousAssignmentIdRef.current !== assignmentId;
    
    console.log(`Exercise ID changed: ${exerciseChanged} (${previousExerciseIdRef.current} -> ${exercise_id})`);
    console.log(`Assignment ID changed: ${assignmentChanged} (${previousAssignmentIdRef.current} -> ${assignmentId})`);
    
    if (exerciseChanged || assignmentChanged) {
      previousExerciseIdRef.current = exercise_id;
      previousAssignmentIdRef.current = assignmentId;

      // If we're switching to a different exercise or assignment, reset the chat state
      console.log("Resetting chat state due to exercise or assignment change");
      setChat([WELCOME_MESSAGE]);

      // Load chat for the new exercise
      if (user_id) {
        loadChatForExercise();
        // Also refresh question count
        fetchQuestionsRemaining();
      }
    }
  }, [exercise_id, assignmentId, user_id]);

  // Load chat history from localStorage when component mounts or exercise changes
  useEffect(() => {
    if (user_id) {
      loadChatForExercise();
      // Fetch questions remaining from API
      fetchQuestionsRemaining();
    }

    // Cleanup function
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [user_id, exercise_id]);

  const getChatStorageKey = () => {
    // Include both assignment_id and exercise_id in the localStorage key
    if (assignmentId) {
      return exercise_id ? 
        `chat_${user_id}_${assignmentId}_${exercise_id}` : 
        `chat_${user_id}_${assignmentId}`;
    } else {
      return exercise_id ? 
        `chat_${user_id}_${exercise_id}` : 
        `chat_${user_id}`;
    }
  };

  const loadChatForExercise = async () => {
    if (!user_id) return;

    // Build the localStorage key that includes assignment context
    const chatKey = getChatStorageKey();
    console.log(`Loading chat for ${chatKey}`);

    try {
      // Build the API URL to fetch conversation history
      let url = `${API_BASE_URL}/ai/conversations?user_id=${user_id}`;
      if (exercise_id) {
        url += `&exercise_id=${exercise_id}`;
      }
      if (assignmentId) {
        url += `&assignment_id=${assignmentId}`;
      }

      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        // Transform backend messages to the frontend format
        if (data.messages && Array.isArray(data.messages)) {
          if (data.messages.length > 0) {
            const backendChat = data.messages.map((msg, index) => ({
              id: index + 1,
              text: msg.content,
              isUser: msg.role === "user",
              timestamp: msg.timestamp ? new Date(msg.timestamp) : new Date()
            }));
            setChat(backendChat);
            localStorage.setItem(chatKey, JSON.stringify(backendChat));
            console.log(`Loaded ${backendChat.length} messages from API for ${chatKey}`);
          } else {
            // No messages in the backend, set welcome message
            setChat([WELCOME_MESSAGE]);
            localStorage.setItem(chatKey, JSON.stringify([WELCOME_MESSAGE]));
            console.log(`No messages found, setting welcome message for ${chatKey}`);
          }
          return;
        } else {
          console.log('No messages found or invalid response structure:', data);
          setChat([WELCOME_MESSAGE]); // Set welcome message for new conversations
        }
      } else {
        console.log(`API response not OK: ${response.status}`);
      }
    } catch (error) {
      console.error("Error fetching conversation from backend:", error);
    }

    // Fallback: load chat from localStorage if backend fetch fails
    console.log(`Attempting to load chat from localStorage: ${chatKey}`);
    const savedChat = localStorage.getItem(chatKey);
    if (savedChat) {
      try {
        const parsedChat = JSON.parse(savedChat);
        setChat(parsedChat);
        console.log(`Loaded ${parsedChat.length} messages from localStorage for ${chatKey}`);
      } catch (error) {
        console.error("Error parsing saved chat:", error);
        localStorage.removeItem(chatKey);
        setChat([WELCOME_MESSAGE]);
      }
    } else {
      console.log(`No saved chat found in localStorage for ${chatKey}, using welcome message`);
      setChat([WELCOME_MESSAGE]);
    }
  };

  const fetchQuestionsRemaining = async () => {
    if (!user_id) return;

    setIsLoading(true);
    try {
      // Build the URL with both exercise_id and assignment_id if available
      let url = `${API_BASE_URL}/ai/questions/remaining?user_id=${user_id}`;
      if (exercise_id) {
        url += `&exercise_id=${exercise_id}`;
      }
      if (assignmentId) {
        url += `&assignment_id=${assignmentId}`;
      }

      console.log(`Fetching questions remaining from: ${url}`);
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error('Failed to fetch questions remaining');
      }

      const data = await response.json();
      setQuestionsRemaining(data.questions_remaining);
      setMaxQuestions(data.max_questions);

      // If hours_until_reset is provided, calculate the reset timestamp
      if (data.hours_until_reset !== undefined) {
        const hoursInMs = data.hours_until_reset * 60 * 60 * 1000;
        const resetTime = new Date(Date.now() + hoursInMs);
        setResetTimestamp(resetTime);
      }
    } catch (error) {
      console.error('Error fetching questions remaining:', error);
    } finally {
      setIsLoading(false);
    }
  };

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
    if (!user_id || !newMessage.trim() || questionsRemaining <= 0 || isLoading) {
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

    // Save to localStorage with assignment/exercise-specific key
    const chatKey = getChatStorageKey();
    localStorage.setItem(chatKey, JSON.stringify(updatedChat));

    setNewMessage('');
    setIsTyping(true); // Show typing indicator

    try {
      // Include both exercise_id and assignment_id in the request if available
      const requestBody = {
        user_id,
        prompt: newMessage
      };

      if (exercise_id) {
        requestBody.exercise_id = exercise_id;
      }
      
      if (assignmentId) {
        requestBody.assignment_id = assignmentId;
      }

      console.log(`Sending chat request with exercise_id: ${exercise_id}, assignment_id: ${assignmentId}`);
      const response = await fetch(`${API_BASE_URL}/ai/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
        throw new Error(errorData.detail || 'Network response was not ok');
      }

      // Refresh questions remaining after successful API call
      fetchQuestionsRemaining();

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
      localStorage.setItem(chatKey, JSON.stringify(chatWithAiMessage));

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
            localStorage.setItem(chatKey, JSON.stringify(newChat));
          } else {
            const updatedChatWithAi = [...newChat, aiMessageObject];
            localStorage.setItem(chatKey, JSON.stringify(updatedChatWithAi));
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
          localStorage.setItem(chatKey, JSON.stringify(newChat));
        }
        return newChat;
      });
    } catch (error) {
      console.error('Error:', error);

      // If we got a 403, it means we've reached the question limit
      if (error.message.includes('Question limit reached')) {
        setQuestionsRemaining(0);
      }

      const errorMessage = {
        id: updatedChat.length + 1,
        text: error.message || 'Sorry, there was an error processing your request.',
        isUser: false,
        timestamp: new Date()
      };

      // Add error message and save to localStorage
      const chatWithError = [...updatedChat, errorMessage];
      setChat(chatWithError);
      localStorage.setItem(chatKey, JSON.stringify(chatWithError));
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
      if (questionsRemaining <= 0) {
        // Notify user they've reached the limit
        const errorMessage = {
          id: chat.length + 1,
          text: "You've reached your question limit. Please contact support for more questions.",
          isUser: false,
          timestamp: new Date()
        };
        setChat(prev => [...prev, errorMessage]);

        // Save to localStorage with exercise-specific key if available
        const chatKey = getChatStorageKey();
        localStorage.setItem(chatKey, JSON.stringify([...chat, errorMessage]));
        return;
      }

      const message = event.detail;

      // Add user message and save to localStorage
      const updatedChat = [...chat, message];
      setChat(updatedChat);

      // Save to localStorage with exercise-specific key if available
      const chatKey = getChatStorageKey();
      localStorage.setItem(chatKey, JSON.stringify(updatedChat));

      // Send message directly without setting input
      try {
        setIsTyping(true);

        // Include exercise_id in the request if available
        const requestBody = {
          user_id,
          prompt: message.text
        };

        if (exercise_id) {
          requestBody.exercise_id = exercise_id;
        }

        const response = await fetch(`${API_BASE_URL}/ai/chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
          throw new Error(errorData.detail || 'Network response was not ok');
        }

        // Refresh questions remaining after successful API call
        fetchQuestionsRemaining();

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
        localStorage.setItem(chatKey, JSON.stringify(chatWithAiMessage));

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
              localStorage.setItem(chatKey, JSON.stringify(newChat));
            } else {
              const updatedChatWithAi = [...newChat, aiMessageObject];
              localStorage.setItem(chatKey, JSON.stringify(updatedChatWithAi));
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
            localStorage.setItem(chatKey, JSON.stringify(newChat));
          }
          return newChat;
        });
      } catch (error) {
        console.error('Error sending message:', error);

        // If we got a 403, it means we've reached the question limit
        if (error.message.includes('Question limit reached')) {
          setQuestionsRemaining(0);
        }

        const errorMessage = {
          id: updatedChat.length + 1,
          text: error.message || 'An error occurred while getting the response.',
          isUser: false,
          timestamp: new Date()
        };

        // Add error message and save to localStorage
        const chatWithError = [...updatedChat, errorMessage];
        setChat(chatWithError);
        localStorage.setItem(chatKey, JSON.stringify(chatWithError));
      } finally {
        setIsTyping(false);
        scrollToBottom();
      }
    };

    window.addEventListener('add-chat-message', handleExplainCode);
    return () => window.removeEventListener('add-chat-message', handleExplainCode);
  }, [chat, user_id, questionsRemaining, exercise_id]);

  return (
    <div className="chat-interface">
      <div className="chat-content">
        <div className="chat-messages">
          {chat.length === 0 && (
            <div className="message-wrapper ai">
              {renderMessage(WELCOME_MESSAGE)}
            </div>
          )}

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
          {questionsRemaining > 0 && suggestions.map((suggestion, index) => (
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
              disabled={questionsRemaining === 0 || isLoading}
              rows={1}
              style={{ minHeight: '24px', maxHeight: '150px', overflowY: 'auto' }}
            />
            <div className="questions-counter">
              {isLoading ?
                `${questionsRemaining > 0 ? questionsRemaining - 1 : 0} questions left${timeUntilReset ? ` • Reset in ${timeUntilReset}` : ''}` :
                `${questionsRemaining} questions left${timeUntilReset ? ` • Reset in ${timeUntilReset}` : ''}`}
            </div>
            <button
              onClick={handleSendMessage}
              disabled={questionsRemaining === 0 || newMessage.trim() === '' || isLoading}
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
