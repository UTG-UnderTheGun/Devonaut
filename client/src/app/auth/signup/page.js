"use client";
import GlassBox from "@/components/glass-box";
import './register.css';
import Link from "next/link";
import { useState } from "react";
import axios from 'axios';
import { useRouter } from "next/navigation";

export default function Register() {
  const router = useRouter();
  const [loading, setLoading] = useState(false)
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true)

    try {
      const response = await axios.post('http://localhost:8000/register', {
        username,
        password,
      });

      setSuccess('Registration successful! You can now log in.');
      setError('');
      setUsername('');
      setPassword('');

      router.push('login');

    } catch (err) {
      if (err.response) {
        setError(err.response.data.detail || 'Registration failed');
      } else {
        setError('No response from server');
      }
    } finally {
      setLoading(false)
    }

  };

  return (
    <div className="bg-cover bg-center min-h-screen flex items-center justify-center"
      style={{ backgroundImage: `url('/login.png')` }}>
      <GlassBox size={{ minWidth: '450px' }}>
        <div className="register-form-container">
          <div className="register-image-container">
            <img
              src="https://res.cloudinary.com/dstl8qazf/image/upload/f_auto,q_auto/v1/underthegun/hxvq5wvnp4xbxtnl7rrn"
              alt="Profile"
              width={100}
              height={100}
            />
          </div>
          <div className="register-text">
            <h1><strong>Register</strong></h1>
          </div>
          <div className="register-form">
            <form onSubmit={handleSubmit}>
              <div className="register-container">
                <div className="register-username">
                  <div>
                    <label>Username</label>
                  </div>
                  <div>
                    <input
                      type="text"
                      name="username"
                      onChange={(e) => setUsername(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div className="register-password">
                  <div>
                    <label>Password</label>
                  </div>
                  <div>
                    <input
                      type="password"
                      name="password"
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div className="register-btn">
                  <button type="submit">Register</button>
                </div>
                {error}
                <div className="link-login">
                  Go to&nbsp;<Link style={{ color: "#398EE9" }} href='login'>Login</Link>
                </div>
                <hr />
              </div>
            </form>
          </div>
          <div className="authgmail-container">
            <div className="register-gmail">
              <img src='/gmaillogo.png' alt="Gmail Logo" />
              <button>Register with Gmail</button>
            </div>
          </div>
        </div>
      </GlassBox>
    </div>
  );
}
