'use client';
import { useState, useEffect } from 'react';
import { formatTime } from '@/utils/dateUtils';
import { useSession } from 'next-auth/react';
import './teacher-ai-chat-history.css';

const TeacherAIChatHistory = ({ assignmentId, exerciseId, studentId }) => {
  const { data: session } = useSession();
  const [chatHistory, setChatHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [apiUrl, setApiUrl] = useState('');
  const [debugInfo, setDebugInfo] = useState(null);
  const [rawData, setRawData] = useState(null);
  const [directData, setDirectData] = useState(null);
  const [usingDirectData, setUsingDirectData] = useState(false);

  useEffect(() => {
    // Debug information
    console.log('TeacherAIChatHistory Component Props:', {
      assignmentId,
      exerciseId,
      studentId,
      hasSession: !!session
    });
    
    const fetchChatHistory = async () => {
      try {
        setLoading(true);
        console.log('Fetching chat history with params:', { assignmentId, exerciseId, studentId });
        
        // Prepare the query parameters
        const params = new URLSearchParams();
        if (assignmentId) params.append('assignment_id', assignmentId);
        if (exerciseId) params.append('exercise_id', exerciseId);
        if (studentId) params.append('user_id', studentId);
        
        // Define API base URL - make sure to use the right URL
        const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
        const url = `${API_BASE}/api/v1/ai/chat-history?${params.toString()}`;
        setApiUrl(url);
        
        console.log('Calling API URL:', url);
        
        // Make the API request
        const response = await fetch(url, {
          method: 'GET',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': session?.accessToken ? `Bearer ${session.accessToken}` : '',
          },
          credentials: 'include',
        });
        
        console.log('API Response Status:', response.status, response.statusText);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch chat history: ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('Raw chat history response:', data);
        setRawData(data);
        
        // Save debug info
        setDebugInfo({
          url: url,
          responseStatus: response.status,
          responseData: data
        });
        
        // Process chat histories
        if (data.histories && data.histories.length > 0) {
          // Map messages and convert "user" role to "student" for display purposes
          const mapMessages = (messages) => {
            return (messages || []).map(msg => ({
              ...msg,
              role: msg.role === 'user' ? 'student' : msg.role
            }));
          };
          
          // If there's a specific student requested, show only that student's history
          if (studentId) {
            // Find the history that matches the student ID
            const studentHistory = data.histories.find(h => h.user_id === studentId);
            if (studentHistory) {
              const studentMessages = mapMessages(studentHistory.messages || []);
              console.log(`Found ${studentMessages.length} messages for student ${studentId}`);
              setChatHistory(studentMessages);
            } else {
              console.log(`No history found for student ID ${studentId}`);
              setChatHistory([]);
            }
          } else {
            // Otherwise, organize by student
            const organized = data.histories.reduce((acc, history) => {
              if (!acc[history.user_id]) {
                acc[history.user_id] = {
                  username: history.username || history.user_id,
                  messages: mapMessages(history.messages || [])
                };
              } else {
                acc[history.user_id].messages = [
                  ...acc[history.user_id].messages,
                  ...mapMessages(history.messages || [])
                ];
              }
              return acc;
            }, {});
            
            console.log(`Organized chat history for ${Object.keys(organized).length} students`);
            setChatHistory(organized);
          }
        } else {
          // No chat history found, try the direct endpoint
          console.log('No chat history found in response, trying direct endpoint');
          await fetchDirectChatHistory(API_BASE, params);
        }
      } catch (err) {
        console.error('Error fetching chat history:', err);
        setError(err.message);
        
        // Try direct endpoint as fallback
        const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
        const params = new URLSearchParams();
        if (assignmentId) params.append('assignment_id', assignmentId);
        if (exerciseId) params.append('exercise_id', exerciseId);
        if (studentId) params.append('user_id', studentId);
        
        await fetchDirectChatHistory(API_BASE, params);
      } finally {
        setLoading(false);
      }
    };
    
    const fetchDirectChatHistory = async (API_BASE, params) => {
      try {
        const directUrl = `${API_BASE}/api/v1/ai/chat-history-direct?${params.toString()}`;
        console.log('Trying direct endpoint:', directUrl);
        
        const directResponse = await fetch(directUrl, {
          method: 'GET',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': session?.accessToken ? `Bearer ${session.accessToken}` : '',
          },
          credentials: 'include',
        });
        
        if (!directResponse.ok) {
          throw new Error(`Failed to fetch direct chat history: ${directResponse.statusText}`);
        }
        
        const directData = await directResponse.json();
        console.log('Direct chat history response:', directData);
        setDirectData(directData);
        
        if (directData.direct_histories && directData.direct_histories.length > 0) {
          console.log(`Found ${directData.direct_histories.length} direct histories`);
          
          // Map messages for display
          const mapMessages = (messages) => {
            return (messages || []).map(msg => ({
              ...msg,
              role: msg.role === 'user' ? 'student' : msg.role
            }));
          };
          
          // Process based on whether we're viewing a specific student
          if (studentId) {
            // Find the history for this student
            const studentHistory = directData.direct_histories.find(h => h.user_id === studentId);
            if (studentHistory && studentHistory.messages && studentHistory.messages.length > 0) {
              const studentMessages = mapMessages(studentHistory.messages);
              console.log(`Using direct endpoint: Found ${studentMessages.length} messages for student ${studentId}`);
              setChatHistory(studentMessages);
              setUsingDirectData(true);
            }
          } else {
            // Organize by student
            const organized = directData.direct_histories.reduce((acc, history) => {
              if (history.messages && history.messages.length > 0) {
                if (!acc[history.user_id]) {
                  acc[history.user_id] = {
                    username: history.username || history.user_id,
                    messages: mapMessages(history.messages)
                  };
                } else {
                  acc[history.user_id].messages = [
                    ...acc[history.user_id].messages,
                    ...mapMessages(history.messages)
                  ];
                }
              }
              return acc;
            }, {});
            
            if (Object.keys(organized).length > 0) {
              console.log(`Using direct endpoint: Organized ${Object.keys(organized).length} students`);
              setChatHistory(organized);
              setUsingDirectData(true);
            }
          }
        }
      } catch (directErr) {
        console.error('Error fetching direct chat history:', directErr);
      }
    };
    
    if ((assignmentId || exerciseId || studentId)) {
      fetchChatHistory();
    }
  }, [assignmentId, exerciseId, studentId, session?.accessToken]);
  
  if (loading) {
    return <div className="loading-spinner">Loading chat history...</div>;
  }
  
  if (error && !usingDirectData) {
    return (
      <div className="error-message">
        <div>Error: {error}</div>
        <div className="debug-info">
          <p>API URL: {apiUrl}</p>
          <p>Parameters: assignmentId={assignmentId}, exerciseId={exerciseId}, studentId={studentId}</p>
          <button onClick={() => window.location.reload()}>Retry</button>
        </div>
      </div>
    );
  }
  
  // If viewing a specific student's history
  if (studentId) {
    if (!chatHistory || chatHistory.length === 0) {
      return (
        <div className="no-history">
          <p>No chat history found for this student.</p>
          <div className="debug-info">
            <p>API URL: {apiUrl}</p>
            <p>Parameters: assignmentId={assignmentId}, exerciseId={exerciseId}, studentId={studentId}</p>
            <details>
              <summary>Raw Response Data</summary>
              <pre>{rawData ? JSON.stringify(rawData, null, 2) : 'No data'}</pre>
            </details>
            {directData && (
              <details>
                <summary>Direct API Response Data</summary>
                <pre>{JSON.stringify(directData, null, 2)}</pre>
              </details>
            )}
            <button onClick={() => window.location.reload()}>Retry</button>
          </div>
        </div>
      );
    }
    
    return (
      <div className="ai-chat-history">
        <h3>AI Chat History {usingDirectData && "(Direct Mode)"}</h3>
        <div className="chat-messages">
          {chatHistory.map((message, index) => (
            <div key={index} className={`chat-message ${message.role}`}>
              <div className="message-header">
                <span className="message-sender">{message.role === 'student' || message.role === 'user' ? 'Student' : 'AI Assistant'}</span>
                <span className="message-time">{formatTime(message.timestamp)}</span>
              </div>
              <div className="message-content">{message.content}</div>
            </div>
          ))}
        </div>
      </div>
    );
  }
  
  // If viewing all students' history
  if (!chatHistory || Object.keys(chatHistory).length === 0) {
    return (
      <div className="no-history">
        <p>No chat history found for this exercise.</p>
        <div className="debug-info">
          <p>API URL: {apiUrl}</p>
          <p>Parameters: assignmentId={assignmentId}, exerciseId={exerciseId}, studentId={studentId}</p>
          <details>
            <summary>Raw Response Data</summary>
            <pre>{rawData ? JSON.stringify(rawData, null, 2) : 'No data'}</pre>
          </details>
          {directData && (
            <details>
              <summary>Direct API Response Data</summary>
              <pre>{JSON.stringify(directData, null, 2)}</pre>
            </details>
          )}
          <button onClick={() => window.location.reload()}>Retry</button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="ai-chat-history all-students">
      <h3>AI Chat History - All Students {usingDirectData && "(Direct Mode)"}</h3>
      {Object.entries(chatHistory).map(([userId, data]) => (
        <div key={userId} className="student-chat-section">
          <h4>{data.username}</h4>
          <div className="chat-messages">
            {data.messages.map((message, index) => (
              <div key={index} className={`chat-message ${message.role}`}>
                <div className="message-header">
                  <span className="message-sender">{message.role === 'student' || message.role === 'user' ? 'Student' : 'AI Assistant'}</span>
                  <span className="message-time">{formatTime(message.timestamp)}</span>
                </div>
                <div className="message-content">{message.content}</div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default TeacherAIChatHistory; 