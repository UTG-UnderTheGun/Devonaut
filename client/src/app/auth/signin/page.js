'use client'
import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import './signin.css';
import Loading from "@/app/loading";

export default function Login() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    rememberMe: false
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const googleSignin = async (e) => {
    e.preventDefault();
    console.log("This is google sign in")

    try {
      window.location.href = 'http://localhost:8000/auth/google'
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
      const response = await axios.post('http://localhost:8000/auth/token', {
        username: formData.username,
        password: formData.password,
      }, {
        withCredentials: true,
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const { access_token } = response.data;

      if (formData.rememberMe) {
        localStorage.setItem('token', access_token);
      } else {
        sessionStorage.setItem('token', access_token);
      }

      setSuccess('Login successful! Redirecting...');

      setTimeout(() => {
        router.push('/auth/level');
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
          <div className="progress-line"></div>
          <div className="step inactive">2</div>
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
            Don't have an account? <Link href="/auth/signup">Sign up</Link>
          </div>
        </form>
      </main>
    </div>
  );
}
