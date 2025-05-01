"use client";
import './profile.css';
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import axios from 'axios';
import Loading from "@/app/loading";

export default function Profile() {
  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    studentId: '',
    section: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Fetch user data on component mount
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const response = await axios.get(`${API_BASE}/users/me`, {
          withCredentials: true
        });
        
        const userData = response.data;
        
        // Pre-fill form with existing data if available
        setFormData({
          name: userData.name || '',
          studentId: userData.student_id || '',
          section: userData.section || ''
        });
        
        // If user has complete profile, redirect to skill level page
        if (userData.student_id && userData.section) {
          if (userData.skill_level) {
            // If user also has a skill level, go to dashboard
            router.push('/dashboard');
            return;
          }
          
          // Otherwise go to skill level selection
          router.push('/auth/level');
          return;
        }
        
      } catch (err) {
        console.error('Error fetching user data:', err);
        setError('Could not retrieve user information. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserData();
  }, [router]);

  // Handle input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Basic validation
    if (!formData.name || !formData.studentId || !formData.section) {
      setError('Please fill in all fields');
      return;
    }

    // Show loading screen
    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      // Update user profile
      const response = await axios.post(`${API_BASE}/users/profile`, {
        name: formData.name,
        student_id: formData.studentId,
        section: formData.section
      }, {
        withCredentials: true,
        headers: {
          'Content-Type': 'application/json',
        },
      });

      setSuccess('Profile information saved successfully! Redirecting...');

      // Redirect to skill level selection page
      setTimeout(() => {
        router.push('/auth/level');
      }, 1500);

    } catch (err) {
      console.error('Error updating profile:', err);
      setError(err.response?.data?.detail || 'Failed to update profile. Please try again.');
      setIsLoading(false);
    }
  };

  // Show loading screen
  if (isLoading) {
    return <Loading />;
  }

  return (
    <div className="container">
      <main className="profile-card">
        <div className="progress-steps">
          <div className="step active">1</div>
          <div className="progress-line active"></div>
          <div className="step active">2</div>
          <div className="progress-line inactive"></div>
          <div className="step inactive">3</div>
        </div>

        <h1 className="page-title">Complete Your Profile</h1>

        <form onSubmit={handleSubmit}>
          {error && <div className="error-message">{error}</div>}
          {success && <div className="success-message">{success}</div>}

          <div className="form-group">
            <label className="form-label">Full Name</label>
            <input
              type="text"
              name="name"
              className="form-input"
              value={formData.name}
              onChange={handleChange}
              required
              placeholder="Enter your full name"
              disabled={isLoading}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Student ID</label>
            <input
              type="text"
              name="studentId"
              className="form-input"
              value={formData.studentId}
              onChange={handleChange}
              required
              placeholder="Enter your student ID"
              disabled={isLoading}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Section</label>
            <select
              name="section"
              className="form-input"
              value={formData.section}
              onChange={handleChange}
              required
              disabled={isLoading}
            >
              <option value="">Select your section</option>
              <option value="760001">760001</option>
              <option value="760002">760002</option>
            </select>
          </div>

          <button 
            type="submit" 
            className="btn btn-primary"
            disabled={isLoading}
          >
            {isLoading ? 'SAVING...' : 'CONTINUE'}
          </button>
        </form>
      </main>
    </div>
  );
}
