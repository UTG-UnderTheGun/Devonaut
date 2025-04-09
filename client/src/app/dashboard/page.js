'use client';
import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import './dashboard.css';
import useAuth from '@/hook/useAuth';
import DashboardSkeleton from './skeleton';
import axios from 'axios';

export default function Dashboard() {
  useAuth();
  const [activeTab, setActiveTab] = useState('UPCOMING');
  const [indicatorStyle, setIndicatorStyle] = useState({
    backgroundColor: 'var(--primary)' // Set default color right from the start
  });
  const tabsRef = useRef({});
  const [chapters, setChapters] = useState([]);
  const [performance, setPerformance] = useState({
    totalScore: 0,
    totalPossible: 0,
    chapters: []
  });
  const [isLoading, setIsLoading] = useState(true);
  
  // Add this state to force a re-render after component mounts
  const [isMounted, setIsMounted] = useState(false);

  // Set isMounted to true after component mounts
  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    // Fetch chapters and performance data
    const fetchData = async () => {
      try {
        setIsLoading(true);
        
        const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
        
        console.log('Fetching dashboard data...');
        
        // Fetch dashboard data from the new endpoint
        const response = await axios.get(`${API_BASE}/users/dashboard`, { 
          withCredentials: true 
        });
        
        const dashboardData = response.data;
        console.log('Dashboard data received:', dashboardData);
        
        // Update the state with the received data
        if (dashboardData.chapters && Array.isArray(dashboardData.chapters)) {
          console.log(`Setting ${dashboardData.chapters.length} chapters`);
          setChapters(dashboardData.chapters);
        } else {
          console.warn('No chapters array in dashboard data:', dashboardData);
          setChapters([]);
        }
        
        if (dashboardData.performance) {
          console.log('Setting performance data:', dashboardData.performance);
          setPerformance(dashboardData.performance);
        } else {
          console.warn('No performance data in dashboard response');
        }
        
        setIsLoading(false);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  // Update indicator position with a more reliable approach
  const updateIndicatorPosition = () => {
    const activeTabElement = tabsRef.current[activeTab];
    if (activeTabElement) {
      const container = activeTabElement.parentElement;
      const containerRect = container.getBoundingClientRect();
      const tabRect = activeTabElement.getBoundingClientRect();
      
      const relativeLeft = tabRect.left - containerRect.left;
      const relativeWidth = tabRect.width;
      
      setIndicatorStyle({
        width: `${relativeWidth}px`,
        transform: `translateX(${relativeLeft}px)`,
        backgroundColor: 'var(--primary)',
        opacity: 0.95
      });
    }
  };
  
  // Update indicator on tab change
  useEffect(() => {
    if (!isLoading) {
      // First immediate update
      updateIndicatorPosition();
      
      // Then set a delayed update to ensure measurements are accurate
      const timeout = setTimeout(() => {
        updateIndicatorPosition();
      }, 50);
      
      return () => clearTimeout(timeout);
    }
  }, [activeTab, isLoading, isMounted]);
  
  // Also update on mount and after loading completes
  useEffect(() => {
    if (!isLoading && isMounted) {
      updateIndicatorPosition();
    }
  }, [isLoading, isMounted]);

  // Update on window resize
  useEffect(() => {
    const handleResize = () => {
      updateIndicatorPosition();
    };

    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [activeTab, isLoading]);

  const handleTabClick = (tab) => {
    setActiveTab(tab);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getTimeStatus = (dueDate, dueTime, status) => {
    // If the assignment is already completed, use completed style
    if (status === 'COMPLETED') {
      // If it has been graded, show green
      return 'completed';
    }
    
    const deadline = new Date(dueDate + ' ' + dueTime);
    const now = new Date();
    const diffHours = (deadline - now) / (1000 * 60 * 60);
    
    if (deadline < now) {
      return 'overdue';
    }
    return diffHours <= 24 ? 'urgent' : 'normal';
  };

  const getChapterIcon = (problems) => {
    const nextProblem = problems.find(p => !p.completed);
    if (!nextProblem) return '✅';
    
    switch (nextProblem.type) {
      case 'coding':
        return '💻';
      case 'explain':
        return '📝';
      case 'fill':
        return '✏️';
      default:
        return '📚';
    }
  };

  const filteredChapters = chapters.filter(chapter => {
    switch (activeTab) {
      case 'UPCOMING':
        return chapter.status === 'UPCOMING';
      case 'OVERDUE':
        return chapter.status === 'OVERDUE';
      case 'COMPLETED':
        return chapter.status === 'COMPLETED';
      default:
        return true;
    }
  });

  const getTabCount = (status) => {
    return chapters.filter(chapter => chapter.status === status).length;
  };

  const completionPercentage = (performance.totalScore / performance.totalPossible) * 100;

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="dashboard">
      <nav className="tabs">
        <div className="tab-container">
          <div 
            className="tab-indicator tab-indicator-active" 
            style={indicatorStyle} 
          />
          {['UPCOMING', 'OVERDUE', 'COMPLETED'].map((tab) => (
            <button
              key={tab}
              ref={el => tabsRef.current[tab] = el}
              className="tab"
              data-selected={activeTab === tab ? "true" : "false"}
              onClick={() => handleTabClick(tab)}
            >
              {tab}
              <span className="tab-count">{getTabCount(tab)}</span>
            </button>
          ))}
        </div>
      </nav>

      <main className="dashboard-content">
        <section className="assignments">
          <div className="section-header">
            <h2>Chapter Assignments</h2>
            {filteredChapters.length > 0 && (
              <span className="section-subtitle">
                You have {filteredChapters.length} {activeTab.toLowerCase()} chapters
              </span>
            )}
          </div>
          
          <div className="assignment-list">
            {filteredChapters.length > 0 ? (
              filteredChapters.map((chapter) => (
                <Link href={chapter.link} key={chapter.id} className="assignment-link">
                  <div className={`assignment-card-dashboard ${getTimeStatus(chapter.dueDate, chapter.dueTime, chapter.status)}`}>
                    <div className="assignment-header">
                      <div className="assignment-info">
                        <div className="title-row">
                          <span className="assignment-icon">{getChapterIcon(chapter.problems)}</span>
                          <h3 className="assignment-title">{chapter.title}</h3>
                          {chapter.status === "COMPLETED" && chapter.score !== undefined && (
                            <span className="score-badge">{chapter.score}/{chapter.totalPoints}</span>
                          )}
                        </div>
                        <div className="assignment-meta">
                          <span className="assignment-chapter">{chapter.chapter}</span>
                          <span className="due-date">
                            <span className="calendar-icon">📅</span>
                            {formatDate(chapter.dueDate)}
                          </span>
                          <span className="due-time">
                            <span className="time-icon">⏰</span>
                            Due at {chapter.dueTime}
                          </span>
                        </div>
                        <div className="chapter-progress">
                          <div className="progress-bar">
                            <div 
                              className="progress-fill"
                              style={{ width: `${chapter.progress}%` }}
                            />
                          </div>
                          <span className="progress-text">
                            {chapter.progress}% Complete
                          </span>
                        </div>
                      </div>
                      <div className="assignment-actions">
                        <div className="assignment-points">{chapter.totalPoints} Points</div>
                        <span className="chevron-icon">›</span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))
            ) : (
              <div className="no-assignments">
                <p>No {activeTab.toLowerCase()} assignments</p>
              </div>
            )}
          </div>
        </section>

        <section className="performance">
          <div className="section-header2">
            <h2>Performance Overview</h2>
            <div className="overall-score">
              <span className="score-symbol">★</span>
              <span>{completionPercentage.toFixed(0)}% Complete</span>
            </div>
          </div>

          <div className="progress-container">
            {performance.chapters.map((chapter) => (
              <div key={chapter.id} className="progress-row">
                <div className="progress-info">
                  <span className="progress-label">{chapter.id}</span>
                  <span className="progress-title">{chapter.title}</span>
                </div>
                <div className="progress-bar">
                  <div 
                    className={`progress-fill ${chapter.completed ? 'complete' : 'partial'}`}
                    style={{ width: `${(chapter.score / chapter.total) * 100}%` }}
                  />
                </div>
                <span className="progress-score">
                  {chapter.score}/{chapter.total}
                </span>
              </div>
            ))}
            
            <div className="progress-row total">
              <div className="progress-info">
                <span className="progress-label">Total</span>
              </div>
              <div className="progress-bar">
                <div 
                  className="progress-fill partial"
                  style={{ width: `${completionPercentage}%` }}
                />
              </div>
              <span className="progress-score">
                {performance.totalScore}/{performance.totalPossible}
              </span>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}