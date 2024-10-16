import './Ai-chat.css'
import { useState } from 'react';
import { useCodeContext } from '@/app/context/CodeContext'

export default function AiChat() {
  const { setOpenChat } = useCodeContext()
  const [textareaHeight, setTextareaHeight] = useState('auto'); // State for textarea height

  const handleTextareaInput = (event) => {
    const textarea = event.target;
    textarea.style.height = 'auto';
    textarea.style.height = `${textarea.scrollHeight}px`;
    setTextareaHeight(`${textarea.scrollHeight}px`);
  };

  return (
    <div className="chat-container">
      <button className='close-chat' onClick={() => setOpenChat(false)} />
      <div className='display-message'>
        this is display message
      </div>
      <div className='chat-box-container'>
        <textarea className='chat-box-input'
          placeholder='message'
          onInput={handleTextareaInput}
          style={{ height: textareaHeight, overflow: 'hidden' }}
        />
        <button className='chat-box-send'>send</button>
      </div>
    </div>
  )
}
