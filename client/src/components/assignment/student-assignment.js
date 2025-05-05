// student-assignment.js
'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import './student-assignment.css';

// Skeleton loading component
const AssignmentSkeleton = () => {
  return (
    <div className="student-assignment coding-container create-assignment-container">
      <div className="back-button-container">
        <div className="back-button">← Back to List</div>
      </div>
      
      <div className="skeleton-loading">
        {/* Assignment header skeleton */}
        <div className="skeleton skeleton-header" style={{ height: '2rem', width: '60%', marginBottom: '1rem' }}></div>
        <div className="skeleton skeleton-meta" style={{ height: '1rem', width: '80%', marginBottom: '1.5rem' }}></div>
        
        {/* Student info panel skeleton */}
        <div className="skeleton-info-panel" style={{ 
          background: 'white', 
          borderRadius: '0.5rem', 
          padding: '1.5rem', 
          marginBottom: '1.5rem' 
        }}>
          <div className="skeleton" style={{ height: '1.5rem', width: '30%', marginBottom: '1rem' }}></div>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', 
            gap: '1.25rem' 
          }}>
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div className="skeleton" style={{ height: '0.75rem', width: '60%' }}></div>
                <div className="skeleton" style={{ height: '1rem', width: '80%' }}></div>
              </div>
            ))}
          </div>
        </div>
        
        {/* Tabs skeleton */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="skeleton" style={{ height: '2.5rem', width: '8rem', borderRadius: '0.375rem' }}></div>
          ))}
        </div>
        
        {/* Content skeleton */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: '1fr 350px', 
          gap: '1.5rem' 
        }}>
          <div className="skeleton" style={{ 
            background: 'white', 
            borderRadius: '0.5rem', 
            height: '400px' 
          }}></div>
          
          <div className="skeleton" style={{ 
            background: 'white', 
            borderRadius: '0.5rem', 
            height: '400px' 
          }}></div>
        </div>
      </div>
    </div>
  );
};

// เพิ่มฟังก์ชันใหม่สำหรับดึง code history ของนักเรียน
const fetchCodeHistoryForStudent = async (API_BASE, userId, assignmentId, exercisesList) => {
  try {
    console.log(`Fetching code history for user ${userId}, assignment ${assignmentId}`);
    
    // สร้างคิวรี่พารามิเตอร์
    const params = new URLSearchParams();
    if (assignmentId) {
      params.append('assignment_id', assignmentId);
    }
    
    // ใช้ endpoint ใหม่ที่เพิ่งสร้าง
    const response = await fetch(`${API_BASE}/code/code-history/by-user/${userId}?${params.toString()}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch code history: ${response.status}`);
    }
    
    const historyData = await response.json();
    console.log(`Found ${historyData.length} code history entries for user ${userId}`);
    
    return historyData;
  } catch (error) {
    console.error("Error fetching code history:", error);
    return [];
  }
};

const StudentAssignment = ({ studentId, assignmentId, onBack, onSubmissionUpdate }) => {
  const router = useRouter();
  const [assignment, setAssignment] = useState(null);
  const [submission, setSubmission] = useState(null);
  const [codeHistory, setCodeHistory] = useState([]);
  const [keystrokeHistory, setKeystrokeHistory] = useState([]);
  const [aiChatHistory, setAiChatHistory] = useState({});
  const [activeTab, setActiveTab] = useState('exercises');
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [error, setError] = useState(null);
  const [score, setScore] = useState('');
  const [feedback, setFeedback] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [timelinePosition, setTimelinePosition] = useState(0);
  const [exercises, setExercises] = useState([]);
  const [answers, setAnswers] = useState({});
  const [codingActivity, setCodingActivity] = useState({});
  const [checkedCodeHistory, setCheckedCodeHistory] = useState(false);
  const userIdRef = useRef(studentId);
  const [mongoUserIdRef, setMongoUserIdRef] = useState(null);

  const fetchData = async () => {
    try {
      // Define API base URL
      const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      
      // Fetch assignment details
      const assignmentResponse = await fetch(`${API_BASE}/assignments/${assignmentId}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      
      if (!assignmentResponse.ok) {
        throw new Error(`Failed to fetch assignment: ${assignmentResponse.status}`);
      }
      
      const assignmentData = await assignmentResponse.json();
      setAssignment(assignmentData);
      console.log("Assignment loaded successfully:", assignmentData);
      
      // Set exercises from assignment data
      if (assignmentData.exercises && assignmentData.exercises.length > 0) {
        setExercises(assignmentData.exercises);
        
        // เพิ่ม log เพื่อตรวจสอบประเภทของแต่ละข้อ
        console.log("EXERCISE TYPES:");
        assignmentData.exercises.forEach((ex, idx) => {
          console.log(`Exercise ${idx+1} (ID: ${ex.id}) - Type: ${ex.type}`);
        });
      } else {
        console.warn("No exercises found in assignment data");
      }
      
      // First, look up the user by student_id to get the MongoDB user_id
      let mongoUserId = studentId; // Default to using the provided ID
      
      try {
        const userLookupResponse = await fetch(`${API_BASE}/users/student-lookup/${studentId}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
        });
        
        if (userLookupResponse.ok) {
          const userData = await userLookupResponse.json();
          mongoUserId = userData.user_id; // Use the MongoDB user_id for submission lookup
          setMongoUserIdRef(userData.user_id); // Store MongoDB user ID in ref
          console.log(`Mapped student_id ${studentId} to MongoDB user_id ${mongoUserId}`);
        } else {
          // If lookup fails, continue with the original studentId
          setMongoUserIdRef(studentId); // Store student ID as fallback
          console.warn(`Could not find user with student_id ${studentId}, using ID as-is`);
        }
      } catch (userLookupError) {
        console.error("Error looking up user:", userLookupError);
        // Continue with original ID
      }
      
      // ดึง code history ของนักเรียนก่อน
      console.log(`Fetching code history for user ${mongoUserId} and assignment ${assignmentId}`);
      const codeHistoryData = await fetchCodeHistoryForStudent(API_BASE, mongoUserId, assignmentId, assignmentData.exercises);
      setCodeHistory(codeHistoryData);
      console.log(`Code history loaded successfully: ${codeHistoryData.length} entries`);
      
      // Fetch student submission using the MongoDB user_id
      try {
        const submissionResponse = await fetch(`${API_BASE}/assignments/${assignmentId}/submission/${mongoUserId}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
        });
        
        if (submissionResponse.ok) {
          const submissionData = await submissionResponse.json();
          setSubmission(submissionData);
          console.log("Submission loaded successfully:", submissionData);
          
          // ดึงคำตอบจาก submission โดยตรง
          if (submissionData.answers) {
            console.log("RAW SUBMISSION ANSWERS:", submissionData.answers);
            setAnswers(submissionData.answers);
          } else {
            console.warn("No answers found in submission data");
            setAnswers({});
          }
        } else {
          // If submission not found, create a placeholder
          console.log("No submission found, creating placeholder");
          setSubmission({
            id: null,
            assignment_id: assignmentId,
            user_id: mongoUserId,
            username: "Unknown Student",
            section: "Unknown",
            status: "pending",
            submitted_at: null,
            answers: {},
            comments: []
          });
        }
      } catch (submissionError) {
        console.error("Error fetching submission:", submissionError);
        setSubmission({
          id: null,
          assignment_id: assignmentId,
          user_id: mongoUserId,
          username: "Unknown Student",
          section: "Unknown",
          status: "pending",
          submitted_at: null,
          answers: {},
          comments: []
        });
      }
      
      // Try to fetch detailed keystroke timeline first
      try {
        const keystrokeTimelineResponse = await fetch(
          `${API_BASE}/code/keystrokes/${mongoUserId}/${assignmentId}/timeline`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
        });
        
        if (keystrokeTimelineResponse.ok) {
          const timelineData = await keystrokeTimelineResponse.json();
          console.log("Keystroke timeline loaded successfully:", timelineData);
          
          // Process timeline data into coding activity format
          const activity = {};
          
          // First initialize all exercises with empty arrays
          if (assignmentData.exercises && assignmentData.exercises.length > 0) {
            assignmentData.exercises.forEach(exercise => {
              activity[exercise.id] = [];
              // Also initialize with string versions of ID to handle different ID types
              activity[String(exercise.id)] = [];
            });
            
            // Log all available keystroke data for debugging
            console.log("TIMELINE DATA DUMP - ALL ENTRIES:", timelineData.map(item => ({
              problem_index: item.problem_index,
              exercise_id: item.exercise_id,
              timestamp: item.timestamp && item.timestamp.substring(0, 19)
            })));
            
            // Process each exercise
            assignmentData.exercises.forEach(exercise => {
              console.log(`Processing timeline data for exercise ${exercise.id} (${typeof exercise.id})`);
              
              // Make a more flexible matcher function
              const matchesExercise = (item) => {
                const exerciseId = exercise.id;
                const strExerciseId = String(exerciseId);
                const itemProblemIndex = item.problem_index !== undefined ? item.problem_index : null;
                const itemExerciseId = item.exercise_id !== undefined ? item.exercise_id : null;
                
                // Try all possible matching combinations
                return (
                  // Direct match on problem_index
                  itemProblemIndex === exerciseId ||
                  // String match on problem_index
                  String(itemProblemIndex) === strExerciseId ||
                  // Number match if problem_index is numeric string
                  (typeof itemProblemIndex === 'string' && !isNaN(parseInt(itemProblemIndex)) && 
                   parseInt(itemProblemIndex) === exerciseId) ||
                  // Direct match on exercise_id
                  itemExerciseId === exerciseId ||
                  // String match on exercise_id
                  String(itemExerciseId) === strExerciseId ||
                  // Number match if exercise_id is numeric string
                  (typeof itemExerciseId === 'string' && !isNaN(parseInt(itemExerciseId)) && 
                   parseInt(itemExerciseId) === exerciseId)
                );
              };
              
              // Filter timeline entries for this exercise using our flexible matcher
              const exerciseTimeline = timelineData.filter(matchesExercise);
              
              console.log(`Found ${exerciseTimeline.length} timeline entries for exercise ${exercise.id}`);
              
              if (exerciseTimeline.length > 0) {
                // Log some sample data
                console.log("Sample timeline entry:", exerciseTimeline[0]);
                
              // Map to the format expected by the UI
                const timelineEntries = exerciseTimeline.map((item, index) => ({
                id: index + 1,
                  timestamp: item.timestamp || new Date().toISOString(),
                  action: item.action_type || 'keystroke',
                  exerciseId: exercise.id,
                  code: item.code || '',
                  changes: item.changes || null
                }));
                
                // Sort entries by timestamp
                timelineEntries.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
                
                // Store timeline under both string and number keys to ensure it's found
                activity[exercise.id] = timelineEntries;
                activity[String(exercise.id)] = timelineEntries;
                
                console.log(`Processed ${timelineEntries.length} timeline entries for exercise ${exercise.id}`);
              }
            });
            
            setCodingActivity(activity);
            console.log("FINAL ACTIVITY STRUCTURE:", Object.keys(activity).map(key => ({
              key: key,
              entries: activity[key] ? activity[key].length : 0
            })));
          }
        } else {
          // If timeline API fails, try to fetch individual keystroke data
          console.log("Keystroke timeline API failed, trying to fetch raw keystroke data");
          await fetchCodeHistory(API_BASE, mongoUserId, assignmentId, assignmentData.exercises);
        }
      } catch (keystrokeTimelineError) {
        console.error("Error fetching keystroke timeline:", keystrokeTimelineError);
        // Fall back to code history
        await fetchCodeHistory(API_BASE, mongoUserId, assignmentId, assignmentData.exercises);
      }
      
      // Get keystroke analytics using the new API
      try {
        const keystrokeAnalyticsResponse = await fetch(
          `${API_BASE}/code/keystrokes/${mongoUserId}/aggregate?assignment_id=${assignmentId}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
        });
        
        if (keystrokeAnalyticsResponse.ok) {
          const analyticsData = await keystrokeAnalyticsResponse.json();
          console.log("Keystroke analytics loaded successfully:", analyticsData);
          
          // Transform the data into the format expected by the UI
          const formattedKeystrokeData = analyticsData.map(item => ({
            day: item.day,
            count: item.count,
            action_type: item.action_type,
            problem_index: item.problem_index,
            exercise_id: item.exercise_id
          }));
          
          setKeystrokeHistory(formattedKeystrokeData);
          console.log("Keystroke analytics transformed successfully:", formattedKeystrokeData);
        } else {
          console.warn("Failed to fetch keystroke analytics");
          setKeystrokeHistory([]);
        }
      } catch (keystrokeAnalyticsError) {
        console.error("Error fetching keystroke analytics:", keystrokeAnalyticsError);
        setKeystrokeHistory([]);
      }
      
      // Fetch AI chat history
      try {
        // Create query parameters
        const params = new URLSearchParams();
        params.append('user_id', mongoUserId);
        params.append('assignment_id', assignmentId);
        
        // Fetch chat history from API
        const chatHistoryResponse = await fetch(`${API_BASE}/ai/chat-history?${params.toString()}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
        });
              
        if (chatHistoryResponse.ok) {
          const chatHistoryData = await chatHistoryResponse.json();
          console.log("Raw chat history data:", chatHistoryData);
          
          // Process chat histories by exercise
          const chatHistories = {};
          
          if (chatHistoryData.histories && chatHistoryData.histories.length > 0) {
            // Create lookup map for exercise IDs for faster matching later
            const exerciseIdMap = {};
            if (exercises && exercises.length > 0) {
              exercises.forEach(exercise => {
                // Store ID in multiple formats
                const id = exercise.id;
                const idStr = String(id);
                const idNum = !isNaN(parseInt(id)) ? parseInt(id) : null;
                
                exerciseIdMap[id] = true;
                exerciseIdMap[idStr] = true;
                if (idNum !== null) exerciseIdMap[idNum] = true;
                if (idNum !== null && idNum > 0) exerciseIdMap[idNum - 1] = true; // For zero-based index
              });
            }
            
            // Group messages by exercise ID
            chatHistoryData.histories.forEach(history => {
              // Store chat history under multiple key formats to ensure matching
              const exerciseId = history.exercise_id;
              const exerciseIdStr = String(exerciseId);
              const exerciseIdNum = !isNaN(parseInt(exerciseId)) ? parseInt(exerciseId) : null;
              
              // Create entries for different formats of the same ID
              if (!chatHistories[exerciseId]) chatHistories[exerciseId] = [];
              if (!chatHistories[exerciseIdStr]) chatHistories[exerciseIdStr] = [];
              if (exerciseIdNum !== null && !chatHistories[exerciseIdNum]) chatHistories[exerciseIdNum] = [];
              
              // Format messages
              if (history.messages && history.messages.length > 0) {
                // Create formatted messages
                const formattedMessages = history.messages.map((message, idx) => ({
                  id: `${history.id || history._id || idx}-${idx}`,
                  timestamp: message.timestamp || new Date().toISOString(),
                  role: message.role === 'user' ? 'student' : message.role,
                  content: message.content || ''
                }));
                
                // Sort messages by timestamp
                formattedMessages.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
                
                // Add to all ID formats
                chatHistories[exerciseId] = formattedMessages;
                chatHistories[exerciseIdStr] = formattedMessages;
                if (exerciseIdNum !== null) chatHistories[exerciseIdNum] = formattedMessages;
              }
            });
            
            // Log found and missing IDs for debugging
            if (exercises && exercises.length > 0) {
              const foundIds = new Set(Object.keys(chatHistories));
              console.log("Found chat histories for IDs:", Array.from(foundIds));
              
              exercises.forEach(exercise => {
                const id = exercise.id;
                const idStr = String(id);
                const idNum = !isNaN(parseInt(id)) ? parseInt(id) : null;
                
                if (!foundIds.has(id) && !foundIds.has(idStr) && 
                    (idNum === null || !foundIds.has(idNum)) &&
                    (idNum === null || idNum <= 0 || !foundIds.has(idNum - 1))) {
                  console.log(`No chat history found for exercise ${id}`);
                }
              });
          }
          
          setAiChatHistory(chatHistories);
          console.log("AI chat history loaded successfully:", chatHistories);
        } else {
            console.log("No chat history found for this student and assignment, trying direct endpoint");
            await fetchDirectChatHistory(API_BASE, mongoUserId, assignmentId);
          }
        } else {
          console.warn("Failed to fetch AI chat history, trying direct endpoint");
          await fetchDirectChatHistory(API_BASE, mongoUserId, assignmentId);
        }
      } catch (chatError) {
        console.error("Error fetching AI chat history:", chatError);
        await fetchDirectChatHistory(API_BASE, mongoUserId, assignmentId);
      }
      
    } catch (err) {
      setError(err.message);
      console.error('Error fetching assignment data:', err);
      
      // Create empty placeholder data
      setAssignment(null);
      setSubmission(null);
      setCodeHistory([]);
      setKeystrokeHistory([]);
      setAiChatHistory({});
      setExercises([]);
      setAnswers({});
      setCodingActivity({});
    }
  };
  
  // Helper function to fetch chat history from direct endpoint
  const fetchDirectChatHistory = async (apiBase, userId, assignmentId) => {
    console.log("Fetching chat history from simple endpoint");
    
    try {
      // สร้าง URL สำหรับ endpoint ใหม่
      const url = new URL(`${apiBase}/ai/chat-history-simple`);
      
      // ใช้ URLSearchParams สำหรับสร้าง query parameters
      url.searchParams.append('user_id', userId);
      url.searchParams.append('assignment_id', assignmentId);
      
      console.log(`Attempting to fetch chat history from: ${url}`);
      
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log("Chat history response from simple endpoint:", data);
        
        // ตรวจสอบว่ามีข้อมูลหรือไม่
        if (data.success && data.results && data.results.length > 0) {
          console.log(`Found ${data.results.length} chat history records`);
          
          // สร้าง map ของข้อมูลแชทตาม exercise_id
          const chatHistories = {};
          
          data.results.forEach(history => {
            // Skip if no exercise_id or messages
            if (!history.exercise_id || !history.messages || history.messages.length === 0) {
              console.log(`Skipping chat history ${history._id} - missing exercise_id or messages`);
              return;
            }
            
            console.log(`Processing history for exercise_id: ${history.exercise_id}`);
            
            // Store under all possible key formats
            const exerciseId = history.exercise_id;
            const keysToUse = [
              exerciseId,                  // Original format
              String(exerciseId),          // String format
              parseInt(exerciseId) || null // Number format if applicable
            ].filter(k => k !== null && k !== undefined);
            
            // Format messages
            const formattedMessages = history.messages.map((msg, idx) => ({
              id: `${history._id || idx}-${idx}`,
              timestamp: msg.timestamp || new Date().toISOString(),
              role: msg.role === 'user' ? 'student' : (msg.role === 'student' ? 'student' : msg.role),
              content: msg.content || ''
            }));
            
            // Sort messages by timestamp
            formattedMessages.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
            
            // Store messages under each key format
            keysToUse.forEach(key => {
              chatHistories[key] = formattedMessages;
            });
            
            console.log(`Stored ${formattedMessages.length} messages for exercise ${exerciseId}`);
          });
          
          // Log final chat history structure for debugging
          console.log("Available exercise IDs in chat history:", Object.keys(chatHistories));
          setAiChatHistory(chatHistories);
        } else {
          console.log("No chat history found in response");
          setAiChatHistory({});
        }
      } else {
        console.warn(`Failed to fetch chat history: ${response.status} ${response.statusText}`);
        setAiChatHistory({});
      }
    } catch (error) {
      console.error("Error fetching chat history:", error);
      setAiChatHistory({});
    }
  };
  
  // Add helper function to process chat history data regardless of source
  const processChatHistoryData = (histories) => {
    if (!histories || histories.length === 0) {
      console.log("No histories to process");
      setAiChatHistory({});
      return;
    }
    
    console.log(`Processing ${histories.length} histories from data`);
    
    const chatHistories = {};
    
    histories.forEach(history => {
      const exerciseId = history.exercise_id;
      
      // Skip if no exercise_id
      if (!exerciseId) {
        console.log("Skipping history with no exercise_id");
        return;
      }
      
      // Store under all possible key formats
      const keysToUse = [
        exerciseId,                   // Original format
        String(exerciseId),           // String format
        parseInt(exerciseId) || null,  // Number format
      ];
      
      // Filter out null/undefined values
      const validKeys = keysToUse.filter(k => k !== null && k !== undefined);
      
      // Format messages
      if (history.messages && history.messages.length > 0) {
        // Create formatted messages
        const formattedMessages = history.messages.map((message, idx) => ({
          id: `${history._id || idx}-${idx}`,
          timestamp: message.timestamp || new Date().toISOString(),
          role: message.role === 'user' || message.role === 'student' ? 'student' : message.role,
          content: message.content || ''
        }));
        
        // Sort messages by timestamp
        formattedMessages.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        
        // Store under all valid keys
        validKeys.forEach(key => {
          chatHistories[key] = formattedMessages;
        });
      }
    });
    
    console.log("Processed chat histories:", chatHistories);
    setAiChatHistory(chatHistories);
  };
  
  // Helper function to fetch code history as fallback
  const fetchCodeHistory = async (apiBase, userId, assignmentId, exercisesList) => {
    console.log("Fetching code history as fallback");
    
    try {
      const historyResponse = await fetch(
        `${apiBase}/code/code-history?user_id=${userId}&limit=1000`,
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
        }
      );
      
      if (historyResponse.ok) {
        const historyData = await historyResponse.json();
        console.log(`Found ${historyData.length} code history entries`);
        
        // Process code history into coding activity format
        const activity = {};
        
        if (exercisesList && exercisesList.length > 0) {
          exercisesList.forEach(exercise => {
            // Filter history entries for this exercise - with better matching
            const exerciseHistory = historyData.filter(item => {
              // First check for a direct problem_index match
              const problemIndexMatch = 
                (item.problem_index === exercise.id) || 
                (item.problem_index !== null && parseInt(item.problem_index) === parseInt(exercise.id)) ||
                (String(item.problem_index) === String(exercise.id));
                
              // Then check for exercise_id
              const exerciseIdMatch = item.exercise_id && 
                (item.exercise_id === exercise.id || 
                String(item.exercise_id) === String(exercise.id));
                
              return problemIndexMatch || exerciseIdMatch;
            });
            
            if (exerciseHistory.length > 0) {
              // Sort by timestamp
              exerciseHistory.sort((a, b) => {
                return new Date(a.created_at) - new Date(b.created_at);
              });
              
              // Map to the format expected by the UI
              activity[exercise.id] = exerciseHistory.map((item, index) => ({
                id: index + 1,
                timestamp: item.created_at,
                action: item.action_type || 'access',
                exerciseId: exercise.id,
                code: item.code || ''
              }));
              console.log(`Found ${exerciseHistory.length} history entries for exercise ${exercise.id}`);
            } else {
              console.log(`No history entries found for exercise ${exercise.id}`);
              activity[exercise.id] = [];
            }
          });
          
          setCodingActivity(activity);
          console.log("Processed code history into coding activity:", activity);
        }
      } else {
        console.error("Failed to fetch code history");
      }
    } catch (historyError) {
      console.error("Error fetching code history:", historyError);
    }
  };

  useEffect(() => {
    fetchData();
    
    // Initialize current exercise ID in localStorage
    if (exercises.length > 0) {
      try {
        localStorage.setItem('current-exercise-id', JSON.stringify(exercises[0].id));
      } catch (e) {
        console.warn('Could not initialize current exercise ID in localStorage', e);
      }
    }
  }, [studentId, assignmentId]);
  
  // Add effect to automatically refresh timeline data when tab changes to timeline
  useEffect(() => {
    if (activeTab === 'timeline' && mongoUserIdRef) {
      console.log('Timeline tab selected, refreshing timeline data...');
      refreshTimelineData();
    }
  }, [activeTab, mongoUserIdRef]);
  
  // Update localStorage when exercises change
  useEffect(() => {
    if (exercises.length > 0 && currentExerciseIndex < exercises.length) {
      try {
        localStorage.setItem('current-exercise-id', JSON.stringify(exercises[currentExerciseIndex].id));
      } catch (e) {
        console.warn('Could not update current exercise ID in localStorage', e);
      }
    }
  }, [exercises, currentExerciseIndex]);

  // Add useEffect to verify data is loaded correctly
  useEffect(() => {
    if (exercises && exercises.length > 0 && Object.keys(codingActivity).length > 0) {
      console.log("Timeline data verification:");
      exercises.forEach((exercise, idx) => {
        const activityForExercise = codingActivity[exercise.id];
        console.log(`Exercise ${idx+1}: ID=${exercise.id} (${typeof exercise.id}), Timeline entries: ${activityForExercise ? activityForExercise.length : 0}`);
        
        // Check if we can find this exercise in a different way
        const matchingKeys = Object.keys(codingActivity).filter(key => 
          String(key) === String(exercise.id)
        );
        
        if (matchingKeys.length > 0 && !activityForExercise) {
          console.log(`Exercise ${exercise.id} found with different key format: ${matchingKeys[0]}`);
          // Copy data to make it accessible with the proper key
          codingActivity[exercise.id] = codingActivity[matchingKeys[0]];
        }
      });
    }
  }, [exercises, codingActivity]);

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
    router.push('/teacher/dashboard');
    }
  };

  const handleScoreChange = (e) => {
    const value = e.target.value;
    if (value === '' || (Number(value) >= 0 && Number(value) <= (assignment?.points || 100))) {
      setScore(value);
    }
  };

  const handleSubmission = async () => {
    if (!score || !feedback.trim()) {
      alert('Please provide both score and feedback');
      return;
    }

    setIsSubmitting(true);
    try {
      // Define API base URL
      const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      
      // Prepare data for submission
      const gradingData = {
        score: Number(score),
        feedback: { general: feedback.trim() },
        comments: [
          {
            text: feedback.trim()
          }
        ]
      };

      // Debug logging
      console.log("Preparing to submit grade for submission:", {
        submissionId: submission.id || submission._id,
        assignmentId: assignmentId,
        score: Number(score),
      });
      
      // Check if submission has a valid ID
      if (!submission.id && !submission._id) {
        console.error("Submission is missing both 'id' and '_id' fields:", submission);
        alert("Cannot submit grade: submission ID is missing");
        setIsSubmitting(false);
        return;
      }
      
      // Use either id or _id, converting _id if it's an object
      let submissionId = submission.id;
      if (!submissionId && submission._id) {
        submissionId = typeof submission._id === 'object' 
          ? submission._id.toString() 
          : submission._id;
      }

      // Send grading data to API
      console.log(`Submitting to endpoint: ${API_BASE}/assignments/${assignmentId}/grade/${submissionId}`);
      const response = await fetch(`${API_BASE}/assignments/${assignmentId}/grade/${submissionId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(gradingData),
      });

      // Check for HTTP errors
      if (!response.ok) {
        let errorDetail = `${response.status} ${response.statusText}`;
        try {
          const errorData = await response.json();
          errorDetail = errorData.detail || errorDetail;
        } catch (e) {
          console.error("Could not parse error response:", e);
        }
        throw new Error(`Failed to submit grade: ${errorDetail}`);
      }

      const result = await response.json();
      console.log("Grade submitted successfully:", result);

      // Update local submission data
      setSubmission(prev => ({
        ...prev,
        score: Number(score),
        status: 'graded',
        graded_at: new Date().toISOString(),
        feedback: { general: feedback.trim() },
        comments: [
          ...(prev.comments || []),
          {
            id: Date.now().toString(),
            user_id: "current_teacher", // This should be updated if we have current user info
            username: "Current Teacher", // This should be updated if we have current user info
            role: "teacher",
            text: feedback.trim(),
            timestamp: new Date().toISOString()
          }
        ]
      }));

      alert('Grade submitted successfully!');
      
      // Call the callback function to update parent component
      if (typeof onSubmissionUpdate === 'function') {
        onSubmissionUpdate();
      }
    } catch (err) {
      console.error("Error submitting grade:", err);
      alert(`Failed to submit grade: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // แก้ไขฟังก์ชันการจัดรูปแบบวันที่เวลาให้เป็นเวลาไทย
  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      // สร้าง date object จาก UTC
      const utcDate = new Date(dateString);
      
      // บวกเพิ่ม 7 ชั่วโมงสำหรับเวลาไทย (GMT+7)
      const thaiDate = new Date(utcDate.getTime() + (7 * 60 * 60 * 1000));
      
      // ใช้ locale string เพื่อจัดรูปแบบให้เป็นวันที่และเวลาแบบไทย
      const formattedDate = 
        thaiDate.getDate().toString().padStart(2, '0') + "/" +
        (thaiDate.getMonth() + 1).toString().padStart(2, '0') + "/" +
        (thaiDate.getFullYear() + 543) + " " + // แปลงเป็นปี พ.ศ. โดยบวก 543
        thaiDate.getHours().toString().padStart(2, '0') + ":" +
        thaiDate.getMinutes().toString().padStart(2, '0') + ":" +
        thaiDate.getSeconds().toString().padStart(2, '0');
        
      return formattedDate;
    } catch (e) {
      console.error("Error formatting date:", e);
      return String(dateString);
    }
  };

  // แก้ไขฟังก์ชันการจัดรูปแบบเวลาให้เป็นเวลาไทย
  const formatTime = (date) => {
    if (!date) return 'N/A';
    try {
      // แปลงเป็นเวลาไทย (GMT+7)
      return new Intl.DateTimeFormat('th-TH', {
        timeZone: 'Asia/Bangkok',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      }).format(date);
    } catch (e) {
      console.error("Error formatting time:", e);
      return 'N/A';
    }
  };

  // เพิ่มฟังก์ชันแปลงค่าเวลาดิบเป็นเวลาไทยโดยตรง
  const formatRawTime = (timeString) => {
    if (!timeString) return 'N/A';
    try {
      // แปลงโดยตรงโดยการบวกเวลาเพิ่ม 7 ชั่วโมงสำหรับ timezone ไทย (GMT+7)
      const utcDate = new Date(timeString);
      const thaiDate = new Date(utcDate.getTime() + (7 * 60 * 60 * 1000)); // บวก 7 ชั่วโมง
      
      // จัดรูปแบบเป็น HH:MM:SS แบบ 24 ชั่วโมง
      return thaiDate.toTimeString().split(' ')[0];
    } catch (e) {
      console.error("Error formatting raw time:", e);
      return String(timeString);
    }
  };

  // Get code history for current exercise
  const getCurrentExerciseHistory = () => {
    const currentExercise = exercises[currentExerciseIndex];
    if (!currentExercise || !codingActivity[currentExercise.id]) {
      return [];
    }
    return codingActivity[currentExercise.id];
  };

  // Get code at specific timeline position for current exercise
  const getCodeAtTimeIndex = (index) => {
    const currentExercise = exercises[currentExerciseIndex];
    if (!currentExercise || !codingActivity[currentExercise.id]) {
      return '';
    }
    
    const exerciseActivity = codingActivity[currentExercise.id];
    
    // If index is out of range, return the latest
    if (index >= exerciseActivity.length) {
      return exerciseActivity[exerciseActivity.length - 1]?.code || '';
    }
    
    // Return code at specific point in timeline
    return exerciseActivity[index]?.code || '';
  };

  // Generate timeline markers for current exercise
  const generateTimelineMarkers = () => {
    const currentExercise = exercises[currentExerciseIndex];
    if (!currentExercise || !codingActivity[currentExercise.id]) {
      return [];
    }
    
    const exerciseActivity = codingActivity[currentExercise.id];
    return exerciseActivity.map((item, index) => ({
      index,
      time: new Date(item.timestamp).toLocaleTimeString(),
      type: item.action
    }));
  };

  const handleNextExercise = () => {
    if (currentExerciseIndex < exercises.length - 1) {
      setCurrentExerciseIndex(currentExerciseIndex + 1);
      setTimelinePosition(0);
      
      // Save current exercise ID to localStorage for submission tracking
      try {
        localStorage.setItem('current-exercise-id', JSON.stringify(exercises[currentExerciseIndex + 1].id));
      } catch (e) {
        console.warn('Could not save current exercise ID to localStorage', e);
      }
    }
  };

  const handlePrevExercise = () => {
    if (currentExerciseIndex > 0) {
      setCurrentExerciseIndex(currentExerciseIndex - 1);
      setTimelinePosition(0);
      
      // Save current exercise ID to localStorage for submission tracking
      try {
        localStorage.setItem('current-exercise-id', JSON.stringify(exercises[currentExerciseIndex - 1].id));
      } catch (e) {
        console.warn('Could not save current exercise ID to localStorage', e);
      }
    }
  };

  // แก้ไขฟังก์ชัน getActivityForExercise เพื่อรวมข้อมูลจาก code_history และ keystroke
  const getActivityForExercise = (exerciseId) => {
    if (!exerciseId) {
      console.log(`No exercise ID provided`);
      return [];
    }
    
    console.log(`Looking for activity for exercise ${exerciseId} (${typeof exerciseId})`);
    
    // ค้นหา timeline activity จาก codingActivity
    let timelineEntries = [];
    
    // Try all possible matching methods for timeline data
    // Direct lookup first
    if (codingActivity[exerciseId] && codingActivity[exerciseId].length > 0) {
      console.log(`Found ${codingActivity[exerciseId].length} timeline entries with direct match on key: ${exerciseId}`);
      timelineEntries = codingActivity[exerciseId];
    }
    // Try string conversion
    else if (codingActivity[String(exerciseId)] && codingActivity[String(exerciseId)].length > 0) {
      console.log(`Found ${codingActivity[String(exerciseId)].length} timeline entries with string key: ${String(exerciseId)}`);
      timelineEntries = codingActivity[String(exerciseId)];
    }
    // Try numeric conversion if possible
    else {
    const numId = parseInt(exerciseId);
    if (!isNaN(numId)) {
      if (codingActivity[numId] && codingActivity[numId].length > 0) {
          console.log(`Found ${codingActivity[numId].length} timeline entries with numeric key: ${numId}`);
          timelineEntries = codingActivity[numId];
      }
        // Check for zero-based index
        else {
      const zeroBasedIndex = numId - 1;
      if (zeroBasedIndex >= 0 && codingActivity[zeroBasedIndex] && codingActivity[zeroBasedIndex].length > 0) {
            console.log(`Found ${codingActivity[zeroBasedIndex].length} timeline entries with zero-based index: ${zeroBasedIndex}`);
            timelineEntries = codingActivity[zeroBasedIndex];
          }
        }
      }
    }
    
    console.log(`Found ${timelineEntries.length} total timeline entries for exercise ${exerciseId}`);
    
    // รวม code history เข้ากับ timeline data
    let historyEntries = [];
    if (codeHistory && codeHistory.length > 0) {
      const exerciseNumber = parseInt(exerciseId);
      
      // กรองประวัติที่เกี่ยวข้องกับ exercise นี้
      const relevantHistory = codeHistory.filter(entry => {
        // Match by problem_index
        if (entry.problem_index !== undefined) {
          if (entry.problem_index === exerciseId || 
              String(entry.problem_index) === String(exerciseId) ||
              (!isNaN(exerciseNumber) && parseInt(entry.problem_index) === exerciseNumber)) {
            return true;
          }
        }
        
        // Match by exercise_id
        if (entry.exercise_id !== undefined) {
          if (entry.exercise_id === exerciseId || 
              String(entry.exercise_id) === String(exerciseId)) {
            return true;
          }
        }
        
        return false;
      });
      
      console.log(`Found ${relevantHistory.length} relevant code history entries for exercise ${exerciseId}`);
      
      // แปลง code history ให้อยู่ในรูปแบบเดียวกับ timeline entry
      historyEntries = relevantHistory.map((item, idx) => {
        // ถ้ามี action_type ใช้ action_type เลย
        let actionType = item.action_type || 'unknown';
        
        // ตรวจสอบ is_submission ด้วย
        if (item.is_submission) {
          actionType = 'submission';
        }
        // ถ้ายังไม่มี action_type หรือเป็น access แต่มี output ให้เป็น run
        else if (actionType === 'unknown' || (actionType === 'access' && item.output)) {
          actionType = 'run';
        }
        
        return {
          id: `history-${idx}`,
          timestamp: item.created_at || new Date().toISOString(),
          action: actionType,
          exerciseId: exerciseId,
          code: item.code || '',
          output: item.output || '',
          error: item.error || ''
        };
      });
      
      // เพิ่ม debug
      console.log(`Code history actions breakdown:`);
      const actionCounts = {};
      historyEntries.forEach(entry => {
        actionCounts[entry.action] = (actionCounts[entry.action] || 0) + 1;
      });
      console.log(actionCounts);
    }
    
    // รวม entries จาก timeline และ code history
    const allEntries = [...timelineEntries, ...historyEntries];
    
    // ถ้ามี entry ซ้ำกัน (ทั้ง keystroke และ code_history) ให้ deduplicate
    const uniqueTimestamps = new Set();
    const uniqueEntries = allEntries.filter(entry => {
      const timestampStr = new Date(entry.timestamp).getTime().toString();
      if (uniqueTimestamps.has(timestampStr)) {
        return false;
      }
      uniqueTimestamps.add(timestampStr);
      return true;
    });
    
    // เรียงลำดับตาม timestamp
    uniqueEntries.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    
    // แสดงจำนวนข้อมูลแต่ละประเภท
    const activityTypes = {};
    uniqueEntries.forEach(entry => {
      activityTypes[entry.action] = (activityTypes[entry.action] || 0) + 1;
    });
    
    console.log(`Final activity count: ${uniqueEntries.length} entries (${timelineEntries.length} from timeline, ${historyEntries.length} from history)`);
    console.log('Activity types breakdown:', activityTypes);
    
    // เพิ่มค่า display_time, thai_timestamp, และ raw_time_thai สำหรับการแสดงผลเวลาที่เป็นเวลาไทย
    const entriesWithThaiTime = uniqueEntries.map(entry => {
      // แปลงเวลาเป็นเวลาไทยโดยบวกเพิ่ม 7 ชั่วโมง
      const utcDate = new Date(entry.timestamp);
      const thaiDate = new Date(utcDate.getTime() + (7 * 60 * 60 * 1000));
      const thaiTimeString = thaiDate.toTimeString().split(' ')[0];
      
      return {
        ...entry,
        display_time: formatTime(thaiDate),
        raw_time_thai: thaiTimeString,
        // เพิ่ม thai_timestamp เพื่อใช้แทน timestamp ดั้งเดิม
        thai_timestamp: thaiDate.toISOString()
      };
    });
    
    return entriesWithThaiTime.length > 0 ? entriesWithThaiTime : [];
  };

  const timelineMarkers = generateTimelineMarkers();

  // Add a specific function to refresh the timeline data
  const refreshTimelineData = () => {
    // Define API base URL
    const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    const userId = mongoUserIdRef || studentId;
    
    console.log(`Manually refreshing timeline data for user ${userId}, assignment ${assignmentId}`);
    
    // Fetch fresh timeline data
    fetch(`${API_BASE}/code/keystrokes/${userId}/${assignmentId}/timeline`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    })
    .then(response => {
      if (response.ok) {
        return response.json();
      } else {
        throw new Error(`Failed to fetch timeline: ${response.status}`);
      }
    })
    .then(timelineData => {
      console.log(`Refreshed timeline data, found ${timelineData.length} entries`);
      
      // Debug the actual data to see problem_index values
      if (timelineData.length > 0) {
        console.log("Sample entry problem_index:", timelineData[0].problem_index);
        console.log("Sample entry exercise_id:", timelineData[0].exercise_id);
      }
      
      // Process into coding activity format (simplified version)
      const activity = {};
      
      // Initialize all exercises with empty arrays
      if (exercises && exercises.length > 0) {
        exercises.forEach(exercise => {
          activity[exercise.id] = [];
          activity[String(exercise.id)] = [];
          
          // Also initialize zero-based index arrays for problem_index data
          const zeroBasedIndex = parseInt(exercise.id) - 1;
          if (!isNaN(zeroBasedIndex) && zeroBasedIndex >= 0) {
            activity[zeroBasedIndex] = [];
            activity[String(zeroBasedIndex)] = [];
          }
        });
      }
      
      // Process each entry in the timeline data
      timelineData.forEach(item => {
        const problemIndex = item.problem_index;
        const exerciseId = item.exercise_id;
        
        console.log(`Processing entry: problem_index=${problemIndex}, exercise_id=${exerciseId}`);
        
        // แปลงเวลาเป็นเวลาไทย (GMT+7) โดยการบวกเพิ่ม 7 ชั่วโมง
        const utcDate = new Date(item.timestamp);
        const thaiDate = new Date(utcDate.getTime() + (7 * 60 * 60 * 1000));
        const thaiTimeString = thaiDate.toTimeString().split(' ')[0];
        
        // Try to match to exercises
        exercises.forEach(exercise => {
          const exerciseNumber = parseInt(exercise.id);
          const zeroBasedIndex = exerciseNumber - 1;
          
          // Check for direct match
          const directMatch = 
            (problemIndex !== undefined && (problemIndex === exercise.id || String(problemIndex) === String(exercise.id))) ||
            (exerciseId !== undefined && (exerciseId === exercise.id || String(exerciseId) === String(exercise.id)));
          
          // Check for zero-based problem_index match
          const zeroBasedMatch = 
            (problemIndex !== undefined && (
              problemIndex === zeroBasedIndex || 
              String(problemIndex) === String(zeroBasedIndex)
            ));
            
          if (directMatch || zeroBasedMatch) {
            // Add to both string and number versions of the ID
            const entry = {
              id: (activity[exercise.id].length || 0) + 1,
              timestamp: item.timestamp || new Date().toISOString(),
              thai_timestamp: thaiDate.toISOString(),  // เพิ่ม thai_timestamp
              raw_time_thai: thaiTimeString,          // เพิ่ม raw_time_thai
              action: item.action_type || 'keystroke',
              exerciseId: exercise.id,
              code: item.code || '',
              changes: item.changes || null
            };
            
            // Add to appropriate keys
            activity[exercise.id].push(entry);
            activity[String(exercise.id)].push(entry);
            
            // If we matched using zero-based index, also store in that key
            if (zeroBasedMatch) {
              if (!activity[zeroBasedIndex]) activity[zeroBasedIndex] = [];
              if (!activity[String(zeroBasedIndex)]) activity[String(zeroBasedIndex)] = [];
              
              activity[zeroBasedIndex].push(entry);
              activity[String(zeroBasedIndex)].push(entry);
              
              console.log(`Added entry to zero-based index ${zeroBasedIndex} for exercise ${exercise.id}`);
            }
            
            console.log(`Added entry for exercise ${exercise.id}${zeroBasedMatch ? ` (matched zero-based index ${zeroBasedIndex})` : ''}`);
          }
        });
      });
      
      // Sort all entries by timestamp
      Object.keys(activity).forEach(key => {
        if (activity[key] && activity[key].length > 0) {
          activity[key].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        }
      });
      
      // Debug what we've processed
      console.log("Processed activity keys:", Object.keys(activity).map(key => {
        return {
          key,
          entries: activity[key] ? activity[key].length : 0
        };
      }));
      
      // Update state with fresh data
      setCodingActivity(activity);
      console.log(`Timeline refresh complete, processed ${Object.keys(activity).length} exercise keys`);
    })
    .catch(error => {
      console.error("Error refreshing timeline:", error);
      // Fall back to code history if timeline fetch fails
      fetchCodeHistory(API_BASE, userId, assignmentId, exercises);
    });
  };

  if (error && !assignment) {
    return <div className="error-container">Error: {error}</div>;
  }

  if (!assignment || !submission) {
    return <AssignmentSkeleton />;
  }

  return (
    <div className="student-assignment coding-container create-assignment-container">
      <div className="back-button-container">
        <button 
          className="back-button"
          onClick={handleBack}
        >
          ← Back to List
        </button>
      </div>

      <div className="assignment-header">
        <h1 className="assignment-title">{assignment.title}</h1>
        <div className="assignment-meta">
          <span>Chapter: {assignment.chapter}</span>
          <span>Due: {formatDateTime(assignment.dueDate)}</span>
          <span>Points: {assignment.points}</span>
        </div>
      </div>

      <div className="student-info-panel table-container">
        <div className="student-details">
          <h3>Student Information</h3>
          <div className="info-grid">
            <div className="info-item">
              <label>Name</label>
              <span>{submission.username || 'N/A'}</span>
            </div>
            <div className="info-item">
              <label>ID</label>
              <span>{studentId}</span>
            </div>
            <div className="info-item">
              <label>Section</label>
              <span>{submission.section || 'N/A'}</span>
            </div>
            <div className="info-item">
              <label>Submitted</label>
              <span>{formatDateTime(submission.submitted_at)}</span>
            </div>
            <div className="info-item">
              <label>Status</label>
              <span className={`status-badge ${typeof submission.status === 'string' ? submission.status : 'pending'}`}>
                {typeof submission.status === 'string' ? submission.status : 'pending'}
              </span>
            </div>
            <div className="info-item score-input-container">
              <label>Score</label>
              <div className="score-input">
                <input
                  type="number"
                  value={score}
                  onChange={handleScoreChange}
                  min="0"
                  max={assignment.points}
                  placeholder="0"
                  disabled={submission.status === 'graded'}
                />
                <span>/ {assignment.points}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="tab-navigation">
        <button 
          className={activeTab === 'exercises' ? 'active' : ''} 
          onClick={() => setActiveTab('exercises')}
        >
          Exercises
        </button>
        <button 
          className={activeTab === 'timeline' ? 'active' : ''} 
          onClick={() => setActiveTab('timeline')}
        >
          Code Timeline
        </button>
        <button 
          className={activeTab === 'ai-chat' ? 'active' : ''} 
          onClick={() => setActiveTab('ai-chat')}
        >
          AI Chat History
        </button>
        <button 
          className={activeTab === 'keystroke' ? 'active' : ''} 
          onClick={() => setActiveTab('keystroke')}
        >
          Coding Activity
        </button>
      </div>

      <div className="content-grid">
        <div className="main-content-assignment table-container">
          {activeTab === 'exercises' && (
            <div className="exercise-section">
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

              <div className="exercise-content">
                <h3>{exercises[currentExerciseIndex].title}</h3>
                <p className="exercise-description">
                  {exercises[currentExerciseIndex].description}
                </p>

                {(exercises[currentExerciseIndex].type === 'output' || 
                  exercises[currentExerciseIndex].type === 'explain' || 
                  exercises[currentExerciseIndex].type === 'Output' || 
                  exercises[currentExerciseIndex].type === 'Explain') && (
                  <div className="exercise-output">
                    <h4>Student's Answer:</h4>
                    <div className="answer-display">
                      {(() => {
                        const exerciseId = exercises[currentExerciseIndex].id;
                        const exerciseNumber = currentExerciseIndex + 1;
                        const exerciseType = exercises[currentExerciseIndex].type;
                        console.log(`Looking for OUTPUT/EXPLAIN answer for exercise ${exerciseNumber} (ID: ${exerciseId}, Type: ${exerciseType})`, answers);
                        
                        // ใช้เลขข้อโดยตรง - ดูจากรูปแล้วใช้ตัวเลขเป็นคีย์
                        const answer = answers[exerciseNumber] || answers[String(exerciseNumber)];
                        
                        if (answer) {
                          console.log(`Found answer for exercise ${exerciseNumber}:`, answer);
                          if (typeof answer === 'string') {
                            return answer;
                          } else if (typeof answer === 'object') {
                            return JSON.stringify(answer);
                          }
                        }
                        
                        console.log(`No answer found for exercise ${exerciseNumber}`);
                        return "No answer submitted";
                      })()}
                    </div>
                  </div>
                )}

                {exercises[currentExerciseIndex].type === 'fill' && (
                  <div className="exercise-fill">
                    <h4>Code Template:</h4>
                    <pre className="code-display">
                      <code>{exercises[currentExerciseIndex].code}</code>
                    </pre>
                    <h4>Student's Answer:</h4>
                    <div className="answer-display">
                      {(() => {
                        const exerciseNumber = currentExerciseIndex + 1;
                        console.log(`Looking for fill answer for exercise ${exerciseNumber}`, answers);
                        
                        // ใช้เลขข้อโดยตรง
                        const answer = answers[exerciseNumber] || answers[exerciseNumber.toString()];
                        
                        if (answer) {
                          if (typeof answer === 'object') {
                            return (
                              <div>
                                {Object.entries(answer).map(([key, value], i) => {
                                  const blankIndex = key.split('-').pop();
                                  return (
                                    <div key={i} className="blank-answer">
                                      <strong>Blank {blankIndex}:</strong> {value}
                                    </div>
                                  );
                                })}
                              </div>
                            );
                          } else if (typeof answer === 'string') {
                            return answer;
                          }
                        }
                        
                        return "No answer submitted";
                      })()}
                    </div>
                  </div>
                )}

                {exercises[currentExerciseIndex].type === 'coding' && (
                  <div className="exercise-coding">
                    <h4>Student's Code:</h4>
                    <pre className="code-display">
                      <code>{(() => {
                        const exerciseId = exercises[currentExerciseIndex].id;
                        const exerciseNumber = currentExerciseIndex + 1;
                        console.log(`Looking for coding answer for exercise ${exerciseNumber} (ID: ${exerciseId})`, answers);
                        
                        // Log ค่าคำตอบทั้งหมดเพื่อดูข้อมูล
                        console.log("All answers:", JSON.stringify(answers, null, 2));
                        
                        // ใช้เลขข้อโดยตรงและแยกตามข้อที่ชัดเจน
                        let answer;
                        
                        // วิธีที่ 1: ใช้ exerciseNumber (ตัวเลขลำดับข้อ)
                        if (answers[exerciseNumber] !== undefined) {
                          answer = answers[exerciseNumber];
                          console.log(`Found answer using exercise number key ${exerciseNumber}:`, answer);
                        }
                        
                        // วิธีที่ 2: ใช้ exerciseId (ID ของข้อ)
                        else if (answers[exerciseId] !== undefined) {
                          answer = answers[exerciseId];
                          console.log(`Found answer using exercise ID key ${exerciseId}:`, answer);
                        }
                        
                        // วิธีที่ 3: ใช้ String(exerciseNumber)
                        else if (answers[String(exerciseNumber)] !== undefined) {
                          answer = answers[String(exerciseNumber)];
                          console.log(`Found answer using string exercise number key "${exerciseNumber}":`, answer);
                        }
                        
                        // วิธีที่ 4: ใช้ String(exerciseId)
                        else if (answers[String(exerciseId)] !== undefined) {
                          answer = answers[String(exerciseId)];
                          console.log(`Found answer using string exercise ID key "${exerciseId}":`, answer);
                        }
                        
                        // ถ้าเจอคำตอบ ให้แสดงผล
                        if (answer !== undefined) {
                          if (typeof answer === 'string') {
                            return answer;
                          } else if (typeof answer === 'object') {
                            return JSON.stringify(answer, null, 2);
                          }
                        }
                        
                        // ถ้าไม่เจอคำตอบจากข้างบน ลองดึงคำตอบจาก submission
                        if (submission) {
                          // ถ้ามี code ใน submission โดยตรง
                          if (submission.code) {
                            return submission.code;
                          }
                          
                          // ถ้ามี answers และเป็น coding exercise
                          if (submission.answers) {
                            // ลองดึงคำตอบจาก submission.answers โดยตรง
                            const subAnswer = submission.answers[exerciseId] || 
                                             submission.answers[String(exerciseId)] || 
                                             submission.answers[exerciseNumber] || 
                                             submission.answers[String(exerciseNumber)];
                            
                            if (subAnswer) {
                              console.log(`Found answer in submission for exercise ${exerciseNumber}:`, subAnswer);
                              if (typeof subAnswer === 'string') {
                                return subAnswer;
                              } else if (typeof subAnswer === 'object') {
                                return JSON.stringify(subAnswer, null, 2);
                              }
                            }
                          }
                        }
                        
                        // ถ้าไม่มีเลย ใช้โค้ดเริ่มต้นของโจทย์
                        return exercises[currentExerciseIndex].starter_code || "No code submitted";
                      })()}</code>
                    </pre>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'timeline' && (
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

              <h3>Code Evolution Timeline - {exercises[currentExerciseIndex]?.title || 'Exercise'}</h3>
              
              <div className="timeline-slider-container">
                {/* Add debugging info */}
                {console.log(`Current exercise ID: ${exercises[currentExerciseIndex]?.id} (${typeof exercises[currentExerciseIndex]?.id})`)}
                {console.log(`Available activity keys: ${Object.keys(codingActivity).join(', ')}`)}
                {exercises[currentExerciseIndex] && console.log(`Activity for current exercise: ${getActivityForExercise(exercises[currentExerciseIndex].id).length} entries`)}
                
                {exercises[currentExerciseIndex] && (() => {
                  const currentExerciseId = exercises[currentExerciseIndex].id;
                  const activity = getActivityForExercise(currentExerciseId);
                  
                  // Log details about the activity we found
                  console.log(`Timeline data for exercise ${currentExerciseId}: ${activity ? activity.length : 0} entries`);
                  if (activity && activity.length > 0) {
                    console.log("First activity entry:", {
                      timestamp: activity[0].timestamp,
                      action: activity[0].action,
                      code: activity[0].code ? activity[0].code.substring(0, 30) + "..." : null
                    });
                  }
                  
                  // Try to directly access the data using all possible key formats
                  let directActivity = null;
                  if (codingActivity[currentExerciseId]?.length > 0) {
                    directActivity = codingActivity[currentExerciseId];
                    console.log(`Direct access found ${directActivity.length} entries`);
                  } else if (codingActivity[String(currentExerciseId)]?.length > 0) {
                    directActivity = codingActivity[String(currentExerciseId)];
                    console.log(`String key access found ${directActivity.length} entries`);
                  } else if (!isNaN(parseInt(currentExerciseId)) && 
                            codingActivity[parseInt(currentExerciseId)]?.length > 0) {
                    directActivity = codingActivity[parseInt(currentExerciseId)];
                    console.log(`Numeric key access found ${directActivity.length} entries`);
                  }
                  
                  // Use either the activity from the getter function or direct access
                  const effectiveActivity = 
                    (activity && activity.length > 0) ? activity : 
                    (directActivity && directActivity.length > 0) ? directActivity : 
                    [];
                  
                  if (effectiveActivity.length > 0) {
                    // Calculate a safe timeline position
                    const safePosition = Math.min(timelinePosition, effectiveActivity.length - 1);
                    
                    return (
                  <>
                <input 
                  type="range" 
                  min="0" 
                          max={effectiveActivity.length - 1} 
                          value={safePosition}
                  onChange={(e) => setTimelinePosition(parseInt(e.target.value))} 
                  className="timeline-slider"
                />
                <div className="timeline-markers">
                          {effectiveActivity.map((item, idx) => (
                            <div 
                              key={idx}
                              className={`timeline-marker ${item.action} ${idx === safePosition ? 'active' : ''}`}
                              style={{left: `${(idx / (effectiveActivity.length - 1)) * 100}%`}}
                              onClick={() => setTimelinePosition(idx)}
                              title={`${item.raw_time_thai || formatRawTime(item.timestamp)} - ${item.action}`}
                            >
                              <span className="marker-tooltip">
                                {item.raw_time_thai || formatRawTime(item.timestamp)}
                                <br/>
                                {item.action}
                              </span>
                            </div>
                          ))}
                </div>
                  </>
                    );
                  } else {
                    // Force fetch code history if we have no timeline data
                    if (!checkedCodeHistory) {
                      console.log("No timeline data found, checking code history...");
                      setCheckedCodeHistory(true);
                      // Try to load code history on next render
                      setTimeout(() => {
                        fetchCodeHistory(
                          process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000', 
                          mongoUserIdRef || studentId,  
                          assignmentId, 
                          exercises
                        );
                      }, 100);
                    }
                    
                    return (
                      <div className="empty-state">
                        <p>No timeline data available for this exercise</p>
                        <p className="debug-info">Exercise ID: {currentExerciseId}</p>
                        
                        <button 
                          className="refresh-button"
                          onClick={() => {
                            refreshTimelineData();
                          }}
                        >
                          Refresh Timeline Data
                        </button>
                      </div>
                    );
                  }
                })()}
              </div>

              {exercises[currentExerciseIndex] && (() => {
                const currentExerciseId = exercises[currentExerciseIndex].id;
                const activity = getActivityForExercise(currentExerciseId);
                
                if (activity && activity.length > 0 && timelinePosition < activity.length) {
                  const currentItem = activity[timelinePosition];
                  return (
                <>
              <div className="timeline-info">
                <div className="current-position-info">
                          <span>Time: {currentItem.raw_time_thai || formatRawTime(currentItem.timestamp)}</span>
                          <span>Action: {currentItem.action}</span>
                        </div>
                        
                        <div className="timeline-navigation">
                          <button 
                            onClick={() => setTimelinePosition(Math.max(0, timelinePosition - 1))}
                            disabled={timelinePosition === 0}
                            className="timeline-nav-button"
                          >
                            Previous Change
                          </button>
                          <button 
                            onClick={() => setTimelinePosition(Math.min(activity.length - 1, timelinePosition + 1))}
                            disabled={timelinePosition === activity.length - 1}
                            className="timeline-nav-button"
                          >
                            Next Change
                          </button>
                          <button 
                            onClick={refreshTimelineData}
                            className="refresh-button"
                          >
                            Refresh
                          </button>
                        </div>
              </div>

              <div className="code-display">
                <pre>
                  <code>
                    {currentItem.code ? 
                      // Handle newlines in the code properly
                      currentItem.code.split('\\n').join('\n') :
                      (exercises[currentExerciseIndex].code || "// No code available")
                    }
                  </code>
                </pre>
              </div>
                      
                      {/* Display code changes if available */}
                      {timelinePosition > 0 && (
                        <div className="code-diff-display">
                          <h4>Changes from Previous Version</h4>
                          <div className="diff-container">
                            {(() => {
                              const currentCode = currentItem.code || '';
                              const prevCode = activity[timelinePosition - 1].code || '';
                              
                              // Check if we have changes from the API
                              const changes = currentItem.changes;
                              
                              if (changes && Array.isArray(changes)) {
                                // If we have changes from the API, use them
                                return (
                                  <pre className="diff-content">
                                    {changes.map((line, i) => {
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
                              } else {
                                // Otherwise calculate diff on client side
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
                                        return <div key={i} className="diff-line diff-unchanged"> {line}</div>;
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
                } else {
                  return (
                    <div className="empty-state">
                      <p>No timestamped code changes available for this exercise.</p>
                      <p>Please ensure there are keystroke entries recorded for this exercise.</p>
                      <div className="debug-info">
                        <p>Current Exercise ID: {currentExerciseId}</p>
                        <p>Available data: {activity ? activity.length : 0} entries</p>
                        <p>If this continues, try making some code changes in the editor first.</p>
                      </div>
                    </div>
                  );
                }
              })()}
            </div>
          )}

          {activeTab === 'ai-chat' && (
            <div className="ai-chat-section">
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

              <h3>AI Chat History - {exercises[currentExerciseIndex]?.title || 'Exercise'}</h3>
              
              <div className="chat-container">
                {exercises[currentExerciseIndex] && (() => {
                  const currentExercise = exercises[currentExerciseIndex];
                  const exerciseId = currentExercise.id;
                  
                  // Try multiple formats of the ID to find chat history
                  let chatMessages = null;
                  
                  // Try exact match first
                  if (aiChatHistory[exerciseId] && aiChatHistory[exerciseId].length > 0) {
                    chatMessages = aiChatHistory[exerciseId];
                  }
                  // Try string format
                  else if (aiChatHistory[String(exerciseId)] && aiChatHistory[String(exerciseId)].length > 0) {
                    chatMessages = aiChatHistory[String(exerciseId)];
                  }
                  // Try numeric format if possible
                  else if (!isNaN(parseInt(exerciseId)) && 
                           aiChatHistory[parseInt(exerciseId)] && 
                           aiChatHistory[parseInt(exerciseId)].length > 0) {
                    chatMessages = aiChatHistory[parseInt(exerciseId)];
                  }
                  
                  // REMOVED: Don't try to fetch chat history from other exercises
                  // This was causing chat history from other problems to appear
                  
                  if (chatMessages && chatMessages.length > 0) {
                    return chatMessages.map((message) => (
                  <div key={message.id} className={`chat-message ${message.role}`}>
                    <div className="message-header">
                      <span className="message-sender">
                            {message.role === 'student' || message.role === 'user' ? 'Student' : 'AI Assistant'}
                      </span>
                      <span className="message-time">
                        {new Date(message.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <div className="message-content">
                      {message.content}
                    </div>
                  </div>
                    ));
                  } else {
                    return (
                      <div className="empty-state">
                        <p>นักเรียนไม่มีประวัติการถาม AI ในข้อนี้</p>
                        <div className="debug-info">
                          <p>Exercise ID: {exerciseId} (type: {typeof exerciseId})</p>
                          <p>Available exercise IDs in chat history: {Object.keys(aiChatHistory).join(", ")}</p>
                          <details>
                            <summary>Check data types</summary>
                            <p>Exercise ID type: {typeof exerciseId}</p>
                            <p>Chat history keys types: {Object.keys(aiChatHistory).map(key => `${key}(${typeof key})`).join(", ")}</p>
                          </details>
                          <div className="debug-buttons">
                            <button onClick={() => {
                              // ดึงข้อมูลแชทใหม่โดยตรงจาก API
                              const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
                              const userId = mongoUserIdRef || studentId;
                              
                              console.log(`Retry: Fetching chat history for user ${userId}, assignment ${assignmentId}, exercise ${exerciseId}`);
                              
                              // แสดง URL และพารามิเตอร์ที่ใช้
                              const urlStr = `${API_BASE}/ai/chat-history-simple?user_id=${encodeURIComponent(userId)}&assignment_id=${encodeURIComponent(assignmentId)}&exercise_id=${encodeURIComponent(exerciseId)}`;
                              console.log(`API URL: ${urlStr}`);
                              
                              // ใช้ fetch พร้อม timeout
                              const controller = new AbortController();
                              const timeout = setTimeout(() => controller.abort(), 10000); // 10 second timeout
                              
                              fetch(urlStr, {
                                method: 'GET',
                                headers: { 'Content-Type': 'application/json' },
                                credentials: 'include',
                                signal: controller.signal
                              })
                              .then(response => {
                                clearTimeout(timeout);
                                if (!response.ok) {
                                  throw new Error(`Failed to fetch: ${response.status} ${response.statusText}`);
                                }
                                return response.json();
                              })
                              .then(data => {
                                console.log("Chat history response:", data);
                                
                                if (data.success && data.results && data.results.length > 0) {
                                  // ดึงข้อมูลเฉพาะ exercise ที่ต้องการ
                                  const relevantHistories = data.results.filter(h => 
                                    h.exercise_id && (
                                      String(h.exercise_id) === String(exerciseId) ||
                                      (parseInt(h.exercise_id) === parseInt(exerciseId) && !isNaN(parseInt(exerciseId)))
                                    )
                                  );
                                  
                                  if (relevantHistories.length > 0) {
                                    // สร้าง chat history ใหม่
                                    const newHistory = {};
                                    
                                    // Process all matching histories
                                    relevantHistories.forEach(history => {
                                      const messages = history.messages || [];
                                      
                                      // Format messages
                                      const formattedMessages = messages.map((msg, idx) => ({
                                        id: `manual-${idx}`,
                                        timestamp: msg.timestamp || new Date().toISOString(),
                                        role: msg.role === 'user' ? 'student' : (msg.role === 'student' ? 'student' : msg.role),
                                        content: msg.content || ''
                                      }));
                                      
                                      // Store under all common key formats
                                      newHistory[history.exercise_id] = formattedMessages;
                                      newHistory[String(history.exercise_id)] = formattedMessages;
                                      
                                      if (!isNaN(parseInt(history.exercise_id))) {
                                        newHistory[parseInt(history.exercise_id)] = formattedMessages;
                                      }
                                    });
                                    
                                    // Update state with all found chat histories
                                    setAiChatHistory(newHistory);
                                    console.log("Updated chat history state:", newHistory);
                                  } else {
                                    console.log(`No exact match for exercise ID ${exerciseId}. Not displaying history from other exercises.`);
                                    // Create empty history for this exercise to prevent showing others
                                    const newHistory = {...aiChatHistory};
                                    
                                    // Store empty array under all possible formats of the exercise ID
                                    newHistory[exerciseId] = [];
                                    newHistory[String(exerciseId)] = [];
                                    if (!isNaN(parseInt(exerciseId))) {
                                      newHistory[parseInt(exerciseId)] = [];
                                    }
                                    
                                    setAiChatHistory(newHistory);
                                    console.log("Updated chat history with empty entry for this exercise:", newHistory);
                                  }
                                } else {
                                  console.error("No chat history found in response");
                                }
                              })
                              .catch(error => {
                                clearTimeout(timeout);
                                console.error("Error fetching chat history:", error);
                              });
                            }}>
                              Retry with string conversion
                            </button>
                            
                            <button onClick={() => {
                              // ทดสอบการเชื่อมต่อกับ API
                              const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
                              console.log("Testing API connection to:", API_BASE);
                              
                              // ทดสอบ endpoint โดยตรงที่ root URL
                              fetch(`${API_BASE}/health-check`, {
                                method: 'GET',
                                headers: { 'Content-Type': 'application/json' },
                                mode: 'cors',  // ระบุ CORS mode ชัดเจน
                              })
                              .then(response => response.json())
                              .then(data => {
                                console.log("Health check response:", data);
                                alert(`API Health check: ${JSON.stringify(data)}`);
                              })
                              .catch(error => {
                                console.error("Error testing API:", error);
                                alert(`Error testing API: ${error.message}`);
                              });
                            }}>
                              Test API Connection
                            </button>
                            
                            <button onClick={() => {
                              // ทดสอบ AI API endpoint โดยตรง
                              const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
                              console.log("Testing AI API endpoint:", API_BASE);
                              
                              fetch(`${API_BASE}/ai/test`, {
                                method: 'GET',
                                mode: 'cors',  // ระบุ CORS mode ชัดเจน
                              })
                              .then(response => response.json())
                              .then(data => {
                                console.log("AI API test result:", data);
                                alert(`AI API test result: ${JSON.stringify(data)}`);
                              })
                              .catch(error => {
                                console.error("Error testing AI API:", error);
                                alert(`Error testing AI API: ${error.message}`);
                              });
                            }}>
                              Test AI API
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  }
                })()}
              </div>
            </div>
          )}

          {activeTab === 'keystroke' && (
            <div className="keystroke-section">
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

              <h3>Coding Activity - {exercises[currentExerciseIndex]?.title || 'Exercise'}</h3>
              
              {(() => {
                const currentExercise = exercises[currentExerciseIndex];
                const exerciseId = currentExercise?.id;
                
                // Get activity data for current exercise
                const exerciseActivity = getActivityForExercise(exerciseId);
                
                // Calculate statistics
                const stats = {
                  totalKeystrokes: 0,
                  firstActivity: null,
                  lastActivity: null,
                  timeSpent: 0,
                  activityByType: {}
                };
                
                if (exerciseActivity && exerciseActivity.length > 0) {
                  // Sort activities by timestamp and use Thai time
                  const sortedActivities = [...exerciseActivity].sort((a, b) => 
                    new Date(a.thai_timestamp || a.timestamp) - new Date(b.thai_timestamp || b.timestamp)
                  );
                  
                  // ใช้ thai_timestamp หรือแปลงเป็นเวลาไทยก่อนแสดงผล
                  if (sortedActivities.length > 0) {
                    // ใช้เวลาเริ่มต้นและสิ้นสุดที่เป็น UTC (ไม่บวกเวลาเพิ่ม เพราะจะบวกเพิ่มตอนแสดงผล)
                    stats.firstActivity = new Date(sortedActivities[0].timestamp);
                    stats.lastActivity = new Date(sortedActivities[sortedActivities.length - 1].timestamp);
                   
                    // Calculate time spent (in minutes) using the original times (not Thai times)
                    stats.timeSpent = Math.max(1, Math.round(
                      (stats.lastActivity - stats.firstActivity) / (1000 * 60)
                    ));
                    
                    // สร้างเวลาไทยแบบตรงๆ เพื่อการแสดงผล
                    // คำนวณเวลาไทยสำหรับแสดงผล โดยบวกเพิ่ม 7 ชั่วโมง (GMT+7)
                    const firstDate = new Date(stats.firstActivity.getTime() + (7 * 60 * 60 * 1000));
                    const lastDate = new Date(stats.lastActivity.getTime() + (7 * 60 * 60 * 1000));
                    
                    // จัดรูปแบบเป็น HH:MM:SS
                    stats.firstActivityThai = 
                      firstDate.getHours().toString().padStart(2, '0') + ":" +
                      firstDate.getMinutes().toString().padStart(2, '0') + ":" +
                      firstDate.getSeconds().toString().padStart(2, '0');
                      
                    stats.lastActivityThai = 
                      lastDate.getHours().toString().padStart(2, '0') + ":" +
                      lastDate.getMinutes().toString().padStart(2, '0') + ":" +
                      lastDate.getSeconds().toString().padStart(2, '0');
                  }
                  
                  // Count activities by type
                  sortedActivities.forEach(activity => {
                    const type = activity.action || 'unknown';
                    stats.activityByType[type] = (stats.activityByType[type] || 0) + 1;
                    
                    if (type === 'keystroke') {
                      stats.totalKeystrokes++;
                    }
                  });
                }
                
                // เพิ่มฟังก์ชันแปลงค่าเวลาดิบเป็นเวลาไทยแบบตรงๆ (สำหรับ Time Spent)
                const getThaiTimeString = (date) => {
                  if (!date) return 'N/A';
                  try {
                    // บวกเพิ่ม 7 ชั่วโมงเป็นเวลาไทย (GMT+7)
                    const thaiDate = new Date(date.getTime() + (7 * 60 * 60 * 1000));
                    
                    // จัดรูปแบบเป็น HH:MM:SS
                    const hours = thaiDate.getHours().toString().padStart(2, '0');
                    const minutes = thaiDate.getMinutes().toString().padStart(2, '0');
                    const seconds = thaiDate.getSeconds().toString().padStart(2, '0');
                    
                    return `${hours}:${minutes}:${seconds}`;
                  } catch (e) {
                    console.error("Error formatting Thai time:", e);
                    return 'N/A';
                  }
                };
                
                return (
                  <div className="activity-dashboard">
                    <div className="activity-stats-grid">
                      <div className="stat-card">
                        <h4>Time Spent</h4>
                        <div className="stat-value">
                          {stats.timeSpent > 0 ? `${stats.timeSpent} minutes` : 'N/A'}
                        </div>
                        {stats.firstActivityThai && stats.lastActivityThai && (
                          <div className="stat-detail">
                            From {stats.firstActivityThai} to {stats.lastActivityThai}
                          </div>
                        )}
                      </div>
                      
                      <div className="stat-card">
                        <h4>Total Keystrokes</h4>
                        <div className="stat-value">{stats.totalKeystrokes}</div>
                        <div className="stat-detail">
                          {stats.activityByType['keystroke'] && stats.timeSpent > 0 ? 
                            `${Math.round(stats.activityByType['keystroke'] / stats.timeSpent)} keystrokes/minute` : 
                            'N/A'}
                        </div>
                      </div>
                    </div>

                    <div className="activity-timeline">
                      <h4>Activity Timeline</h4>
                      {exerciseActivity && exerciseActivity.length > 0 ? (
                        <div className="timeline-container">
                          {exerciseActivity.map((activity, idx) => (
                            <div key={idx} className="timeline-event">
                              <div className="event-time">
                                {activity.raw_time_thai || formatRawTime(activity.timestamp)}
                              </div>
                              <div className={`event-type ${activity.action}`}>
                                {activity.action}
                              </div>
                              <div className="event-content">
                                {activity.code && (
                                  <div className="event-code">
                                    <pre><code>{activity.code.length > 300 ? 
                                      activity.code.substring(0, 300) + "..." : 
                                      activity.code}</code></pre>
                                  </div>
                                )}
                                {activity.output && (
                                  <div className="event-output">
                                    <strong>Output:</strong> {activity.output}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="empty-state">No activity recorded for this exercise</div>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </div>

        <div className="feedback-container table-container">
          <h3>Grading & Feedback</h3>
          
          {submission.status !== 'graded' ? (
            <div className="feedback-input">
              <textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="Add your feedback for the student..."
                disabled={submission.status === 'graded' || isSubmitting}
              />
              <button 
                onClick={handleSubmission} 
                className="btn-submit" 
                disabled={submission.status === 'graded' || isSubmitting || !score || !feedback.trim()}
              >
                {isSubmitting ? 'Submitting...' : 'Submit Grade & Feedback'}
              </button>
            </div>
          ) : (
            <div className="feedback-success">
              Graded on {formatDateTime(submission.graded_at)}
            </div>
          )}
          
          <div className="feedback-history">
            <h4>Feedback History</h4>
            {submission.comments && submission.comments.length > 0 ? (
              submission.comments.map((comment, idx) => (
                <div key={idx} className="feedback-item">
                  <div className="feedback-header">
                    <span className="feedback-author">{comment.username || 'Teacher'}</span>
                    <span className="feedback-time">{formatDateTime(comment.timestamp)}</span>
                  </div>
                  {submission.score && idx === 0 && (
                    <div className="feedback-score">Score: {submission.score}/{assignment.points}</div>
                  )}
                  <p className="feedback-content">{comment.text}</p>
                </div>
              ))
            ) : (
              <div className="empty-state">No feedback yet</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentAssignment;