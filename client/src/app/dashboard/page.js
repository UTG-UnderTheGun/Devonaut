'use client';
import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import './dashboard.css';

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState('UPCOMING');
  const [indicatorStyle, setIndicatorStyle] = useState({});
  const tabsRef = useRef({});

  useEffect(() => {
    // Update indicator position when active tab changes
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

  const assignments = [
    {
      id: 1,
      title: 'For Loop Assignment',
      chapter: 'Chapter 6 For Loop',
      dueTime: '23:59',
      dueDate: '2024-02-02',
      points: 10,
      link: '/coding',
      status: 'pending'
    },
    {
      id: 2,
      title: 'While Loop Assignment',
      chapter: 'Chapter 7 While Loop',
      dueTime: '23:59',
      dueDate: '2024-02-03',
      points: 10,
      status: 'pending'
    }
  ];

  const exercises = [
    { id: 'Ex.1', score: 10, total: 10, completed: true, title: 'Basic Loops' },
    { id: 'Ex.2', score: 0, total: 10, completed: false, title: 'Nested Loops' },
    { id: 'Ex.3', score: 0, total: 10, completed: false, title: 'Loop Control' },
  ];

  const totalScore = exercises.reduce((sum, ex) => sum + ex.score, 0);
  const totalPossible = exercises.reduce((sum, ex) => sum + ex.total, 0);
  const completionPercentage = (totalScore / totalPossible) * 100;

  const getTimeStatus = (dueDate, dueTime) => {
    const deadline = new Date(dueDate + ' ' + dueTime);
    const now = new Date();
    const diffHours = (deadline - now) / (1000 * 60 * 60);
    return diffHours <= 24 ? 'urgent' : 'normal';
  };

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
              {tab === 'UPCOMING' && <span className="tab-count">{assignments.length}</span>}
            </button>
          ))}
        </div>
      </nav>

      <main className="dashboard-content">
        <section className="assignments">
          <div className="section-header">
            <h2>Assignments</h2>
            {assignments.length > 0 && (
              <span className="section-subtitle">You have {assignments.length} pending assignments</span>
            )}
          </div>
          
          <div className="assignment-list">
            {assignments.map((assignment) => (
              <AssignmentCard 
                key={assignment.id}
                assignment={assignment}
                timeStatus={getTimeStatus(assignment.dueDate, assignment.dueTime)}
              />
            ))}
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
            {exercises.map((exercise) => (
              <div key={exercise.id} className="progress-row">
                <div className="progress-info">
                  <span className="progress-label">{exercise.id}</span>
                  <span className="progress-title">{exercise.title}</span>
                </div>
                <div className="progress-bar">
                  <div 
                    className={`progress-fill ${exercise.completed ? 'complete' : ''}`}
                    style={{ width: `${(exercise.score / exercise.total) * 100}%` }}
                  />
                </div>
                <span className="progress-score">
                  {exercise.score}/{exercise.total}
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
                {totalScore}/{totalPossible}
              </span>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

function AssignmentCard({ assignment, timeStatus }) {
  return (
    <Link href={assignment.link || '#'} className="assignment-link">
      <div className={`assignment-card-dashboard ${timeStatus}`}>
        <div className="assignment-header">
          <div className="assignment-info">
            <div className="title-row">
              <span className="assignment-icon">📚</span>
              <h3 className="assignment-title">{assignment.title}</h3>
            </div>
            <div className="assignment-meta">
              <span className="assignment-chapter">{assignment.chapter}</span>
              <span className="due-time">
                <span className="time-icon">⏰</span>
                Due at {assignment.dueTime}
              </span>
            </div>
          </div>
          <div className="assignment-actions">
            <div className="assignment-points">{assignment.points} Points</div>
            <span className="chevron-icon">›</span>
          </div>
        </div>
      </div>
    </Link>
  );
}