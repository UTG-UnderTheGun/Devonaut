// components/Stats.js
'use client'
import { useState, useEffect } from 'react';
import "./stats.css"

const Stats = ({ stats, onStatClick }) => {
  const [statsWithCounts, setStatsWithCounts] = useState(stats);
  const [loading, setLoading] = useState(true); // Add loading state
  
  useEffect(() => {
    const fetchStatsData = async () => {
      setLoading(true); // Set loading to true when fetching
      const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      
      try {
        // Fetch counts for each stat
        const updatedStats = await Promise.all(stats.map(async (stat) => {
          let count = 0;
          
          try {
            // For sections, always use static value 2
            if (stat.id === 'sections') {
              count = 2;
            }
            // Different endpoints based on the stat id
            else if (stat.id === 'students') {
              const response = await fetch(`${API_BASE}/users/students`, {
                credentials: 'include',
              });
              if (response.ok) {
                const data = await response.json();
                count = data.users?.length || 0;
              }
            } 
            else if (stat.id === 'assignments') {
              const response = await fetch(`${API_BASE}/assignments/`, {
                credentials: 'include',
              });
              if (response.ok) {
                const data = await response.json();
                count = data.length || 0;
              }
            }
            else if (stat.id === 'pending') {
              // For pending, we need to count assignments that aren't completed
              const [assignmentsResponse, studentsResponse] = await Promise.all([
                fetch(`${API_BASE}/assignments/`, { credentials: 'include' }),
                fetch(`${API_BASE}/users/students`, { credentials: 'include' })
              ]);
              
              if (assignmentsResponse.ok && studentsResponse.ok) {
                const assignments = await assignmentsResponse.json();
                const studentsData = await studentsResponse.json();
                const students = studentsData.users || [];
                
                // Count submissions with 'pending' or 'not submitted' status
                let pendingCount = 0;
                
                for (const assignment of assignments) {
                  const submissionsResponse = await fetch(
                    `${API_BASE}/assignments/${assignment.id}/submissions`, 
                    { credentials: 'include' }
                  );
                  
                  if (submissionsResponse.ok) {
                    const submissions = await submissionsResponse.json();
                    // Get the number of students who haven't completed the assignment
                    const completedStudentIds = submissions
                      .filter(sub => sub.status === 'graded')
                      .map(sub => sub.user_id);
                    
                    // Each student without a completed submission counts as a pending assignment
                    pendingCount += students.length - completedStudentIds.length;
                  }
                }
                
                count = pendingCount;
              }
            }
          } catch (error) {
            console.error(`Error fetching count for ${stat.id}:`, error);
          }
          
          return {
            ...stat,
            value: count
          };
        }));
        
        setStatsWithCounts(updatedStats);
      } catch (error) {
        console.error('Error fetching stats data:', error);
      } finally {
        setLoading(false); // Set loading to false when done
      }
    };
    
    fetchStatsData();
  }, [stats]);
  
  // Loading indicator component
  const LoadingIndicator = () => (
    <span className="stats-loading-indicator">
      <span className="loading-dot"></span>
      <span className="loading-dot"></span>
      <span className="loading-dot"></span>
    </span>
  );
  
  return (
    <div className="stats-container">
      <div className="stats-grid">
        {statsWithCounts.map((stat, index) => (
          <div 
            key={index} 
            className={`stat-card clickable ${stat.highlighted ? 'highlighted' : ''}`}
            onClick={() => onStatClick(stat.id)}
          >
            <h3 className="stat-title">{stat.title}</h3>
            <p className="stat-value">
              {loading ? <LoadingIndicator /> : 
                (stat.value !== undefined ? stat.value : (stat.count || 0))}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Stats;