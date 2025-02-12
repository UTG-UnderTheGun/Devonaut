'use client';
import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Data from '@/api/data';
import './coding.css';
import Editor from '@/components/editor';
import Terminal from '@/components/Terminal';

export default function CodingPage() {
  const [chat, setChat] = useState([]);
  const [user_id, setUser_id] = useState(null);
  const [prompt, setPrompt] = useState("");
  const [code, setCode] = useState("# write code here");
  const [title, setTitle] = useState("solution.py");
  const [description, setDescription] = useState("");
  const [isConsoleFolded, setIsConsoleFolded] = useState(false);
  const [isDescriptionFolded, setIsDescriptionFolded] = useState(false);
  const [selectedTab, setSelectedTab] = useState('solution');
  const [selectedDescriptionTab, setSelectedDescriptionTab] = useState('Description');
  const [consoleOutput, setConsoleOutput] = useState('');
  const [isClientLoaded, setIsClientLoaded] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsClientLoaded(true);

      const storedTitle = localStorage.getItem('problem-title');
      const storedDescription = localStorage.getItem('problem-description');
      const storedCode = localStorage.getItem('editorCode');
      const storedConsoleFolded = localStorage.getItem('isConsoleFolded');
      const storedDescriptionFolded = localStorage.getItem('isDescriptionFolded');

      if (storedTitle) setTitle(storedTitle);
      if (storedDescription) setDescription(storedDescription);
      if (storedCode) setCode(storedCode);
      if (storedConsoleFolded) setIsConsoleFolded(storedConsoleFolded === 'true');
      if (storedDescriptionFolded) setIsDescriptionFolded(storedDescriptionFolded === 'true');
    }
  }, []);

  useEffect(() => {
    const handleImport = (event) => {
      const { title: newTitle, description: newDescription, code: newCode } = event.detail;

      if (newTitle) {
        setTitle(newTitle);
        localStorage.setItem('problem-title', newTitle);
      }

      if (newDescription) {
        setDescription(newDescription);
        localStorage.setItem('problem-description', newDescription);
      }

      if (newCode) {
        setCode(newCode);
        localStorage.setItem('editorCode', newCode);
      }
    };

    window.addEventListener('ide-data-import', handleImport);
    return () => window.removeEventListener('ide-data-import', handleImport);
  }, []);

  useEffect(() => {
    const initID = async () => {
      try {
        const responseData = await Data();
        setUser_id(responseData.user_id);
      } catch (err) {
        console.error(err);
      }
    };
    initID();
  }, []);

  useEffect(() => {
    if (isClientLoaded) {
      localStorage.setItem('editorCode', code);
      localStorage.setItem('isConsoleFolded', isConsoleFolded);
      localStorage.setItem('isDescriptionFolded', isDescriptionFolded);
      localStorage.setItem('problem-title', title);
      localStorage.setItem('problem-description', description);
    }
  }, [code, isConsoleFolded, isDescriptionFolded, title, description, isClientLoaded]);

  useEffect(() => {
    if (!isClientLoaded) return;

    const handleStorageChange = (e) => {
      if (e.key === 'ide-import-timestamp') {
        const newTitle = localStorage.getItem('problem-title');
        const newDescription = localStorage.getItem('problem-description');
        const newCode = localStorage.getItem('editorCode');

        if (newTitle) setTitle(newTitle);
        if (newDescription) setDescription(newDescription);
        if (newCode) setCode(newCode);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [isClientLoaded]);

  const handleTitleChange = (e) => {
    const newTitle = e.target.value;
    setTitle(newTitle);
    localStorage.setItem('problem-title', newTitle);
  };

  const handleDescriptionChange = (e) => {
    const newDescription = e.target.value;
    setDescription(newDescription);
    localStorage.setItem('problem-description', newDescription);
  };

  const handleCodeChange = (newCode) => {
    setCode(newCode);
    localStorage.setItem('editorCode', newCode);
  };

  const handleAiChat = async () => {
    if (!user_id || !prompt) {
      console.warn("User ID or prompt is not set");
      return;
    }
    setChat(prevChat => [...prevChat, { user: prompt, ai: '' }]);
    setPrompt("");

    try {
      const response = await fetch('http://localhost:8000/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ user_id, prompt }),
      });

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let responseMessage = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        responseMessage += chunk;
        setChat(prevChat => {
          const newChat = [...prevChat];
          newChat[newChat.length - 1].ai = responseMessage;
          return newChat;
        });
      }
    } catch (err) {
      console.error('Error sending message:', err);
      setChat(prevChat => [
        ...prevChat,
        { user: prompt, ai: 'An error occurred while getting the response.' }
      ]);
    }
  };

  const runCode = () => {
    setConsoleOutput('Running code...');
  };

  if (!isClientLoaded) {
    return <div className="coding-container">Loading...</div>;
  }

  return (
    <div className="coding-container">
      <div className="main-content">
        <div className={`description-panel ${isDescriptionFolded ? 'folded' : ''}`}>
          <div className="panel-header">
            <div className="description-tabs">
              <button
                className={`description-tab ${selectedDescriptionTab === 'Description' ? 'active' : ''}`}
                onClick={() => setSelectedDescriptionTab('Description')}
              >
                Description
              </button>
              <button
                className={`description-tab ${selectedDescriptionTab === 'ASK AI' ? 'active' : ''}`}
                onClick={() => setSelectedDescriptionTab('ASK AI')}
              >
                ASK AI
              </button>
            </div>
            <button
              className="fold-button"
              onClick={() => setIsDescriptionFolded(!isDescriptionFolded)}
            >
              {isDescriptionFolded ? '►' : '◄'}
            </button>
          </div>

          <div className="panel-content">
            {selectedDescriptionTab === 'Description' ? (
              <>
                <input
                  type="text"
                  value={title}
                  onChange={handleTitleChange}
                  className="w-full p-2 mb-4 text-xl font-bold bg-transparent border-b border-gray-300 focus:outline-none focus:border-blue-500"
                  placeholder="Enter problem title..."
                />
                <textarea
                  value={description}
                  onChange={handleDescriptionChange}
                  className="w-full h-40 p-2 mb-4 bg-transparent border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                  placeholder="Enter problem description..."
                />
              </>
            ) : (
              <div className="ask-ai-content">
                {chat.map((chatEntry, index) => (
                  <div key={index} className='display-container'>
                    <div className='user-prompt'>
                      <div className='user-prompt-content'>
                        {chatEntry.user}
                      </div>
                    </div>
                    <div className='ai-response'>
                      <div className='ai-response-content'>
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {chatEntry.ai}
                        </ReactMarkdown>
                      </div>
                    </div>
                  </div>
                ))}
                <div className='chat-box-container'>
                  <textarea
                    className='chat-box-input'
                    placeholder='Type your message here...'
                    value={prompt}
                    onChange={e => setPrompt(e.target.value)}
                  />
                  <button className='chat-box-send' onClick={handleAiChat}>Send</button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="editor-container">
          <div className="code-editor">
            <div className="editor-header">
              <div className="file-tabs">
                <div
                  className="tab"
                  aria-selected={selectedTab === 'solution'}
                  role="tab"
                  tabIndex={0}
                  onClick={() => setSelectedTab('solution')}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      setSelectedTab('solution');
                    }
                  }}
                >
                  {title}
                </div>
              </div>
            </div>
            <Editor
              isCodeQuestion={true}
              initialValue={code}
              onChange={handleCodeChange}
            />
          </div>

          <div className={`console ${isConsoleFolded ? 'folded' : ''}`}>
            <div className="console-header">
              <span>Console</span>
              <button
                className="fold-button"
                onClick={() => setIsConsoleFolded(!isConsoleFolded)}
              >
                {isConsoleFolded ? '▲' : '▼'}
              </button>
            </div>
            <div className="console-content">
              <Terminal />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
