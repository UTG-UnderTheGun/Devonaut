'use client'
import { useCodeContext } from '@/app/context/CodeContext';
import StorageManager from './StorageManager';
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect, useRef } from 'react'
import './header.css'
import './user-menu.css'
import axios from 'axios';  // เพิ่มบรรทัดนี้



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
  const pathname = usePathname()
  const router = useRouter()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const menuRef = useRef(null)
  const profileRef = useRef(null)

  const isHomePage = pathname === '/'
  const isCodingPage = pathname === '/coding'
  const shouldShowProfile = !isHomePage && pathname !== '/auth/signin' && pathname !== '/auth/signup'
  const { code, setOutput, setError, setOpenTerm, output, error } = useCodeContext();


  const handleImport = (importedData) => {
    console.log('Imported data:', importedData);
  }

  const handleSubmitCode = () => {
    console.log('Submitting code...')
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
        const response = await axios.post('http://localhost:8000/code/run-code', {
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
      await axios.post('http://localhost:8000/auth/logout', {}, {
        withCredentials: true,
      });
      setUser(null); // Clear user state
      router.push('/auth/login'); // Redirect after logout
      setUser(null);
      router.push('/auth/login');
    } catch (err) {
      console.error('Error during logout:', err);
      setError('Logout failed, please try again.');
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

  return (
    <header className="header">
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
              <button onClick={handleRunCode} className="action-button run">
                <span className="action-icon">▶</span>
                Run
              </button>
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
                className="user-info"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                ref={profileRef}
              >
                <div className="user-name-container">
                  <ChevronDown />
                  <span className="user-name">Nattakit</span>
                </div>
                <div className="user-profile">
                  <div className="user-avatar"></div>
                </div>
              </div>

              <div
                ref={menuRef}
                className={`user-menu ${isMenuOpen ? 'active' : ''}`}
              >
                <div className="menu-header">
                  <div className="user-full-name">Nattakit Ngamsanga</div>
                  <div className="user-email">nattakit.nga@example.com</div>
                </div>

                <div className="menu-items">
                  <Link href="/profile" className="menu-item">
                    Profile
                  </Link>
                  <Link href="/settings" className="menu-item">
                    Settings
                  </Link>
                  <button
                    onClick={handleSignOut}
                    className="menu-item sign-out"
                  >
                    Sign Out
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
