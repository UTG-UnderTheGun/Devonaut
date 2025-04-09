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
import { 
  assignments, 
  pendingAssignments, 
  sectionDetails,
  stats, 
  ITEMS_PER_PAGE 
} from '@/data/mockData.js';  // Removed students from import
import DashboardSkeleton from './dashboard-skeleton';
import './dashboard.css';
import './dashboard-skeleton.css';
import useAuth from '@/hook/useAuth';
import CreateAssignment from '@/components/assignment/create-assignment';

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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isReloading, setIsReloading] = useState(false);
  const [isCreatingAssignment, setIsCreatingAssignment] = useState(false);

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

  // Define handleReloadData next
  const handleReloadData = async () => {
    if (isReloading) return;
    
    setIsReloading(true);
    setLoading(true); // This will show the skeleton if not using isReloading flag
    
    try {
      if (activeView === 'students') {
        await fetchStudents(false); // Pass false to indicate this is a reload (don't set loading again)
      } else if (activeView === 'assignments') {
        // Handle assignment reload
        console.log('Reloading assignments...');
        // Simulate loading
        await new Promise(resolve => setTimeout(resolve, 800));
      } else if (activeView === 'pending') {
        // Handle pending reload
        console.log('Reloading pending assignments...');
        // Simulate loading
        await new Promise(resolve => setTimeout(resolve, 800));
      } else if (activeView === 'sections') {
        // Handle sections reload
        console.log('Reloading sections...');
        // Simulate loading
        await new Promise(resolve => setTimeout(resolve, 800));
      }
    } catch (error) {
      setError('Failed to reload data. Please try again.');
    } finally {
      setIsReloading(false);
      setLoading(false);
    }
  };

  useEffect(() => {
    const storedRole = localStorage.getItem('userRole') || sessionStorage.getItem('userRole');
    
    if (!authLoading && (!storedRole || storedRole !== 'teacher')) {
      router.push('/dashboard');
    }
  }, [authLoading, router]);

  useEffect(() => {
    const view = searchParams.get('view');
    if (view) {
      setActiveView(view);
    }
  }, [searchParams]);

  // Fetch students from the API
  useEffect(() => {
    if (activeView === 'students') {
      fetchStudents();
    }
    // Add other view data fetching here
  }, [activeView]);

  // If we're loading auth or data, show skeleton
  if (authLoading || loading && !isReloading) {
    return <DashboardSkeleton />;
  }

  if (authError) {
    return <div>Access denied: {authError}</div>;
  }

  if (!user) {
    return <div>Please log in</div>;
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
      case 'sections': return sectionDetails;
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
            sortConfig={sortConfig}
            onSort={handleSort}
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
          highlighted: stat.id === activeView
        }))} 
        onStatClick={handleStatClick} 
      />
      {renderContent()}
    </div>
  );
};

export default TeacherDashboard;
