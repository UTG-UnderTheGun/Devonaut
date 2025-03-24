"use client";
import Loading from "@/app/loading";
import './register.css';
import Link from "next/link";
import { useState } from "react";
import axios from 'axios';
import { useRouter } from "next/navigation";
import Image from "next/image";

export default function Register() {
	  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    password: '',
    termsAccepted: false
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [currentStep, setCurrentStep] = useState(1);

  // Handle input changes
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate form
    if (!formData.termsAccepted) {
      setError('Please accept the terms and conditions');
      return;
    }

    // Show loading screen
    setIsLoading(true);
    setError('');
    setSuccess('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setIsLoading(false);
      return;
    }

    try {
      // Register the user
      const response = await axios.post(`${API_BASE}/auth/register`, {
        username: formData.email,
        password: formData.password,
        email: formData.email,
        name: formData.name
      });

      // If registration successful, automatically log them in
      const loginResponse = await axios.post(`${API_BASE}/auth/token`, {
        username: formData.email,
        password: formData.password,
      }, {
        withCredentials: true,
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const { access_token } = loginResponse.data;
      sessionStorage.setItem('token', access_token);

      setSuccess('Registration successful! Redirecting...');

      // Redirect to skill level selection page
      setTimeout(() => {
        router.push('/auth/level');
      }, 1500);

    } catch (err) {
      console.error('Error during signup:', err);
      setError(err.response?.data?.detail || 'Registration failed. Please try again.');
      setIsLoading(false);
    }
  };

  // Show loading screen
  if (isLoading) {
    return <Loading />;
  }

  return (
    <div className="container">
      <main className="signin-card">
        <div className="progress-steps">
          <div className={`step ${currentStep >= 1 ? 'active' : 'inactive'}`}>1</div>
          <div className="progress-line"></div>
          <div className={`step ${currentStep >= 2 ? 'active' : 'inactive'}`}>2</div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Name</label>
            <input
              type="text"
              name="name"
              className="form-input"
              value={formData.name}
              onChange={handleChange}
              required
              placeholder="Enter your name"
              disabled={isLoading}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              type="email"
              name="email"
              className="form-input"
              value={formData.email}
              onChange={handleChange}
              required
              placeholder="Enter your Email"
              disabled={isLoading}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              type="password"
              name="password"
              className="form-input"
              value={formData.password}
              onChange={handleChange}
              required
              placeholder="Enter your password"
              disabled={isLoading}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Confirm Password</label>
            <input
              type="password"
              name="confirmPassword"
              className="form-input"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
              placeholder="Enter your password again"
              disabled={isLoading}
            />
          </div>

          <div className="remember-me">
            <input 
              type="checkbox" 
              id="terms"
              name="termsAccepted"
              checked={formData.termsAccepted}
              onChange={handleChange}
              disabled={isLoading}
            />
            <label htmlFor="terms">I agree to the Terms and Conditions</label>
          </div>

          <button 
            type="submit" 
            className="btn btn-primary"
            disabled={isLoading}
          >
            {isLoading ? 'REGISTERING...' : 'REGISTER'}
          </button>

          <button 
            type="button" 
            className="btn btn-google"
            disabled={isLoading}
          >
            <img 
              className="google-icon" 
              src="https://res.cloudinary.com/dstl8qazf/image/upload/v1738324966/7123025_logo_google_g_icon_1_apq8zk.png"
              alt="Google"
            />
            <span>REGISTER WITH GOOGLE</span>
          </button>

          {error && <div className="error-message">{error}</div>}
          {success && <div className="success-message">{success}</div>}

          <div className="signin-link">
            Already have an account?{' '}
            <Link href="/auth/signin">Sign In</Link>
          </div>
        </form>
      </main>
    </div>
  );
}
