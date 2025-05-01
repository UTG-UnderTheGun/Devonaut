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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [importedCode, setImportedCode] = useState('');
  const [assignmentId, setAssignmentId] = useState('');
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
      setIsSubmitting(true);
      
      // Make sure we have the assignment ID
      const currentAssignmentId = assignmentId || localStorage.getItem('current-assignment-id');
      
      // Check if we have an assignment ID
      if (!currentAssignmentId) {
        console.error('No assignment ID found');
        alert('Cannot submit: No assignment ID found. Make sure you are working on an assigned task.');
        setIsSubmitting(false);
        return;
      }
      
      console.log(`Preparing to submit assignment ID: ${currentAssignmentId}`);
      
      // Get current code from the editor
      const currentCode = await importedCode || 
                           localStorage.getItem(`code-${currentAssignmentId}`) || 
                           '';
      
      // Get answers from localStorage
      const answersString = localStorage.getItem('problem-answers');
      let answers = {};
      
      try {
        if (answersString) {
          answers = JSON.parse(answersString);
        }
      } catch (e) {
        console.warn('Could not parse answers from localStorage', e);
      }
      
      // Get outputs from localStorage
      const outputsString = localStorage.getItem('problem-outputs');
      let outputs = {};
      
      try {
        if (outputsString) {
          outputs = JSON.parse(outputsString);
        }
      } catch (e) {
        console.warn('Could not parse outputs from localStorage', e);
      }
      
      // Get current exercise from localStorage
      const currentExerciseString = localStorage.getItem('current-exercise-id');
      let currentExerciseId = null;
      
      try {
        if (currentExerciseString) {
          currentExerciseId = JSON.parse(currentExerciseString);
        }
      } catch (e) {
        console.warn('Could not parse current exercise ID from localStorage', e);
      }
      
      // Organize the answers as per the required schema (Dict[int, Any])
      const formattedAnswers = {};
      
      // Process all answers and organize by exercise ID as the key
      // First handle any direct exercises stored with numeric keys
      Object.keys(answers).forEach(key => {
        if (!isNaN(Number(key))) {
          formattedAnswers[key] = answers[key];
        }
      });

      // Handle blank answers (format: blank-exerciseId-index)
      Object.keys(answers).forEach(key => {
        if (key.startsWith('blank-')) {
          const parts = key.split('-');
          if (parts.length >= 2) {
            const exerciseId = parts[1];
            if (!formattedAnswers[exerciseId]) {
              formattedAnswers[exerciseId] = {};
            }
            if (typeof formattedAnswers[exerciseId] === 'object') {
              formattedAnswers[exerciseId][key] = answers[key];
            }
          }
        }
      });
      
      // Handle coding answers - store them directly with the exercise ID
      Object.keys(answers).forEach(key => {
        if (key.startsWith('coding-')) {
          const parts = key.split('-');
          if (parts.length >= 2) {
            const exerciseId = parts[1];
            formattedAnswers[exerciseId] = answers[key];
          }
        }
      });
      
      // Process output answers
      Object.keys(outputs).forEach(key => {
        formattedAnswers[key] = outputs[key];
      });
      
      // If we have current code and current exercise, store it directly
      // This is critical for coding exercises
      if (currentCode && currentExerciseId) {
        // Get the current exercise to check its type
        try {
          // Try to get saved problems to find the current exercise
          const savedProblemsJson = localStorage.getItem('saved-problems');
          if (savedProblemsJson) {
            const savedProblems = JSON.parse(savedProblemsJson);
            // Find the current exercise
            const currentExercise = savedProblems.find(ex => 
              ex.id === currentExerciseId || 
              String(ex.id) === String(currentExerciseId)
            );
            
            // If this is a coding exercise, store the current code as the answer
            if (currentExercise && (currentExercise.type === 'coding' || currentExercise.type === 'code')) {
              console.log(`Storing coding answer for exercise ${currentExerciseId}: ${currentCode.substring(0, 30)}...`);
              formattedAnswers[currentExerciseId] = currentCode;
            }
          }
        } catch (e) {
          console.warn('Error checking current exercise type:', e);
          // As a fallback, assume this might be a coding exercise and store the code
          formattedAnswers[currentExerciseId] = currentCode;
        }
      }
      
      // Also check for any editor code that might be stored for a coding exercise
      try {
        const editorCode = localStorage.getItem('editorCode');
        if (editorCode && currentExerciseId) {
          // If we haven't already stored code for this exercise, store it now
          if (!formattedAnswers[currentExerciseId] || formattedAnswers[currentExerciseId] === '') {
            formattedAnswers[currentExerciseId] = editorCode;
            console.log(`Storing editor code for exercise ${currentExerciseId}`);
          }
        }
      } catch (e) {
        console.warn('Error getting editor code:', e);
      }

      // Get user details from localStorage or session
      const username = userData.username || localStorage.getItem('username') || sessionStorage.getItem('username') || '';
      const userId = localStorage.getItem('user_id') || sessionStorage.getItem('user_id') || '';

      // Prepare submission data according to the schema
      const submissionData = {
        id: String(Date.now()), // Generate a timestamp-based ID as per schema
        assignment_id: currentAssignmentId,
        user_id: userId,
        username: username,
        answers: formattedAnswers, // Using the Dict[int, Any] format required
        status: "pending",
        submitted_at: new Date().toISOString(),
      };

      // Confirm submission
      if (!confirm("Are you sure you want to submit this assignment? You won't be able to make changes after submission.")) {
        setIsSubmitting(false);
        return;
      }

      console.log('Submitting assignment with data:', submissionData);
      
      // Submit to the backend
      console.log(`Submitting to: ${API_BASE}/assignments/${currentAssignmentId}/submit`);
      const response = await axios.post(
        `${API_BASE}/assignments/${currentAssignmentId}/submit`, 
        submissionData,
        { withCredentials: true }
      );
      
      if (response.data.success) {
        // Show success message
        alert('Assignment submitted successfully! Your teacher will review and grade it soon.');
        
        // Clear localStorage of all data related to this assignment
        const keysToRemove = [
          `code-${currentAssignmentId}`,
          'problem-outputs',
          'problem-answers',
          `keystrokes-${currentAssignmentId}`,
          `code-history-${currentAssignmentId}`,
          'saved-problems',
          'problem-code',
          'editor-code',
          'is-imported',
          'current-assignment-id',
          'current-exercise-id'
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
    } finally {
      setIsSubmitting(false);
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

  // Extract assignment ID from the URL when component mounts
  useEffect(() => {
    const getAssignmentId = () => {
      // Check multiple potential sources for assignment ID
      let id = null;
      
      // Check URL parameters (priority source)
      if (typeof window !== 'undefined') {
        const urlParams = new URLSearchParams(window.location.search);
        id = urlParams.get('assignment');
        
        // If not in query params, check path for pattern like /assignment/1234
        if (!id && pathname) {
          const pathMatches = pathname.match(/\/assignment\/([^\/]+)/);
          if (pathMatches && pathMatches.length > 1) {
            id = pathMatches[1];
          }
        }
        
        // Check URL for pattern like /coding?id=1234
        if (!id) {
          const urlParams = new URLSearchParams(window.location.search);
          id = urlParams.get('id');
        }
      }
      
      // Check localStorage as fallback
      if (!id) {
        id = localStorage.getItem('current-assignment-id');
      }
      
      if (id) {
        // Save to state and localStorage for persistence
        setAssignmentId(id);
        localStorage.setItem('current-assignment-id', id);
        console.log(`Assignment ID found: ${id}`);
      } else {
        console.warn('No assignment ID found in URL or localStorage');
      }
      
      return id;
    };
    
    const id = getAssignmentId();
    
    // If we're on a coding page but don't have an ID, log a warning
    if (isCodingPage && !id) {
      console.warn('On coding page but no assignment ID found');
    }
  }, [pathname, isCodingPage]);

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
              <button onClick={handleSubmitCode} className="action-button submit" disabled={isSubmitting}>
                <span className="action-icon">⬆</span>
                {isSubmitting ? 'Submitting...' : 'Submit'}
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
