"use client"
import { useEffect, useState } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import './home.css'

import { useCodeContext } from './context/CodeContext';

import ModalCreate from '@/components/Modal-create';
import AiChat from '@/components/Ai-chat';
import HeadQuestion from '@/components/head-question';
import GlassBox from '@/components/glass-box';
import CodeQuestion from '@/components/code-question';
import CustomContextMenu from '@/components/custom-context-menu';
import Dropdown from '@/components/dropdown';
import ExplainQuestion from '@/components/explain-question';
import FillInQuestion from '@/components/FillIn-Question';
import Sidebar from '@/components/sidebar';
import Terminal from '../components/Terminal'

const HomePage = () => {
  const { openTerm, openChat, openCreate } = useCodeContext();

  const [user, setUser] = useState(null);
  const [error, setError] = useState(null);
  const [quiz, setQuiz] = useState([]);
  const [heartCount, setHeartCount] = useState(4); // Initialize heart count at 4
  const [showContextMenu, setShowContextMenu] = useState(false); // Show/Hide custom context menu
  const [contextPosition, setContextPosition] = useState({ x: 0, y: 0 });
  const [hasRequested, setHasRequested] = useState(false); // Prevent double-counting
  const router = useRouter();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await axios.get('http://localhost:8000/users/me', {
          withCredentials: true,
        });
        setUser(response.data);
      } catch (err) {
        console.error('Error fetching user:', err);
        setError('Not authenticated');
        router.push('/auth/login');
      }
    };

    fetchUser();
  }, [router]);

  // Close context menu on click outside
  useEffect(() => {
    const handleClickOutside = () => {
      setShowContextMenu(false);
      setHasRequested(false); // Reset flag on menu close
    };

    document.addEventListener('click', handleClickOutside);

    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, []);

  const handleRightClick = (e) => {
    e.preventDefault();
    setContextPosition({ x: e.pageX, y: e.pageY });
    setShowContextMenu(true);
  };

  // Decrease hearts only once per right-click action
  const requestAiHelp = () => {
    if (heartCount > 0 && !hasRequested) {
      setHeartCount(heartCount - 1);
      setHasRequested(true); // Set flag to prevent double-counting
      setShowContextMenu(false); // Close context menu after request
    }
  };

  const handleLogout = async () => {
    try {
      await axios.post('http://localhost:8000/auth/logout', {}, {
        withCredentials: true,
      });
      setUser(null);
      router.push('/auth/login');
    } catch (err) {
      console.error('Error during logout:', err);
      setError('Logout failed, please try again.');
    }
  };

  const addQuiz = (selected) => {
    setQuiz([...quiz, { id: quiz.length + 1, selected: selected }]);
  };

  const createByType = (type) => {
    if (type === "Code") {
      return <CodeQuestion key={quiz.id} id={quiz.id} />;
    } else if (type === "Explain") {
      return <ExplainQuestion />;
    } else if (type === "Fill in") {
      return <FillInQuestion />;
    }
  };

  const removeLastQuiz = () => {
    setQuiz(quiz.slice(0, -1));
  };

  return (
    <div className='homepage-container' onContextMenu={handleRightClick}>
      {error && <p>{error}</p>}
      <CustomContextMenu />

      {/* Display hearts with visual feedback */}
      {/* <div className="heart-container">
        {Array.from({ length: 4 }, (_, i) => (
          <span key={i} className={`heart ${i < heartCount ? 'filled' : 'broken'}`}>❤️</span>
        ))}
      </div> */}

      {/* Only allow AiChat if heart count is greater than 0 */}
      {openChat && heartCount > 0 && <AiChat onRequest={requestAiHelp} />}
      {openCreate && <ModalCreate />}

      <div className='home-container'>
        <div>
          <GlassBox size={{ minWidth: '1350px' }}>
            <div className='inner-home-container'>
              <HeadQuestion>Create</HeadQuestion>
              <CodeQuestion />
              {quiz.map((quiz) => (
                createByType(quiz.selected)
              ))}
              <div className='action-button'>
                <button className="remove-last-quiz" onClick={removeLastQuiz} disabled={quiz.length === 0}>
                  <div style={{ fontSize: "26px", fontWeight: "bold" }}>-</div>
                  <div>Remove</div>
                </button>
                <Dropdown options={['Code', 'Explain', 'Fill in']} onSelect={addQuiz} />
              </div>
            </div>
          </GlassBox>
        </div>
      </div >
      <Sidebar user={user?.username || "Not Auth User"} onLogout={handleLogout} />
      <div>
        {openTerm && <Terminal />}
      </div>

      {/* Custom context menu */}
      {showContextMenu && (
        <div
          className="context-menu"
          style={{ top: `${contextPosition.y}px`, left: `${contextPosition.x}px` }}
          onClick={requestAiHelp}
        >
          <p>Ask Teacher</p>
        </div>
      )}
    </div >
  );
};

export default HomePage;
