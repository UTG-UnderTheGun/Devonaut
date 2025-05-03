import React, { useState, useEffect } from 'react';
import '../student-assignment.css';
import axios from 'axios';

const TimelineView = ({ 
  exercises, 
  currentExerciseIndex, 
  refreshTimelineData,
  handlePrevExercise,
  handleNextExercise,
  userId
}) => {
  const [timelinePosition, setTimelinePosition] = useState(0);
  const [timelineData, setTimelineData] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  
  // API base URL from environment or default
  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  // Fetch timeline data for the current exercise
  useEffect(() => {
    if (!exercises || exercises.length === 0 || currentExerciseIndex === undefined || !userId) {
      return;
    }
    
    const currentExercise = exercises[currentExerciseIndex];
    
    // Only fetch if we have a valid exercise and userId
    if (currentExercise && currentExercise.id) {
      fetchTimelineData(currentExercise);
    }
  }, [exercises, currentExerciseIndex, userId, retryCount]);

  // Function to fetch timeline data directly from the API
  const fetchTimelineData = async (exercise) => {
    if (!exercise || !exercise.id || !userId) {
      setError("Missing required data to fetch timeline");
      return;
    }
    
    // Get assignment ID from exercise if available
    const assignmentId = exercise.assignment_id || 
                         localStorage.getItem('current-assignment-id') || 
                         window.location.pathname.split('/').pop();
    
    if (!assignmentId) {
      setError("Could not determine assignment ID");
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      console.log(`Fetching timeline data for user ${userId}, assignment ${assignmentId}, exercise ${exercise.id}`);
      
      // Use credentials to ensure cookies are sent
      const response = await axios.get(`${API_BASE}/api/v1/keystrokes/${userId}/${assignmentId}/timeline`, {
        params: {
          exercise_id: exercise.id
        },
        withCredentials: true,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });
      
      if (response.data && Array.isArray(response.data)) {
        // Store the timeline data by exercise ID
        setTimelineData(prevData => ({
          ...prevData,
          [exercise.id]: response.data
        }));
        
        // Reset timeline position when new data is loaded
        setTimelinePosition(0);
        
        console.log(`Loaded ${response.data.length} timeline entries for exercise ${exercise.id}`);
      } else {
        console.log("Received empty or invalid timeline data:", response.data);
        setTimelineData(prevData => ({
          ...prevData,
          [exercise.id]: []
        }));
      }
    } catch (err) {
      console.error("Error fetching timeline data:", err);
      setError(err.response?.data?.detail || err.message || "Failed to load timeline data");
      
      // Try alternate endpoint format if the first one fails
      try {
        console.log("Trying alternate endpoint format...");
        const altResponse = await axios.get(`${API_BASE}/code/keystrokes/${userId}/${assignmentId}/timeline`, {
          params: {
            exercise_id: exercise.id,
            problem_index: currentExerciseIndex
          },
          withCredentials: true
        });
        
        if (altResponse.data && Array.isArray(altResponse.data)) {
          setTimelineData(prevData => ({
            ...prevData,
            [exercise.id]: altResponse.data
          }));
          
          setTimelinePosition(0);
          setError(null);
          console.log(`Loaded ${altResponse.data.length} timeline entries using alternate endpoint`);
        } else {
          throw new Error("Alternate endpoint also failed to return valid data");
        }
      } catch (altErr) {
        console.error("Alternate endpoint also failed:", altErr);
        setError(`Failed to load timeline data. Please check your connection and try again.`);
      }
    } finally {
      setLoading(false);
    }
  };

  // Manual refresh function that can be called by user
  const handleRefreshTimeline = () => {
    if (exercises && exercises.length > 0 && currentExerciseIndex !== undefined) {
      // Increment retry count to trigger a re-fetch
      setRetryCount(prev => prev + 1);
      
      // Also call the parent component's refresh function if provided
      if (refreshTimelineData) {
        refreshTimelineData();
      }
    }
  };

  // Get current exercise data
  const getCurrentExerciseData = () => {
    if (!exercises || exercises.length === 0 || currentExerciseIndex === undefined) {
      return null;
    }
    return exercises[currentExerciseIndex];
  };

  // Get timeline data for current exercise
  const getCurrentExerciseTimeline = () => {
    const currentExercise = getCurrentExerciseData();
    if (!currentExercise) return [];
    
    return timelineData[currentExercise.id] || [];
  };

  // Format time nicely
  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  return (
    <div className="timeline-section">
      <div className="exercise-navigation">
        <button 
          className="nav-button prev" 
          onClick={handlePrevExercise}
          disabled={currentExerciseIndex === 0}
        >
          Previous
        </button>
        <span className="exercise-counter">
          Exercise {currentExerciseIndex + 1} of {exercises.length}
        </span>
        <button 
          className="nav-button next" 
          onClick={handleNextExercise}
          disabled={currentExerciseIndex === exercises.length - 1}
        >
          Next
        </button>
      </div>

      <h3>Code Evolution Timeline - {getCurrentExerciseData()?.title || 'Exercise'}</h3>
      
      {loading && (
        <div className="loading-indicator">
          <div className="spinner"></div>
          <p>Loading timeline data...</p>
        </div>
      )}
      
      {error && (
        <div className="error-message">
          <p>
            <strong>Error:</strong> {error}
          </p>
          <button onClick={handleRefreshTimeline} className="refresh-button">
            Try Again
          </button>
        </div>
      )}
      
      {!loading && !error && (
        <div className="timeline-slider-container">
          {(() => {
            const timeline = getCurrentExerciseTimeline();
            
            if (timeline.length > 0) {
              // Calculate a safe timeline position
              const safePosition = Math.min(timelinePosition, timeline.length - 1);
            
            return (
              <>
                <input 
                  type="range" 
                  min="0" 
                    max={timeline.length - 1} 
                  value={safePosition}
                  onChange={(e) => setTimelinePosition(parseInt(e.target.value))} 
                  className="timeline-slider"
                />
                <div className="timeline-markers">
                    {timeline.map((item, idx) => (
                    <div 
                      key={idx}
                        className={`timeline-marker ${item.action_type || 'keystroke'} ${idx === safePosition ? 'active' : ''}`}
                        style={{left: `${(idx / (timeline.length - 1)) * 100}%`}}
                      onClick={() => setTimelinePosition(idx)}
                    >
                      <span className="marker-tooltip">
                          {formatTime(item.timestamp)}
                        <br/>
                          {item.action_type || 'keystroke'}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            );
          } else {
            return (
              <div className="empty-state">
                <p>No timeline data available for this exercise</p>
                  <p className="debug-info">Exercise ID: {getCurrentExerciseData()?.id}</p>
                
                <button 
                  className="refresh-button"
                    onClick={handleRefreshTimeline}
                >
                  Refresh Timeline Data
                </button>
              </div>
            );
          }
        })()}
      </div>
      )}

      {(() => {
        const timeline = getCurrentExerciseTimeline();
        
        if (timeline.length > 0 && timelinePosition < timeline.length) {
          const safePosition = Math.min(timelinePosition, timeline.length - 1);
          const currentItem = timeline[safePosition];
          
          return (
            <>
              <div className="timeline-info">
                <div className="current-position-info">
                  <span>Time: {formatTime(currentItem.timestamp)}</span>
                  <span>Action: {currentItem.action_type || 'keystroke'}</span>
                </div>
                
                <div className="timeline-navigation">
                  <button 
                    onClick={() => setTimelinePosition(Math.max(0, safePosition - 1))}
                    disabled={safePosition === 0}
                    className="timeline-nav-button"
                  >
                    Previous Change
                  </button>
                  <button 
                    onClick={() => setTimelinePosition(Math.min(timeline.length - 1, safePosition + 1))}
                    disabled={safePosition === timeline.length - 1}
                    className="timeline-nav-button"
                  >
                    Next Change
                  </button>
                  <button 
                    onClick={handleRefreshTimeline}
                    className="refresh-button"
                  >
                    Refresh
                  </button>
                </div>
              </div>

              <div className="code-display">
                <pre>
                  <code className="code-content" dir="auto">
                    {currentItem.code ? 
                      // Handle newlines in the code properly and support both RTL and LTR text
                      currentItem.code.split('\\n').join('\n') :
                      (getCurrentExerciseData()?.code || "// No code available")
                    }
                  </code>
                </pre>
              </div>
              
              {/* Display code changes if available */}
              {safePosition > 0 && (
                <div className="code-diff-display">
                  <h4>Changes from Previous Version</h4>
                  <div className="diff-container">
                    {(() => {
                      const prevItem = timeline[safePosition - 1];
                      
                      if (!prevItem) return <div>No previous version available</div>;
                      
                      const currentCode = currentItem.code || '';
                      const prevCode = prevItem.code || '';
                      
                      // Check if we have changes from the API in the expected format
                      if (currentItem.changes && Array.isArray(currentItem.changes)) {
                        // If we have changes from the API in array format, use them
                        return (
                          <pre className="diff-content">
                            {currentItem.changes.map((line, i) => {
                              if (line.startsWith('+ ')) {
                                return <div key={i} className="diff-line diff-added">{line}</div>;
                              } else if (line.startsWith('- ')) {
                                return <div key={i} className="diff-line diff-removed">{line}</div>;
                              } else {
                                return <div key={i} className="diff-line diff-unchanged">{line}</div>;
                              }
                            })}
                          </pre>
                        );
                      } 
                      // Check if we have changes in the object format from your schema
                      else if (currentItem.changes && typeof currentItem.changes === 'object' && !Array.isArray(currentItem.changes)) {
                        // Handle the object format with line properties
                        return (
                          <pre className="diff-content">
                            {Object.entries(currentItem.changes).map(([lineNum, change], i) => (
                              <div key={i}>
                                {change.previous && (
                                  <div className="diff-line diff-removed">- {change.previous}</div>
                                )}
                                {change.current && (
                                  <div className="diff-line diff-added">+ {change.current}</div>
                                )}
                              </div>
                            ))}
                          </pre>
                        );
                      } 
                        // Otherwise calculate diff on client side
                      else {
                        // Simple diff visualization (can be enhanced with a proper diff library)
                        const currentLines = currentCode.split('\n');
                        const prevLines = prevCode.split('\n');
                        
                        return (
                          <pre className="diff-content">
                            {currentLines.map((line, i) => {
                              if (i >= prevLines.length) {
                                // Line was added
                                return <div key={i} className="diff-line diff-added">+ {line}</div>;
                              } else if (line !== prevLines[i]) {
                                // Line was changed
                                return (
                                  <div key={i}>
                                    <div className="diff-line diff-removed">- {prevLines[i]}</div>
                                    <div className="diff-line diff-added">+ {line}</div>
                                  </div>
                                );
                              } else {
                                // Line is unchanged
                                return <div key={i} className="diff-line diff-unchanged">  {line}</div>;
                              }
                            })}
                            
                            {/* Check for removed lines at the end */}
                            {prevLines.slice(currentLines.length).map((line, i) => (
                              <div key={`removed-${i}`} className="diff-line diff-removed">- {line}</div>
                            ))}
                          </pre>
                        );
                      }
                    })()}
                  </div>
                </div>
              )}
            </>
          );
        } else if (!loading && !error && getCurrentExerciseTimeline().length === 0) {
          return (
            <div className="empty-state">
              <h4>No timestamped code changes available for this exercise</h4>
              <p>Please ensure there are keystroke entries recorded for this exercise.</p>
              <div className="debug-info">
                <p>Current Exercise ID: {getCurrentExerciseData()?.id}</p>
                <p>Available data: {timeline ? timeline.length : 0} entries</p>
                <p>If this continues, try making some code changes in the editor first.</p>
              </div>
            </div>
          );
        }
        return null;
      })()}
    </div>
  );
};

export default TimelineView; 