'use client'
import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import './signin.css';
import Loading from "@/app/loading";

export default function Login() {
  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    rememberMe: false
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [googleRedirectInfo, setGoogleRedirectInfo] = useState(null);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // Add effect to check if redirected from Google OAuth
  useEffect(() => {
    // Check for Google auth redirect data in URL hash or query params
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('oauth') && urlParams.has('needs_profile')) {
      const needsProfile = urlParams.get('needs_profile') === 'true';
      const isNew = urlParams.get('is_new') === 'true';
      
      // Store information for later use
      setGoogleRedirectInfo({ needsProfile, isNew });
      
      // Redirect to appropriate page
      if (needsProfile) {
        router.push('/auth/profile');
      } else {
        router.push('/dashboard');
      }
    }
  }, [router]);

  const googleSignin = async (e) => {
    e.preventDefault();
    console.log("Starting Google sign in")

    try {
      window.location.href = `${API_BASE}/auth/google`
    } catch (err) {
      console.error('Error during google login request')
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await axios.post(`${API_BASE}/auth/token`, {
        username: formData.username,
        password: formData.password,
      }, {
        withCredentials: true,
        headers: {
          'Content-Type': 'application/json',
        },
      });

      console.log('Full login response:', response.data);

      // Destructure and verify role
      const { access_token, role } = response.data;
      console.log('Extracted role:', role);

      if (!role) {
        console.error('No role received from server');
        setError('Authentication error: No role assigned');
        setIsLoading(false);
        return;
      }

      // Store role in localStorage/sessionStorage
      if (formData.rememberMe) {
        localStorage.setItem('token', access_token);
        localStorage.setItem('userRole', role);
      } else {
        sessionStorage.setItem('token', access_token);
        sessionStorage.setItem('userRole', role);
      }

      setSuccess('Login successful! Redirecting...');

      // Add role to headers for subsequent requests
      axios.defaults.headers.common['X-User-Role'] = role;

      const userResponse = await fetch(`${API_BASE}/users/me`, {
        credentials: 'include',
        headers: {
          'X-User-Role': role
        }
      });
      
      if (!userResponse.ok) {
        throw new Error('Failed to fetch user data');
      }

      const userData = await userResponse.json();
      console.log('User data from /users/me:', userData);

      setTimeout(() => {
        // If teacher, go directly to teacher dashboard
        if (role === 'teacher') {
          console.log('Redirecting to teacher dashboard...');
          router.push('/teacher/dashboard');
        } 
        // If student with complete profile, go to dashboard
        else if (userData.student_id && userData.section && userData.skill_level) {
          router.push('/dashboard');
        }
        // If student with partial profile (has student_id and section but no skill_level)
        else if (userData.student_id && userData.section) {
          router.push('/auth/level');
        }
        // If student without profile, go to profile page
        else {
          router.push('/auth/profile');
        }
      }, 1500);

    } catch (err) {
      console.error('Error during signin:', err);
      setError(err.response?.data?.detail || 'Login failed. Please check your credentials.');
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <Loading />;
  }

  return (
    <div className="container">
      <main className="signin-card">
        <div className="progress-steps">
          <div className="step active">1</div>
          <div className="progress-line active"></div>
          <div className="step inactive">2</div>
          <div className="progress-line"></div>
          <div className="step inactive">3</div>
        </div>

        <form onSubmit={handleSubmit}>
          {error && <div className="error-message">{error}</div>}
          {success && <div className="success-message">{success}</div>}

          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              type="text"
              name="username"
              className="form-input"
              required
              placeholder="Enter your Email"
              value={formData.username}
              onChange={handleChange}
              disabled={isLoading}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              type="password"
              name="password"
              className="form-input"
              required
              placeholder="Enter your password"
              value={formData.password}
              onChange={handleChange}
              disabled={isLoading}
            />
          </div>

          <div className="remember-me">
            <input
              type="checkbox"
              id="remember-me"
              name="rememberMe"
              checked={formData.rememberMe}
              onChange={handleChange}
              disabled={isLoading}
            />
            <label htmlFor="remember-me">Remember Me</label>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={isLoading}
          >
            {isLoading ? 'SIGNING IN...' : 'SIGN IN'}
          </button>

          <button
            type="button"
            className="btn btn-google"
            disabled={isLoading}
            onClick={googleSignin}
          >
            <Image
              className="google-icon"
              src="https://res.cloudinary.com/dstl8qazf/image/upload/v1738324966/7123025_logo_google_g_icon_1_apq8zk.png"
              alt="Google"
              width={24}
              height={24}
            />
            <span>SIGN IN WITH GOOGLE</span>
          </button>

          <div className="signup-link">
            Don't have an account? <Link href='/auth/signup'>Sign up</Link>
          </div>
        </form>
      </main>
    </div >
  );
}
