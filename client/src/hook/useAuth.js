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
  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
  const [user, setUser] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  useEffect(() => {
    const checkAuth = async () => {
      try {
        console.log('Checking auth for path:', pathname);
        // Get stored role
        const storedRole = localStorage.getItem('userRole') || sessionStorage.getItem('userRole');
        console.log('Stored role:', storedRole);
        if (pathname.startsWith('/teacher') && storedRole !== 'teacher') {
          console.log('Unauthorized: Not a teacher, redirecting to dashboard');
          router.push('/dashboard');
          setError('Unauthorized access - Teacher role required');
          setIsLoading(false);
          return;
        }
        const response = await axios.get(`${API_BASE}/users/me`, {
          withCredentials: true,
          headers: {
            'X-User-Role': storedRole
          }
        });
        
        const userData = response.data;
        const userWithRole = {
          ...userData,
          role: storedRole
        };
        
        console.log('User data with role:', userWithRole);
        setUser(userWithRole);
        if (allowedRoles && !allowedRoles.includes(storedRole)) {
          console.log('Unauthorized role, redirecting to dashboard');
          router.push('/dashboard');
          setError('Unauthorized access');
          return;
        }
      } catch (err) {
        console.error('Auth check error:', err);
        setError('Not authenticated');
        
        if (!pathname.includes('/auth/')) {
          console.log('Not authenticated, redirecting to signin');
          router.push('/auth/signin');
        }
      } finally {
        setIsLoading(false);
      }
    };
    checkAuth();
  }, [router, pathname, allowedRoles]);
  return { user, error, isLoading };
};
export default useAuth;