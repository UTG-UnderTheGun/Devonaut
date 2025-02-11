import React, { useState } from 'react';

// Custom Send Icon component
const SendIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M18.0703 8.50989L9.51026 4.22989C3.76026 1.34989 1.40026 3.70989 4.28026 9.45989L5.15026 11.1999C5.40026 11.7099 5.40026 12.2999 5.15026 12.8099L4.28026 14.5399C1.40026 20.2899 3.75026 22.6499 9.51026 19.7699L18.0703 15.4899C21.9103 13.5699 21.9103 10.4299 18.0703 8.50989ZM14.8403 12.7499H9.44026C9.03026 12.7499 8.69026 12.4099 8.69026 11.9999C8.69026 11.5899 9.03026 11.2499 9.44026 11.2499H14.8403C15.2503 11.2499 15.5903 11.5899 15.5903 11.9999C15.5903 12.4099 15.2503 12.7499 14.8403 12.7499Z" fill="currentColor"/>
  </svg>
);

const AIChatInterface = () => {
  const [messages, setMessages] = useState([
    {
      id: 1,
      text: "How to use def function in python?",
      isUser: true
    },
    {
      id: 2,
      text: "Use def followed by the function name and parentheses ().\nParameters are optional; if needed, list them inside the parentheses.\nThe return statement is optional; it sends back a result to the caller.",
      isUser: false
    },
    {
      id: 3,
      text: "What is the best programming language?",
      isUser: true
    },
    {
      id: 4,
      text: "There are many programming languages in the market that are used in designing and building websites, various applications and other tasks. All these languages are popular in their place and in the way they are used, and many programmers learn and use them.",
      isUser: false
    }
  ]);

  const [newMessage, setNewMessage] = useState('');
  const [questionsLeft, setQuestionsLeft] = useState(1);

  const handleSendMessage = () => {
    if (newMessage.trim() === '') return;
    
    setMessages(prev => [...prev, {
      id: prev.length + 1,
      text: newMessage,
      isUser: true
    }]);
    setNewMessage('');
    setQuestionsLeft(prev => Math.max(0, prev - 1));
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`max-w-[80%] ${message.isUser ? 'ml-auto' : 'mr-auto'}`}
          >
            {message.isUser ? (
              <div className="bg-[#3369FF] text-white px-6 py-3 rounded-t-3xl rounded-br-3xl">
                <p className="text-base font-bold">{message.text}</p>
              </div>
            ) : (
              <div className="flex gap-4">
                <div className="w-6 h-6 rounded-full bg-white shadow-sm flex items-center justify-center flex-shrink-0">
                  <img
                    src="/api/placeholder/12/18"
                    alt="AI"
                    className="w-3 h-4"
                  />
                </div>
                <div className="bg-[#EEEEEE] text-[#505050] px-6 py-3 rounded-t-3xl rounded-br-3xl">
                  <p className="text-base font-bold whitespace-pre-line">{message.text}</p>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
      
      <div className="p-4">
        <div className="bg-white rounded-2xl shadow-lg px-6 py-4 flex items-center gap-4">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="What's wrong with my code?"
            className="flex-1 text-[#3369FF] text-xl font-bold outline-none"
            disabled={questionsLeft === 0}
          />
          <span className="text-[#6A6A6A] text-xl font-bold">
            (You get {questionsLeft} question left.)
          </span>
          <button 
            onClick={handleSendMessage}
            disabled={questionsLeft === 0 || newMessage.trim() === ''}
            className="text-[#3369FF] disabled:text-gray-400"
          >
            <SendIcon />
          </button>
        </div>
      </div>
    </div>
  );
};

export default AIChatInterface;