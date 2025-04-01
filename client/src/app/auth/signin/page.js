'use client'
import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
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
  const [showTULogin, setShowTULogin] = useState(false);
  const [tuFormData, setTuFormData] = useState({
    username: '',
    password: ''
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleTUChange = (e) => {
    const { name, value } = e.target;
    setTuFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const googleSignin = async (e) => {
    e.preventDefault();
    console.log("This is google sign in");

    try {
      window.location.href = `${API_BASE}/auth/google`;
    } catch (err) {
      console.error('Error during google login request');
    }
  };

  const tuSignin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await axios.post(`${API_BASE}/auth/tu/login`, {
        username: tuFormData.username,
        password: tuFormData.password,
      }, {
        withCredentials: true,
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const { token } = response.data;

      // Store token in sessionStorage
      sessionStorage.setItem('token', token);

      setSuccess('TU Authentication successful! Redirecting...');

      const userResponse = await fetch(`${API_BASE}/users/me`, {
        credentials: 'include'
      });
      const userData = await userResponse.json();

      setTimeout(() => {
        if (userData.skill_level) {
          // router.push('/dashboard');
          router.push('/coding');
        } else {
          router.push('/auth/level');
        }
      }, 1500);

    } catch (err) {
      console.error('Error during TU signin:', err);
      setError(err.response?.data?.detail || 'TU Login failed. Please check your credentials.');
      setIsLoading(false);
    }
  };

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

      console.log('Full login response:', response.data); // Debug log

      // Destructure and verify role
      const { access_token, role } = response.data;
      console.log('Extracted role:', role); // Debug log

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

      console.log('Stored role:', localStorage.getItem('userRole') || sessionStorage.getItem('userRole')); // Verify storage

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
      console.log('User data from /users/me:', userData); // Debug log

      setTimeout(() => {
        if (role === 'teacher') {
          console.log('Redirecting to teacher dashboard...'); // Debug log
          // router.push('/teacher/dashboard');
          router.push('/coding');
        } else if (userData.skill_level) {
          // router.push('/dashboard');
          router.push('/coding');
        } else {
          router.push('/auth/level');
        }
      }, 1500);

    } catch (err) {
      console.error('Error during signin:', err);
      setError(err.response?.data?.detail || 'Login failed. Please check your credentials.');
      setIsLoading(false);
    }
  };

  const toggleTULogin = () => {
    setShowTULogin(!showTULogin);
    setError('');
  };

  if (isLoading) {
    return <Loading />;
  }

  return (
    <div className="container">
      <main className="signin-card">
        <div className="progress-steps">
          <div className="step active">1</div>
          <div className="progress-line"></div>
          <div className="step inactive">2</div>
        </div>

        {showTULogin ? (
          <form onSubmit={tuSignin}>
            <div className="tu-icon-container">
              <Image
                className="tu-icon"
                src="https://res.cloudinary.com/dotqm6po2/image/upload/v1743528711/2048px-Emblem_of_Thammasat_University.svg_le62nb.png"
                alt="Thammasat University"
                width={150}
                height={150}
              />
            </div>
            <h2 className="tu-login-title">Thammasat University Login</h2>
            {error && <div className="error-message">{error}</div>}
            {success && <div className="success-message">{success}</div>}

            <div className="form-group">
              <label className="form-label">TU Username</label>
              <input
                type="text"
                name="username"
                className="form-input"
                required
                placeholder="Enter your TU username"
                value={tuFormData.username}
                onChange={handleTUChange}
                disabled={isLoading}
              />
            </div>

            <div className="form-group">
              <label className="form-label">TU Password</label>
              <input
                type="password"
                name="password"
                className="form-input"
                required
                placeholder="Enter your TU password"
                value={tuFormData.password}
                onChange={handleTUChange}
                disabled={isLoading}
              />
            </div>

            <button
              type="submit"
              className="btn btn-tu"
              disabled={isLoading}
            >
              {isLoading ? 'SIGNING IN...' : 'SIGN IN WITH TU'}
            </button>

            <button
              type="button"
              className="btn btn-secondary"
              onClick={toggleTULogin}
              disabled={isLoading}
            >
              BACK TO REGULAR LOGIN
            </button>
          </form>
        ) : (
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

            <button
              type="button"
              className="btn btn-tu"
              disabled={isLoading}
              onClick={toggleTULogin}
            >
              <Image
                className="tu-icon"
                src="https://res.cloudinary.com/dotqm6po2/image/upload/v1743528711/2048px-Emblem_of_Thammasat_University.svg_le62nb.png"
                alt="Thammasat University"
                width={24}
                height={24}
              />
              <span>SIGN IN WITH THAMMASAT</span>
            </button>

            <div className="signup-link">
              Don't have an account? <Link href='/auth/signup'>Sign up</Link>
            </div>
          </form>
        )}
      </main>
    </div>
  );
}
