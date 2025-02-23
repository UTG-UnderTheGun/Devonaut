'use client';
import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import './dashboard.css';
import useAuth from '@/hook/useAuth';
export default function Dashboard() {
  useAuth();
  const [activeTab, setActiveTab] = useState('UPCOMING');
  const [indicatorStyle, setIndicatorStyle] = useState({});
  const tabsRef = useRef({});

  // Organize chapters by status
  const [chapters] = useState([
    {
      id: 1,
      title: 'For Loop Chapter',
      chapter: 'Chapter 6: For Loop',
      dueTime: '23:59',
      dueDate: '2024-02-25',
      totalPoints: 40,
      currentProblem: 1,
      totalProblems: 4,
      progress: 25,
      status: 'UPCOMING',
      link: '/coding',
      problems: [
        {
          type: 'explain',
          title: 'Understanding For Loops',
          points: 10,
          completed: true
        },
        {
          type: 'coding',
          title: 'Implement Basic For Loop',
          points: 10,
          completed: false
        },
        {
          type: 'fill',
          title: 'Fill in the Loop Components',
          points: 10,
          completed: false
        },
        {
          type: 'coding',
          title: 'Advanced For Loop Challenge',
          points: 10,
          completed: false
        }
      ]
    },
    {
      id: 2,
      title: 'While Loop Chapter',
      chapter: 'Chapter 7: While Loop',
      dueTime: '23:59',
      dueDate: '2024-01-30', // Past date for OVERDUE example
      totalPoints: 30,
      currentProblem: 1,
      totalProblems: 3,
      progress: 0,
      status: 'OVERDUE',
      link: '/coding',
      problems: [
        {
          type: 'explain',
          title: 'While Loop Concepts',
          points: 10,
          completed: false
        },
        {
          type: 'coding',
          title: 'While Loop Implementation',
          points: 10,
          completed: false
        },
        {
          type: 'fill',
          title: 'Complete the While Loop',
          points: 10,
          completed: false
        }
      ]
    },
    {
      id: 3,
      title: 'Variables Chapter',
      chapter: 'Chapter 1: Variables',
      dueTime: '23:59',
      dueDate: '2024-01-15',
      totalPoints: 20,
      currentProblem: 3,
      totalProblems: 3,
      progress: 100,
      status: 'COMPLETED',
      link: '/coding',
      problems: [
        {
          type: 'explain',
          title: 'Understanding Variables',
          points: 10,
          completed: true
        },
        {
          type: 'coding',
          title: 'Variable Declaration',
          points: 10,
          completed: true
        },
        {
          type: 'fill',
          title: 'Variable Usage',
          points: 10,
          completed: true
        }
      ]
    }
  ]);

  // Performance data
  const performance = {
    totalScore: 25,
    totalPossible: 70,
    chapters: [
      {
        id: 'Ch.6',
        title: 'For Loops',
        score: 10,
        total: 40,
        completed: false
      },
      {
        id: 'Ch.7',
        title: 'While Loops',
        score: 0,
        total: 30,
        completed: false
      }
    ]
  };

  useEffect(() => {
    const activeTabElement = tabsRef.current[activeTab];
    if (activeTabElement) {
      const parentLeft = activeTabElement.parentElement.getBoundingClientRect().left;
      const tabRect = activeTabElement.getBoundingClientRect();
      
      setIndicatorStyle({
        width: tabRect.width,
        transform: `translateX(${tabRect.left - parentLeft}px)`
      });
    }
  }, [activeTab]);

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

  const getTimeStatus = (dueDate, dueTime) => {
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

  // Filter chapters based on active tab
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

  // Get count for each tab
  const getTabCount = (status) => {
    return chapters.filter(chapter => chapter.status === status).length;
  };

  const completionPercentage = (performance.totalScore / performance.totalPossible) * 100;

  return (
    
    <div className="dashboard">
      <nav className="tabs">
        <div className="tab-container">
          <div className="tab-indicator" style={indicatorStyle} />
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
                  <div className={`assignment-card-dashboard ${getTimeStatus(chapter.dueDate, chapter.dueTime)}`}>
                    <div className="assignment-header">
                      <div className="assignment-info">
                        <div className="title-row">
                          <span className="assignment-icon">{getChapterIcon(chapter.problems)}</span>
                          <h3 className="assignment-title">{chapter.title}</h3>
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