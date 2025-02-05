// page.js
'use client'

import React, { useState } from 'react';
import Stats from '@/components/stats.js';
import StudentTable from '@/components/student-table.js';
import AssignmentTable from '@/components/assignment-table.js';
import TableControls from '@/components/table-control.js';
import Pagination from '@/components/pagination.js';
import { 
  students, 
  assignments, 
  pendingAssignments, 
  sectionDetails,
  stats, 
  ITEMS_PER_PAGE 
} from '@/data/mockData';
import PendingAssignments from '@/components/pendingassignment.js';
import SectionView from '@/components/section.js';


import './dashboard.css';


const TeacherDashboard = () => {
  const [activeView, setActiveView] = useState('students');
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSection, setSelectedSection] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  const handleStatClick = (statId) => {
    setActiveView(statId);
    setCurrentPage(1);
    setSortConfig({ key: null, direction: 'asc' });
    setSearchTerm('');
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

  const getViewData = () => {
    switch (activeView) {
      case 'students':
        return students;
      case 'assignments':
        return assignments;
      case 'pending':
        return pendingAssignments;
      case 'sections':
        return sectionDetails;
      default:
        return [];
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

  const getSortedAndFilteredData = () => {
    const data = getViewData();
    let filtered = data;

    // Apply search filter
    if (searchTerm) {
      filtered = data.filter(item => {
        const searchableText = getSearchableText(item);
        return searchableText.toLowerCase().includes(searchTerm.toLowerCase());
      });
    }

    // Apply section filter if applicable
    if (selectedSection !== 'all' && (activeView === 'students' || activeView === 'pending')) {
      filtered = filtered.filter(item => item.section === selectedSection);
    }

    // Apply sorting
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

  const getSearchableText = (item) => {
    switch (activeView) {
      case 'students':
        return `${item.name} ${item.id}`;
      case 'assignments':
        return `${item.title} ${item.chapter}`;
      case 'pending':
        return `${item.studentName} ${item.assignmentTitle}`;
      case 'sections':
        return `Section ${item.id}`;
      default:
        return '';
    }
  };

  const getCurrentPageData = () => {
    const filteredData = getSortedAndFilteredData();
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredData.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  };

  const getViewTitle = () => {
    switch (activeView) {
      case 'students':
        return 'Student Management';
      case 'assignments':
        return 'Assignment Management';
      case 'pending':
        return 'Pending Assignments';
      case 'sections':
        return 'Section Overview';
      default:
        return '';
    }
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

      <main className="main-content">
        <div className="table-container">
          <div className="table-header">
            <h2 className="table-title">{getViewTitle()}</h2>
            <p className="table-subtitle">
              {`View and manage ${activeView} information`}
            </p>
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
    </div>
  );
};

export default TeacherDashboard;