'use client'
import { useCodeContext } from '@/app/context/CodeContext';
import StorageManager from './StorageManager';
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect, useRef } from 'react'
import './header.css'
import './user-menu.css'
import axios from 'axios';
import Loading from "@/app/loading";


const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const ChevronDown = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="chevron-icon"
  >
    <polyline points="6 9 12 15 18 9"></polyline>
  </svg>
)


const Header = () => {
  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
  const pathname = usePathname()
  const router = useRouter()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const menuRef = useRef(null)
  const profileRef = useRef(null)
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [userData, setUserData] = useState({
    username: '',
    fullName: '',
    firstName: '',
    email: ''
  });

  const isHomePage = pathname === '/'
  const isCodingPage = pathname.startsWith('/coding')
  
  // Hide user profile during signup/onboarding process
  const isOnboardingPage = pathname.includes('/auth/profile') || pathname.includes('/auth/level')
  const shouldShowProfile = !isHomePage && !isOnboardingPage && pathname !== '/auth/signin' && pathname !== '/auth/signup'
  
  const { code, setOutput, setError, setOpenTerm, output, error } = useCodeContext();


  const handleImport = (importedData) => {
    console.log('Imported data:', importedData);
  }

  const handleSubmitCode = async () => {
    try {
      // Confirm submission
      if (!confirm("Are you sure you want to submit this assignment? You won't be able to make changes after submission.")) {
        return;
      }

      console.log('Submitting assignment...');
      
      // Get assignment ID from URL if available
      const urlParams = new URLSearchParams(window.location.search);
      const assignmentId = urlParams.get('assignment');
      
      if (!assignmentId) {
        console.error('No assignment ID found in URL');
        alert('Cannot submit: No assignment ID found. Make sure you are working on an assigned task.');
        return;
      }

      // Collect all answers from localStorage
      let submissionData = {
        // Code and output from context
        code: code || '',
        output: output || '',
        error: error || '',
        
        // Problem-specific answers
        answers: {},
        
        // Additional metadata
        submitted_at: new Date().toISOString(),
        action_type: 'submit'
      };

      // Get code answers
      try {
        const savedCode = localStorage.getItem(`code-${assignmentId}`);
        if (savedCode) {
          submissionData.code = savedCode;
        }
      } catch (e) {
        console.warn('Could not get saved code', e);
      }

      // Get output/explain answers
      try {
        const savedOutputs = localStorage.getItem('problem-outputs');
        if (savedOutputs) {
          submissionData.answers.outputs = JSON.parse(savedOutputs);
        }
      } catch (e) {
        console.warn('Could not parse saved outputs', e);
      }

      // Get fill-in-blank answers
      try {
        const savedAnswers = localStorage.getItem('problem-answers');
        if (savedAnswers) {
          submissionData.answers.blanks = JSON.parse(savedAnswers);
        }
      } catch (e) {
        console.warn('Could not parse saved answers', e);
      }

      // Get any keystrokes history from localStorage
      try {
        const keystrokeHistory = localStorage.getItem(`keystrokes-${assignmentId}`);
        if (keystrokeHistory) {
          submissionData.keystroke_history = JSON.parse(keystrokeHistory);
        }
      } catch (e) {
        console.warn('Could not parse keystroke history', e);
      }

      // Get code run history from localStorage
      try {
        const codeHistory = localStorage.getItem(`code-history-${assignmentId}`);
        if (codeHistory) {
          submissionData.code_history = JSON.parse(codeHistory);
        }
      } catch (e) {
        console.warn('Could not parse code history', e);
      }
      
      // Submit to the backend
      const response = await axios.post(
        `${API_BASE}/assignments/${assignmentId}/submit`, 
        submissionData,
        { withCredentials: true }
      );
      
      if (response.data.success) {
        // Show success message
        alert('Assignment submitted successfully! Your teacher will review and grade it soon.');
        
        // Clear localStorage of all data related to this assignment
        const keysToRemove = [
          `code-${assignmentId}`,
          'problem-outputs',
          'problem-answers',
          `keystrokes-${assignmentId}`,
          `code-history-${assignmentId}`,
          'saved-problems',
          'problem-code',
          'editor-code',
          'is-imported'
        ];

        keysToRemove.forEach(key => {
          try {
            localStorage.removeItem(key);
          } catch (e) {
            console.warn(`Could not remove ${key} from localStorage`, e);
          }
        });
        
        // Redirect to dashboard after submission
        router.push('/dashboard');
      } else {
        alert('Error submitting assignment: ' + (response.data.message || 'Unknown error'));
      }
    } catch (err) {
      console.error('Error submitting assignment:', err);
      alert('Failed to submit assignment: ' + (err.response?.data?.detail || err.message));
    }
  }

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && profileRef.current &&
        !menuRef.current.contains(event.target) &&
        !profileRef.current.contains(event.target)) {
        setIsMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleRunCode = async () => {
    try {
      const response = await axios.post(`${API_BASE}/code/run-code`, {
        code,
      }, { withCredentials: true });
      if (response.data.error) {
        setError(response.data.error);
        setOutput('');
      } else {
        setOutput(response.data.output);
        setError('');
      }
    } catch (err) {
      console.log(err);
      setError('Error connecting to the server');
      setOutput('');
    }
  };

  const handleSignOut = async () => {
    try {
      setIsLoggingOut(true);
      setIsMenuOpen(false);

      await axios.post(`${API_BASE}/users/logout`, {}, {
        withCredentials: true
      });

      // Clear storage
      sessionStorage.clear();
      localStorage.clear();

      // Clear cookies
      document.cookie.split(";").forEach((c) => {
        document.cookie = c
          .replace(/^ +/, "")
          .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
      });

      // Redirect after a short delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      window.location.href = '/';

    } catch (err) {
      console.error('Error during logout:', err);
      setIsLoggingOut(false);
    }
  };

  // Add function to handle logo click
  const handleLogoClick = (e) => {
    e.preventDefault()
    if (shouldShowProfile) {  // If user is signed in
      router.push('/dashboard')
    } else {
      router.push('/')
    }
  }

  // Fetch user data
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const response = await axios.get(`${API_BASE}/users/me`, {
          withCredentials: true
        });
        
        const user = response.data;
        const email = user.email || user.username || '';
        const fullName = user.name || '';
        
        let firstName = '';
        if (user.name) {
          firstName = user.name.split(' ')[0];
        } else if (email.includes('@')) {
          firstName = email.split('@')[0];
        } else {
          firstName = user.username || email;
        }
        
        setUserData({
          username: user.username || email,
          email: email,
          fullName: fullName,
          firstName: firstName
        });
      } catch (err) {
        console.error('Error fetching user data:', err);
        const email = sessionStorage.getItem('email') || localStorage.getItem('email') || '';
        setUserData({
          username: email,
          email: email,
          fullName: '',
          firstName: email.split('@')[0]
        });
      }
    };

    if (shouldShowProfile) {
      fetchUserData();
    }
  }, [shouldShowProfile, API_BASE]);

  // Function to get the first letter of the user's name or email
  const getInitial = (text) => {
    if (!text) return '';
    
    // Try to get first letter of first name
    const initial = text.charAt(0).toUpperCase();
    
    // If it's not a valid letter, try to use the first letter of email
    if (/[A-Z]/.test(initial)) {
      return initial;
    } else if (userData.email) {
      return userData.email.charAt(0).toUpperCase();
    }
    
    return 'U'; // Ultimate fallback is "U" for User
  };

  // Show loading screen ONLY when logging out
  if (isLoggingOut) {
    return <Loading />;
  }

  return (
    <header className={`header ${isCodingPage ? 'coding-header' : ''}`}>
      <div className="header-container">
        <div className="header-left">
          <Link href="#" onClick={handleLogoClick} className="logo">
            <Image
              className="logo-img"
              src="https://res.cloudinary.com/dstl8qazf/image/upload/v1738323587/poker-chip_1_1_rxwagd.png"
              alt="Devonaut Logo"
              width={35}
              height={35}
              priority
            />
            <span className="logo-text">Devonaut</span>
          </Link>
        </div>

        <div className="header-center">
          {isCodingPage && (
            <div className="coding-actions">
              {/* <button onClick={handleRunCode} className="action-button run">
                <span className="action-icon">▶</span>
                Run
              </button> */}
              <button onClick={handleSubmitCode} className="action-button submit">
                <span className="action-icon">⬆</span>
                Submit
              </button>
            </div>
          )}
        </div>

        <div className="header-right">
          {isHomePage && (
            <Link href="/auth/signin" className="sign-in-button">
              SIGN IN
            </Link>
          )}

          {shouldShowProfile && (
            <div className="user-menu-container">
              <div
                className={`user-info ${isMenuOpen ? 'active' : ''}`}
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                ref={profileRef}
              >
                <div className="user-name-container">
                  <ChevronDown />
                  <span className="user-name">
                    {userData.firstName || userData.email.split('@')[0]}
                  </span>
                </div>
                <div className="user-profile">
                  <div className="user-avatar">
                    {getInitial(userData.firstName || userData.email)}
                  </div>
                </div>
              </div>

              <div
                ref={menuRef}
                className={`user-menu ${isMenuOpen ? 'active' : ''}`}
              >
                <div className="menu-header">
                  {userData.fullName ? (
                    <>
                      <div className="user-full-name">{userData.fullName}</div>
                      <div className="user-email">{userData.email}</div>
                    </>
                  ) : (
                    <div className="user-email">{userData.email}</div>
                  )}
                </div>

                <div className="">{/* menu-items */}
                  {/* <Link href="/profile" className="menu-item">
                    Profile
                  </Link>
                  <Link href="/settings" className="menu-item">
                    Settings
                  </Link> */}
                  <button
                    onClick={handleSignOut}
                    className="menu-item sign-out"
                    disabled={isLoggingOut}
                  >
                    {isLoggingOut ? 'Signing out...' : 'Sign Out'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

export default Header
