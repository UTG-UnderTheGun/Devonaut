"use client";

import React, { useState, useRef, useEffect } from "react";
import axios from "axios";

export default function Code() {
  const [input, setInput] = useState<string>("");
  const [response, setResponse] = useState<string>("");
  const chatBoxRef = useRef<HTMLDivElement>(null);  // Ref for scrolling

  const handleSend = async () => {
    if (input.trim()) {
      try {
        const result = await axios.post("http://127.0.0.1:8000/ask", {
          question: input,
        });
        setResponse(result.data.answer);
        setInput("");  // Clear input after sending
      } catch (error) {
        console.error("Error fetching response:", error);
        setResponse("An error occurred while getting the response.");
      }
    }
  };

  // Scroll to the bottom whenever the response changes
  useEffect(() => {
    if (chatBoxRef.current) {
      chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
    }
  }, [response]);

  return (
    <div className="bg-gray-100 flex items-center justify-center min-h-screen">
      <div className="chat-container w-full max-w-md bg-white rounded-lg shadow-lg flex flex-col">
        <div className="chat-header bg-pink-600 text-white p-4 rounded-t-lg text-center font-semibold text-lg">
          Big Blind
        </div>

        <div
          className="chat-box flex-1 p-4 overflow-y-auto space-y-4 flex flex-col-reverse"
          ref={chatBoxRef}
        >
          {/* Display AI response */}
          {response && (
            <div className="message ai-message flex items-start justify-start">
              <div className="bg-gray-300 text-gray-900 rounded-lg p-3 max-w-xs shadow-lg">
                {response}
              </div>
            </div>
          )}

          {/* Display user input */}
          {input && (
            <div className="message user-message flex items-start justify-end">
              <div className="bg-pink-500 text-white rounded-lg p-3 max-w-xs shadow-lg">
                {input}
              </div>
            </div>
          )}
        </div>

        <div className="chat-input border-t p-4 flex items-center space-x-3">
          <input
            type="text"
            className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
            placeholder="Type a message..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          <button
            className="bg-pink-600 text-white p-2 rounded-lg hover:bg-blue-700"
            onClick={handleSend}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
