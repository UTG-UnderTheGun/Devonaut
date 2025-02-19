import { useState, useEffect } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';

const useAuth = () => {
  const [user, setUser] = useState(null);
  const [error, setError] = useState(null);
  const router = useRouter()

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await axios.get('http://localhost:8000/users/me', {
          withCredentials: true,
        });
        setUser(response.data);
      } catch (err) {
        console.error('Error fetching user:', err);
        setError('Not authenticated');
        if (router) router.push('/auth/signin');
      }
    };

    checkAuth();
  }, [router]);

  return { user, error };
};

export default useAuth;
