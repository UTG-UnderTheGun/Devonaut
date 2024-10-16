import './Mocal-create.css';
import { useCodeContext } from '@/app/context/CodeContext';
import { useState } from 'react';

export default function ModalCreate() {
  const { setOpenCreate } = useCodeContext();
  const [isClosing, setIsClosing] = useState(false);

  const closeModal = () => {
    setIsClosing(true);
    setTimeout(() => {
      setOpenCreate(false);
    }, 500);
  };

  return (
    <div className={`modal-create-container ${isClosing ? 'fade-out' : 'active'}`}>
      <div className={`create-box ${isClosing ? 'slide-up' : ''}`}>
        <button className='close-create-modal' onClick={closeModal} />
        <div className='create-title'>
          Exercise Timeline
        </div>
        <hr style={{ marginBottom: "1.5rem" }} />
        <div className='create-datetime-container'>
          <div className='datetime'>
            <div className='datetime-content'>
              <div className='datetime-text'>Post date</div>
              <input className='datetime-input' type='date' />
            </div>
            <div className='datetime-content'>
              <div className='datetime-text'>Post time</div>
              <input className='datetime-input' type='time' />
            </div>
          </div>
        </div>
        <div className='create-datetime-container'>
          <div className='datetime'>
            <div className='datetime-content'>
              <div className='datetime-text'>Due date</div>
              <input className='datetime-input' type='date' />
            </div>
            <div className='datetime-content'>
              <div className='datetime-text'>Due time</div>
              <input className='datetime-input' type='time' />
            </div>
          </div>
        </div>
        <div className='create-datetime-container'>
          <div className='datetime'>
            <div className='datetime-content'>
              <div className='datetime-text'>Close date</div>
              <input className='datetime-input' type='date' />
            </div>
            <div className='datetime-content'>
              <div className='datetime-text'>Close time</div>
              <input className='datetime-input' type='time' />
            </div>
          </div>
        </div>
        <div className='create-confirm-container'>
          <button className='create-confirm-button'>Confirm</button>
        </div>
      </div>
    </div>
  );
}
