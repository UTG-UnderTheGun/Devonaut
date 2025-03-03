import { useState, useEffect } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';

/**
 * A custom React hook for handling user authentication state
 * 
 * This hook performs an authentication check on mount by making a request to the
 * backend API endpoint. It manages the authenticated user's state and handles
 * unauthorized scenarios by redirecting to the sign-in page.
 * 
 * @example
 * // Basic usage in a component
 * function MyProtectedComponent() {
 *   const { user, error } = useAuth();
 *   
 *   if (error) return <p>Authentication error</p>;
 *   if (!user) return <p>Loading...</p>;
 *   
 *   return <div>Welcome, {user.name}!</div>;
 * }
 * // or just
 * useAuth()
 * 
 * @description
 * The hook automatically:
 * - Checks authentication status on component mount
 * - Redirects to sign-in page if not authenticated
 * - Stores user data in state if authenticated
 * - Uses withCredentials to send cookies with the request
 */
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
