'use client'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useState, useEffect, useRef } from 'react'
import './header.css'
import './user-menu.css'

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
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const menuRef = useRef(null)
  const profileRef = useRef(null)
  
  const isHomePage = pathname === '/'
  const isCodingPage = pathname === '/coding'
  const shouldShowProfile = !isHomePage && pathname !== '/auth/signin' && pathname !== '/auth/signup'

  const handleRunCode = () => {
    console.log('Running code...')
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

  const handleSignOut = () => {
    console.log('Signing out...')
  }

  return (
    <header className="header">
      <div className="header-container">
        <div className="header-left">
          <Link href="/" className="logo">
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
            <div className="toolbar">
              <button onClick={handleRunCode} className="button run">
                Run Code
              </button>
              <button onClick={handleSubmitCode} className="button submit">
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