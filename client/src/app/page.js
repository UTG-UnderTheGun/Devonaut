"use client"
import { useEffect, useState } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';

const HomePage = () => {
  const [user, setUser] = useState(null);
  const [error, setError] = useState(null);
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
      setUser(null); // Clear user state
      router.push('/auth/login'); // Redirect after logout
    } catch (err) {
      console.error('Error during logout:', err);
      setError('Logout failed, please try again.');
    }
  };

  return (
    <div>
      {error && <p>{error}</p>} {/* Display error message if any */}
      <h1>Welcome, {user?.username}!</h1>
      <button onClick={handleLogout}>Logout</button>
    </div>
  );
};

export default HomePage;
