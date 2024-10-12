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

const HomePage = () => {
  const [user, setUser] = useState(null);
  const [error, setError] = useState(null);
  const [quiz, setQuiz] = useState([])
  const router = useRouter();

  // useEffect(() => {
  //   const fetchUser = async () => {
  //     try {
  //       const response = await axios.get('http://localhost:8000/users/me', {
  //         withCredentials: true,
  //       });
  //       setUser(response.data);
  //     } catch (err) {
  //       console.error('Error fetching user:', err);
  //       setError('Not authenticated');
  //       router.push('/auth/login');
  //     }
  //   };
  //
  //   fetchUser();
  // }, [router]);

  const handleLogout = async () => {
    try {
      await axios.post('http://localhost:8000/auth/logout', {}, {
        withCredentials: true,
      });
      setUser(null); // Clear user state
      router.push('/auth/login'); // Redirect after logout
    } catch (err) {
      console.error('Error during logout:', err);
      setError('Logout failed, please try again.');
    }
  };

  const addQuiz = () => {
    setQuiz([...quiz, { id: quiz.length + 1 }])
  }

  const removeLastQuiz = () => {
    setQuiz(quiz.slice(0, -1))
  }

  return (
    <div>
      {error && <p>{error}</p>} {/* Display error message if any */}
      <CustomContextMenu />
      <h1>Welcome, {user?.username}!</h1>
      <button onClick={handleLogout}>Logout</button>
      <div className='home-container'>
        <div>
          <GlassBox size={{ minWidth: '1350px' }}>
            <div className='inner-home-container'>
              <HeadQuestion>test</HeadQuestion>
              <CodeQuestion>thanagrith</CodeQuestion>
              {quiz.map((quiz) => (
                <CodeQuestion key={quiz.id} id={quiz.id}></CodeQuestion>
              ))}
              <div className='action-button'>
                <button className="remove-last-quiz" onClick={removeLastQuiz} disabled={quiz.length === 0}><div style={{ fontSize: "26px", fontWeight: "bold" }}>-</div><div>Remove</div></button>
                <Dropdown options={['Code', 'Explain', 'Fill in']} onSelect={addQuiz} />
              </div>
            </div>
          </GlassBox>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
