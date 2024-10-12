"use client"
import { useEffect, useState } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import './home.css'
import HeadQuestion from '@/components/head-question';
import GlassBox from '@/components/glass-box';
import CodeQuestion from '@/components/code-question';
import CustomContextMenu from '@/components/custom-context-menu';
import Dropdown from '@/components/dropdown';
import ExplainQuestion from '@/components/explain-question';
import FillInQuestion from '@/components/FillIn-Question';
import Sidebar from '@/components/sidebar';

const HomePage = () => {
  const [user, setUser] = useState(null);
  const [error, setError] = useState(null);
  const [quiz, setQuiz] = useState([])
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
    setQuiz([...quiz, { id: quiz.length + 1, selected: selected }])
  }

  const createByType = (type) => {
    if (type === "Code") {
      return <CodeQuestion key={quiz.id} id={quiz.id} />
    } else if (type === "Explain") {
      return <ExplainQuestion />
    } else if (type === "Fill in") {
      return <FillInQuestion />
    }
  }

  const removeLastQuiz = () => {
    setQuiz(quiz.slice(0, -1))
  }

  return (
    <div className='homepage-container'>
      {error && <p>{error}</p>}
      <CustomContextMenu />
      <div className='home-container'>
        <div>
          <GlassBox size={{ minWidth: '1350px' }}>
            <div className='inner-home-container'>
              <HeadQuestion>test</HeadQuestion>
              <CodeQuestion>thanagrith</CodeQuestion>
              {quiz.map((quiz) => (
                createByType(quiz.selected)
              ))}
              <div className='action-button'>
                <button className="remove-last-quiz" onClick={removeLastQuiz} disabled={quiz.length === 0}><div style={{ fontSize: "26px", fontWeight: "bold" }}>-</div><div>Remove</div></button>
                <Dropdown options={['Code', 'Explain', 'Fill in']} onSelect={addQuiz} />
              </div>
            </div>
          </GlassBox>
        </div>
      </div >
      <Sidebar user={user?.username || "Not Auth User"} onLogout={handleLogout} />
    </div >
  );
};

export default HomePage;
