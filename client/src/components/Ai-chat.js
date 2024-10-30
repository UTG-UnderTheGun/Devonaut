import './Ai-chat.css';
import { useState, useEffect, useRef } from 'react';
import { useCodeContext } from '@/app/context/CodeContext';
import Data from '@/api/data';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomOneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'; // Changed to a dark theme

export default function AiChat() {
  const { setOpenChat } = useCodeContext();

  const [textareaHeight, setTextareaHeight] = useState('auto');
  const [prompt, setPrompt] = useState("");
  const [user_id, setUser_id] = useState(null);
  const [chat, setChat] = useState([]);
  const chatDisplayRef = useRef(null);

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

  const handleAiChat = async () => {
    if (!user_id || !prompt) {
      console.warn("User ID or prompt is not set");
      return;
    }

    setChat(prevChat => [
      ...prevChat,
      { user: prompt, ai: '' }
    ]);

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

  const handleTextareaInput = (event) => {
    const textarea = event.target;
    textarea.style.height = 'auto';
    textarea.style.height = `${textarea.scrollHeight}px`;
    setTextareaHeight(`${textarea.scrollHeight}px`);
  };

  useEffect(() => {
    if (chatDisplayRef.current) {
      chatDisplayRef.current.scrollTop = chatDisplayRef.current.scrollHeight;
    }
  }, [chat]);

  const renderers = {
    code({ node, inline, className, children, ...props }) {
      const match = /language-(\w+)/.exec(className || '');

      return !inline && match ? (
        <SyntaxHighlighter
          language={match[1]}
          style={atomOneDark}
          PreTag="div"
          {...props}
        >
          {String(children).replace(/\n$/, '')}
        </SyntaxHighlighter>
      ) : (
        <code className={className} {...props}>
          {children}
        </code>
      );
    },
  };

  return (
    <div className="chat-container">
      <button className='close-chat' onClick={() => setOpenChat(false)} />
      <div className='display-message' ref={chatDisplayRef}>
        {chat.map((chatEntry, index) => (
          <div key={index} className='display-container'>
            <div className='user-prompt'>
              <div className='user-prompt-content'>
                {chatEntry.user}
              </div>
            </div>
            <div className='ai-response'>
              <div className='ai-response-content'>
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={renderers}
                >
                  {chatEntry.ai}
                </ReactMarkdown>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className='chat-box-container'>
        <textarea className='chat-box-input'
          placeholder='Type your message here...'
          onInput={handleTextareaInput}
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          style={{ height: textareaHeight, overflow: 'hidden' }}
        />
        <button className='chat-box-send' onClick={handleAiChat}>Send</button>
      </div>
    </div>
  );
}
