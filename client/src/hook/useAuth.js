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
        const storedRole = localStorage.getItem('userRole') || sessionStorage.getItem('userRole');

        // Enforce teacher access restriction for student pages
        if (storedRole === 'teacher' && 
            (pathname.startsWith('/dashboard') || pathname.includes('/auth/level'))) {
          router.push('/teacher/dashboard');
          setIsLoading(false);
          return;
        }

        // Enforce student restriction for teacher pages
        if (storedRole !== 'teacher' && pathname.startsWith('/teacher')) {
          router.push('/dashboard');
          setError('Unauthorized access - Teacher role required');
          setIsLoading(false);
          return;
        }

        const response = await axios.get(`${API_BASE}/api/users/me`, {
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
        
        setUser(userWithRole);

        // Special handling for teachers - skip profile completion checks
        if (storedRole === 'teacher') {
          if (pathname.includes('/auth/profile') || pathname.includes('/auth/level')) {
            router.push('/teacher/dashboard');
            return;
          }
        } else {
          // For students, check if profile is complete
          const needsProfile = !userData.student_id || !userData.section || !userData.skill_level;
          
          if (needsProfile && 
              !pathname.includes('/auth/profile') && 
              !pathname.includes('/auth/level')) {
            router.push('/auth/profile');
            return;
          }
        }

        if (allowedRoles && !allowedRoles.includes(storedRole)) {
          if (storedRole === 'teacher') {
            router.push('/teacher/dashboard');
          } else {
            router.push('/dashboard');
          }
          setError('Unauthorized access');
          return;
        }

      } catch (err) {
        setError('Not authenticated');
        
        if (!pathname.includes('/auth/')) {
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
