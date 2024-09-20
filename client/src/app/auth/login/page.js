"use client";
import GlassBox from "@/components/glass-box";
import './login.css';
import Link from "next/link";
import { useState } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const router = useRouter()

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const response = await axios.post('http://localhost:8000/token', new URLSearchParams({
        username,
        password,
      }), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      setSuccess('Login successful!');
      setError('');

      const { access_token } = response.data;
      localStorage.setItem('token', access_token);
      router.push('/')

    } catch (err) {
      console.error('Error during login:', err);
      if (err.response) {
        setError(err.response.data.detail || 'Login failed');
      } else {
        setError('No response from server');
      }
    }
  };

  return (
    <div className="bg-cover bg-center min-h-screen flex items-center justify-center"
      style={{ backgroundImage: `url('/Login.png')` }}>
      <GlassBox size={{ minWidth: '450px' }}>
        <div className="login-form-container">
          <div className="login-image-container">
            <img
              src="https://res.cloudinary.com/dstl8qazf/image/upload/f_auto,q_auto/v1/underthegun/hxvq5wvnp4xbxtnl7rrn"
              alt="Profile"
              width={100}
              height={100}
            />
          </div>
          <div className="login-text">
            <h1><strong>Log in</strong></h1>
          </div>
          <div className="login-form">
            <form onSubmit={handleSubmit}>
              <div className="login-container">
                <div className="login-username">
                  <div>
                    <label>Username</label>
                  </div>
                  <div>
                    <input type="text" name="username" onChange={(e) => setUsername(e.target.value)} required />
                  </div>
                </div>
                <div className="login-password">
                  <div>
                    <label>Password</label>
                  </div>
                  <div>
                    <input type="password" name="password" onChange={(e) => setPassword(e.target.value)} required />
                  </div>
                </div>
                <div className="login-btn">
                  <button type="submit">Login</button>
                </div>
                <div className="link-register">
                  or&nbsp;<Link style={{ color: "#398EE9" }} href='signup'>register</Link>
                </div>
                <hr />
              </div>
            </form>
          </div>
          <div className="authgmail-container">
            <div className="login-gmail">
              <img src='/gmaillogo.png' />
              <button type="submit">Login with Gmail</button>
            </div>
          </div>
        </div>
      </GlassBox>
    </div >
  );
}

