import { useState, useEffect } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import { usePathname } from 'next/navigation';

/**
 * A custom React hook for handling user authentication and role-based access
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
const useAuth = (allowedRoles = null) => {
  const [user, setUser] = useState(null);
  const [error, setError] = useState(null);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await axios.get('http://localhost:8000/users/me', {
          withCredentials: true,
        });
        
        const userData = response.data;
        setUser(userData);

        // Check if path starts with /teacher
        const isTeacherRoute = pathname.startsWith('/teacher');
        
        // Role-based access control
        if (isTeacherRoute && userData.role !== 'teacher') {
          // If trying to access teacher route without teacher role
          console.log('Unauthorized access attempt to teacher route');
          router.push('/dashboard');
          setError('Unauthorized access');
          return;
        }

        // Check for specific allowed roles if provided
        if (allowedRoles && !allowedRoles.includes(userData.role)) {
          console.log('Unauthorized role');
          router.push('/dashboard');
          setError('Unauthorized access');
          return;
        }

      } catch (err) {
        console.error('Error fetching user:', err);
        setError('Not authenticated');
        
        // Only redirect to signin if not already there
        if (!pathname.includes('/auth/')) {
          router.push('/auth/signin');
        }
      }
    };

    checkAuth();
  }, [router, pathname, allowedRoles]);

  return { user, error };
};

export default useAuth;
