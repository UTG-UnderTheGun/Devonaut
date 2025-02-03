import './loading.css'

export default function Loading() {
  return (
    <div className="loading-container">
      <div className="loading-content">
        <div className="loading-logo">
          {/* Animated dots container */}
          <div className="loading-animation">
            <div className="animated-dots">
              <div className="dot dot1"></div>
              <div className="dot dot2"></div>
              <div className="dot dot3"></div>
              <div className="dot dot4"></div>
            </div>
            {/* Pulsing ring */}
            <div className="pulse-ring"></div>
          </div>
          
          {/* Logo text with animated gradient */}
          <div className="logo-container">
            <span className="gradient-text">Devonaut</span>
            {/* Loading progress text */}
            <span className="loading-text">Loading your coding journey...</span>
          </div>
        </div>
      </div>
    </div>
  )
}