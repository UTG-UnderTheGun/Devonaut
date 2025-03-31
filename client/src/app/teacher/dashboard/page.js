'use client'
import { useState,useEffect } from 'react';
import Stats from '@/components/stats/stats.js';
import StudentTable from '@/components/tables/student-table.js';
import AssignmentTable from '@/components/tables/assignment-table.js';
import TableControls from '@/components/controls/table-control.js';
import Pagination from '@/components/controls/pagination.js';
import PendingAssignments from '@/components/tables/pendingassignment.js';
import SectionView from '@/components/sections/section.js';
import StudentAssignment from '@/components/assignment/student-assignment';
import { useSearchParams } from 'next/navigation';
import { 
  students, 
  assignments, 
  pendingAssignments, 
  sectionDetails,
  stats, 
  ITEMS_PER_PAGE 
} from '@/data/mockData.js';
import './dashboard.css';
import useAuth from '@/hook/useAuth';


const TeacherDashboard = () => {
  useAuth(['teacher']);
  const searchParams = useSearchParams();
  const [activeView, setActiveView] = useState(searchParams.get('view') || 'students');
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSection, setSelectedSection] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState(null);

  useEffect(() => {
    const view = searchParams.get('view');
    if (view) {
      setActiveView(view);
    }
  }, [searchParams]);

  const handleStatClick = (statId) => {
    setActiveView(statId);
    setCurrentPage(1);
    setSortConfig({ key: null, direction: 'asc' });
    setSearchTerm('');
    setSelectedAssignment(null);
  };

  const handleSort = (key) => {
    setIsLoading(true);
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
    setTimeout(() => setIsLoading(false), 300);
  };

  const handleCreateAssignment = () => {
    console.log('Create new assignment');
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
            loading={isLoading}
          />
        );
      case 'assignments':
        return (
          <AssignmentTable 
            data={currentData}
            sortConfig={sortConfig}
            onSort={handleSort}
            loading={isLoading}
          />
        );
      case 'pending':
        return (
          <PendingAssignments 
            data={currentData}
            sortConfig={sortConfig}
            onSort={handleSort}
            loading={isLoading}
            onAssignmentSelect={handleAssignmentSelect}
          />
        );
      case 'sections':
        return (
          <SectionView 
            data={currentData}
            sortConfig={sortConfig}
            onSort={handleSort}
            loading={isLoading}
          />
        );
      default:
        return null;
    }
  };

  const renderContent = () => {
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
          
          {renderActiveView()}

          <Pagination 
            currentPage={currentPage}
            totalItems={getSortedAndFilteredData().length}
            itemsPerPage={ITEMS_PER_PAGE}
            onPageChange={setCurrentPage}
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