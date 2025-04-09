import { useState } from 'react';
import { useRouter } from 'next/navigation';

export const useTUAuth = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const router = useRouter();

  const loginWithTU = async (username, password) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/auth/tu/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
        credentials: 'include', // Important for cookies
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Authentication failed');
      }

      setLoading(false);

      // Redirect to dashboard or home page after successful login
      router.push('/dashboard');

      return data;
    } catch (err) {
      setError(err.message);
      setLoading(false);
      throw err;
    }
  };

  return {
    loginWithTU,
    loading,
    error,
  };
};

