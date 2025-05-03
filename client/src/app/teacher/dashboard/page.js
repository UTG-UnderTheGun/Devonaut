'use client'
import { useState, useEffect } from 'react';
import Stats from '@/components/stats/stats.js';
import StudentTable from '@/components/tables/student-table.js';
import AssignmentTable from '@/components/tables/assignment-table.js';
import TableControls from '@/components/controls/table-control.js';
import Pagination from '@/components/controls/pagination.js';
import PendingAssignments from '@/components/tables/pendingassignment.js';
import SectionView from '@/components/sections/section.js';
import StudentAssignment from '@/components/assignment/student-assignment';
import { useSearchParams, useRouter } from 'next/navigation';
import DashboardSkeleton from './dashboard-skeleton';
import './dashboard.css';
import './dashboard-skeleton.css';
import useAuth from '@/hook/useAuth';
import CreateAssignment from '@/components/assignment/create-assignment';

// Define stats constant to replace the removed import
const stats = [
  { id: 'students', title: 'Students', count: 0, icon: '👥' },
  { id: 'assignments', title: 'Assignments', count: 0, icon: '📝' },
  { id: 'pending', title: 'Pending', count: 0, icon: '⏳' },
  { id: 'sections', title: 'Sections', count: 0, icon: '🏫' }
];

// Define constants to replace other removed imports
const assignments = [];
const pendingAssignments = [];
const sectionDetails = [];

// Define ITEMS_PER_PAGE constant
const ITEMS_PER_PAGE = 10;

const TeacherDashboard = () => {
  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, error: authError, isLoading: authLoading } = useAuth(['teacher']);
  
  const [activeView, setActiveView] = useState(searchParams.get('view') || 'students');
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSection, setSelectedSection] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [students, setStudents] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [sections, setSections] = useState([]);
  const [pendingAssignments, setPendingAssignments] = useState([]);
  const [assignmentColors, setAssignmentColors] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isReloading, setIsReloading] = useState(false);
  const [isCreatingAssignment, setIsCreatingAssignment] = useState(false);

  // Load saved assignment colors from localStorage on component mount
  useEffect(() => {
    try {
      const LOCAL_STORAGE_KEY = 'assignment_colors';
      const savedColors = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (savedColors) {
        setAssignmentColors(JSON.parse(savedColors));
      }
    } catch (e) {
      console.error('Error loading saved colors:', e);
    }
  }, []);

  // Extract assignment identifier from title (like Q4, Q21, etc)
  const extractAssignmentId = (title) => {
    // Look for patterns like Q4, Q21, etc. at the beginning or anywhere in the title
    const match = title.match(/Q\d+/i);
    if (match) {
      return match[0].toUpperCase();
    }
    
    // If no Q pattern found, use the first word/token
    return title.split(/\s+/)[0];
  };

  // Get color for an assignment
  const getAssignmentColor = (assignmentId) => {
    const COLORS = [
      { badge: '#3B82F6' }, // Blue
      { badge: '#7C3AED' }, // Purple
      { badge: '#22C55E' }, // Green
      { badge: '#F97316' }, // Orange
      { badge: '#EF4444' }, // Red
      { badge: '#475569' }, // Slate
      { badge: '#D946EF' }, // Pink
      { badge: '#06B6D4' }, // Cyan
      { badge: '#CA8A04' }, // Yellow
      { badge: '#2563EB' }, // Indigo
      { badge: '#8B5CF6' }, // Violet
      { badge: '#EC4899' }, // Pink
      { badge: '#14B8A6' }, // Teal
      { badge: '#F59E0B' }, // Amber
      { badge: '#6366F1' }, // Indigo alt
    ];
    
    const LOCAL_STORAGE_KEY = 'assignment_colors';

    // If color already exists, use it
    if (assignmentColors[assignmentId]) {
      return assignmentColors[assignmentId];
    }

    // Find an unused color
    const usedColors = Object.values(assignmentColors);
    const availableColors = COLORS.filter(color => 
      !usedColors.some(used => used.badge === color.badge)
    );

    // If we have available colors, use one of them; otherwise use any color
    const colorPool = availableColors.length > 0 ? availableColors : COLORS;
    const randomColor = colorPool[Math.floor(Math.random() * colorPool.length)];

    // Store the new color
    const updatedColors = {
      ...assignmentColors,
      [assignmentId]: randomColor
    };
    
    setAssignmentColors(updatedColors);
    
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedColors));
    } catch (e) {
      console.error('Error saving colors to localStorage:', e);
    }

    return randomColor;
  };

  // Function to fetch pending assignments
  const fetchPendingAssignments = async (setLoadingState = true) => {
    try {
      if (setLoadingState) {
        setLoading(true);
      }
      
      // Fetch assignments
      const assignmentsResponse = await fetch(`${API_BASE}/assignments/`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });

      if (!assignmentsResponse.ok) {
        throw new Error('Failed to fetch assignments');
      }

      const assignmentsResult = await assignmentsResponse.json();
      
      // Fetch students
      const studentsResponse = await fetch(`${API_BASE}/users/students`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });

      if (!studentsResponse.ok) {
        throw new Error('Failed to fetch students');
      }

      const studentsResult = await studentsResponse.json();
      const students = studentsResult.users || [];
      
      // Process assignments and students
      const processedAssignments = [];
      
      // Student ID to MongoDB User ID mapping cache
      const userIdMappingCache = {};
      
      // Function to get MongoDB user ID from student ID
      const getMongoUserId = async (studentId) => {
        // Return from cache if available
        if (userIdMappingCache[studentId]) {
          return userIdMappingCache[studentId];
        }
        
        try {
          const userLookupResponse = await fetch(`${API_BASE}/users/student-lookup/${studentId}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
          });
          
          if (userLookupResponse.ok) {
            const userData = await userLookupResponse.json();
            userIdMappingCache[studentId] = userData.user_id;
            return userData.user_id;
          }
        } catch (error) {
          console.warn(`Could not map student ID ${studentId}: ${error.message}`);
        }
        
        userIdMappingCache[studentId] = studentId;
        return studentId;
      };
      
      // Map all student IDs to MongoDB user IDs
      await Promise.all(students.map(student => {
        const studentId = student.id;
        if (studentId && studentId !== 'N/A') {
          return getMongoUserId(studentId);
        }
        return Promise.resolve();
      }));
      
      // Process each assignment
      for (const assignment of assignmentsResult) {
        try {
          // Get all submissions for this assignment
          const submissionsMap = {};
          try {
            const submissionsUrl = `${API_BASE}/assignments/${assignment.id}/submissions`;
            const submissionsResponse = await fetch(submissionsUrl, {
              method: 'GET',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
            });
            
            if (submissionsResponse.ok) {
              const submissions = await submissionsResponse.json();
              submissions.forEach(sub => {
                submissionsMap[sub.user_id] = sub;
              });
            }
          } catch (subError) {
            console.warn(`Error fetching submissions for assignment ${assignment.id}: ${subError.message}`);
          }
          
          // Create student entries for each student
          const studentEntries = await Promise.all(students.map(async (student) => {
            const studentId = student.id;
            
            // Skip invalid student IDs
            if (!studentId || studentId === 'N/A') {
              return {
                studentId: studentId || 'N/A',
                studentName: student.name || "Unknown",
                section: student.section || "Unassigned",
                submissionTime: "-",
                status: "Not Submitted",
                score: `0/${assignment.points}`,
                submission: null
              };
            }
            
            // Get MongoDB user ID for this student
            const mongoUserId = userIdMappingCache[studentId] || studentId;
            
            // Check if we already have the submission
            const submission = submissionsMap[mongoUserId];
            
            // Default values for a student with no submission
            let status = "Not Submitted";
            let submissionTime = "-";
            let score = `0/${assignment.points}`;
            
            // Update values if there is a submission
            if (submission) {
              if (submission.status === "pending") {
                status = "Submitted";
              } else if (submission.status === "graded") {
                status = "Completed";
              } else if (submission.status === "late") {
                status = "Late Submitted";
              }
              
              if (submission.submitted_at) {
                submissionTime = new Date(submission.submitted_at).toLocaleString();
              }
              
              if (submission.score !== undefined) {
                score = `${submission.score}/${assignment.points}`;
              }
            }
            
            return {
              studentId: studentId,
              studentName: student.name || "Unknown",
              section: student.section || "Unassigned",
              submissionTime: submissionTime,
              status: status,
              score: score,
              submission: submission,
              assignmentId: assignment.id,
              assignmentTitle: assignment.title,
              dueDate: assignment.dueDate,
              points: assignment.points
            };
          }));
          
          const assignmentId = assignment.id;
          const badgeText = extractAssignmentId(assignment.title);
          
          // Filter out entries with duplicate student IDs
          const uniqueStudentEntries = studentEntries.reduce((unique, entry) => {
            if (!entry.studentId || entry.studentId === 'N/A') return unique;
            
            // Check if this student ID is already in the unique array
            const existingIndex = unique.findIndex(e => e.studentId === entry.studentId);
            if (existingIndex === -1) {
              // If not found, add to unique array
              unique.push(entry);
            }
            return unique;
          }, []);
          
          processedAssignments.push({
            ...assignment,
            badgeText: badgeText,
            color: getAssignmentColor(assignmentId),
            students: uniqueStudentEntries
          });
          
        } catch (assignmentError) {
          console.error(`Error processing assignment ${assignment.id}:`, assignmentError);
        }
      }
      
      // Extract all student assignments into a flat array for the table view
      const allPendingAssignments = [];
      processedAssignments.forEach(assignment => {
        assignment.students.forEach(student => {
          // Only add assignments that haven't been completed
          if (student.status !== "Completed") {
            allPendingAssignments.push({
              ...student,
              assignmentId: assignment.id,
              assignmentTitle: assignment.title,
              badgeText: assignment.badgeText,
              color: assignment.color,
              dueDate: assignment.dueDate,
              points: assignment.points || 10
            });
          }
        });
      });
      
      setPendingAssignments(allPendingAssignments);
      setError(null);
    } catch (err) {
      setError(err.message);
      setPendingAssignments([]);
    } finally {
      if (setLoadingState) {
        setLoading(false);
      }
    }
  };

  // Define fetchStudents first, before it's used
  const fetchStudents = async (setLoadingState = true) => {
    try {
      if (setLoadingState) {
        setLoading(true);
      }
      
      const response = await fetch(`${API_BASE}/users/students`, {
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          'X-User-Role': localStorage.getItem('userRole') || sessionStorage.getItem('userRole')
        }
      });
      
      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }
      
      const data = await response.json();
      if (data && data.users) {
        setStudents(data.users);
        setError(null);
      } else {
        throw new Error('Invalid data format received');
      }
    } catch (err) {
      setError('Failed to load students. Please try again later.');
      setStudents([]);
    } finally {
      if (setLoadingState) {
        setLoading(false);
      }
    }
  };

  // Function to fetch assignments data
  const fetchAssignments = async (setLoadingState = true) => {
    try {
      if (setLoadingState) {
        setLoading(true);
      }
      
      const response = await fetch(`${API_BASE}/assignments/`, {
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          'X-User-Role': localStorage.getItem('userRole') || sessionStorage.getItem('userRole')
        }
      });
      
      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }
      
      const data = await response.json();
      setAssignments(data);
      setError(null);
    } catch (err) {
      setError('Failed to load assignments. Please try again later.');
      setAssignments([]);
    } finally {
      if (setLoadingState) {
        setLoading(false);
      }
    }
  };

  // Function to fetch sections data
  const fetchSections = async (setLoadingState = true) => {
    try {
      if (setLoadingState) {
        setLoading(true);
      }
      
      const response = await fetch(`${API_BASE}/users/sections`, {
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          'X-User-Role': localStorage.getItem('userRole') || sessionStorage.getItem('userRole')
        }
      });
      
      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }
      
      const data = await response.json();
      setSections(data);
      setError(null);
    } catch (err) {
      setError('Failed to load sections. Please try again later.');
      setSections([]);
      console.error('Error fetching sections:', err);
    } finally {
      if (setLoadingState) {
        setLoading(false);
      }
    }
  };

  // Define handleReloadData next
  const handleReloadData = async () => {
    if (isReloading) return;
    
    setIsReloading(true);
    setLoading(true); // This will show the skeleton if not using isReloading flag
    
    try {
      if (activeView === 'students') {
        await fetchStudents(false); // Pass false to indicate this is a reload (don't set loading again)
      } else if (activeView === 'assignments') {
        await fetchAssignments(false);
      } else if (activeView === 'pending') {
        await fetchPendingAssignments(false);
      } else if (activeView === 'sections') {
        await fetchSections(false);
      }
    } catch (error) {
      setError('Failed to reload data. Please try again.');
    } finally {
      setIsReloading(false);
      setLoading(false);
    }
  };

  // Enhanced auth check that redirects unauthorized users to sign-in page
  useEffect(() => {
    const storedRole = localStorage.getItem('userRole') || sessionStorage.getItem('userRole');
    
    if (!authLoading) {
      if (authError || !storedRole) {
        // Redirect to sign-in if authentication error or no role stored
        router.push('/auth/signin');
      } else if (storedRole !== 'teacher') {
        // Redirect students to their dashboard
        router.push('/dashboard');
      }
    }
  }, [authLoading, authError, router]);

  useEffect(() => {
    const view = searchParams.get('view');
    if (view) {
      setActiveView(view);
    }
  }, [searchParams]);

  // Fetch data from the API based on active view
  useEffect(() => {
    if (activeView === 'students' && user && user.role === 'teacher') {
      fetchStudents();
    } else if (activeView === 'assignments') {
      fetchAssignments();
    } else if (activeView === 'pending') {
      fetchPendingAssignments();
    } else if (activeView === 'sections') {
      fetchSections();
    }
  }, [activeView]);


  // If we're loading auth or data, show skeleton
  if (authLoading || loading && !isReloading) {
    return <DashboardSkeleton />;
  }

  // If not authorized or not a teacher, this will be shown temporarily before redirect happens
  if (authError || (user && user.role !== 'teacher')) {
    return <DashboardSkeleton />;
  }

  // If no user data yet, show loading
  if (!user) {
    return <DashboardSkeleton />;
  }

  const handleStatClick = (statId) => {
    setActiveView(statId);
    setCurrentPage(1);
    setSortConfig({ key: null, direction: 'asc' });
    setSearchTerm('');
    setSelectedAssignment(null);
  };

  const handleSort = (key) => {
    setLoading(true);
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
    setTimeout(() => setLoading(false), 300);
  };

  const handleCreateAssignment = () => {
    setIsCreatingAssignment(true);
  };

  const handleAssignmentCreated = (newAssignment) => {
    setIsCreatingAssignment(false);
    handleReloadData();
  };

  const handleAssignmentSelect = (assignmentId, studentId) => {
    // Special case for refresh action
    if (assignmentId === 'refresh' && studentId === 'all') {
      handleReloadData();
      return;
    }
    
    setSelectedAssignment({ assignmentId, studentId });
  };

  const handleBackToList = () => {
    setSelectedAssignment(null);
  };

  const getViewData = () => {
    switch (activeView) {
      case 'students': return students;
      case 'assignments': return assignments;
      case 'pending': return pendingAssignments;
      case 'sections': return sections;
      default: return [];
    }
  };

  const getViewTitle = () => {
    switch (activeView) {
      case 'students': return 'Student Management';
      case 'assignments': return 'Assignment Management';
      case 'pending': return 'Pending Assignments';
      case 'sections': return 'Section Overview';
      default: return '';
    }
  };

  const getSortedAndFilteredData = () => {
    const data = getViewData();
    let filtered = data;

    if (searchTerm) {
      filtered = data.filter(item => {
        const searchableText = getSearchableText(item);
        return searchableText.toLowerCase().includes(searchTerm.toLowerCase());
      });
    }

    if (selectedSection !== 'all' && (activeView === 'students' || activeView === 'pending')) {
      filtered = filtered.filter(item => item.section === selectedSection);
    }

    if (sortConfig.key) {
      filtered.sort((a, b) => {
        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];
        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return filtered;
  };

  const getCurrentPageData = () => {
    const filteredData = getSortedAndFilteredData();
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredData.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  };

  const getSearchableText = (item) => {
    switch (activeView) {
      case 'students': return `${item.name} ${item.id}`;
      case 'assignments': return `${item.title} ${item.chapter}`;
      case 'pending': return `${item.studentName} ${item.assignmentTitle}`;
      case 'sections': return `Section ${item.id}`;
      default: return '';
    }
  };

  const renderActiveView = () => {
    const currentData = getCurrentPageData();

    switch (activeView) {
      case 'students':
        return (
          <StudentTable 
            data={currentData}
            sortConfig={sortConfig}
            onSort={handleSort}
            loading={loading}
          />
        );
      case 'assignments':
        return (
          <AssignmentTable 
            data={currentData}
            sortConfig={sortConfig}
            onSort={handleSort}
            loading={loading}
            showCreateButton={false}
          />
        );
      case 'pending':
        return (
          <PendingAssignments 
            data={currentData}
            loading={loading}
            onAssignmentSelect={handleAssignmentSelect}
          />
        );
      case 'sections':
        return (
          <SectionView 
            data={currentData}
            sortConfig={sortConfig}
            onSort={handleSort}
            loading={loading}
          />
        );
      default:
        return null;
    }
  };

  const renderContent = () => {
    if (isCreatingAssignment) {
      return (
        <CreateAssignment 
          onBack={() => setIsCreatingAssignment(false)}
          onSuccess={handleAssignmentCreated}
        />
      );
    }
    
    if (loading && !isCreatingAssignment && !isReloading) {
      return <DashboardSkeleton />;
    }

    if (selectedAssignment) {
      return (
        <StudentAssignment 
          studentId={selectedAssignment.studentId}
          assignmentId={selectedAssignment.assignmentId}
          onBack={handleBackToList}
          onSubmissionUpdate={handleReloadData}
        />
      );
    }

    return (
      <main className="main-content">
        <div className="table-container">
          <div className="table-header">
            <div className="header-content">
              <div>
                <h2 className="table-title">{getViewTitle()}</h2>
                <p className="table-subtitle">
                  {`View and manage ${activeView} information`}
                </p>
              </div>
              {activeView === 'assignments' && (
                <button className="create-assignment-btn" onClick={handleCreateAssignment}>
                  <span className="plus-icon">+</span>
                  Create Assignment
                </button>
              )}
            </div>
          </div>

          <TableControls 
            activeView={activeView}
            searchTerm={searchTerm}
            selectedSection={selectedSection}
            onSearchChange={setSearchTerm}
            onSectionChange={setSelectedSection}
          />
          
          {error && <div className="error-message">{error}</div>}
          {renderActiveView()}

          <Pagination 
            currentPage={currentPage}
            totalItems={getSortedAndFilteredData().length}
            itemsPerPage={ITEMS_PER_PAGE}
            onPageChange={setCurrentPage}
            onReload={handleReloadData}
            isReloading={isReloading}
          />
        </div>
      </main>
    );
  };

  return (
    <div className="dashboard-container">
      <Stats 
        stats={stats.map(stat => ({
          ...stat,
          highlighted: stat.id === activeView,
          count: stat.id === 'students' ? students.length :
                 stat.id === 'assignments' ? assignments.length :
                 stat.id === 'pending' ? pendingAssignments.length :
                 stat.id === 'sections' ? sections.length : 0
        }))} 
        onStatClick={handleStatClick} 
      />
      {renderContent()}
    </div>
  );
};

export default TeacherDashboard;
