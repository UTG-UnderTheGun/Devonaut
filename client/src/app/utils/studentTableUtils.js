// pages/students.js
"use client";

import { useState, useEffect } from 'react';
import StudentTable from '@/components/StudentTable/StudentTable';

const StudentsPage = () => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortConfig, setSortConfig] = useState({
    key: 'id',
    direction: 'asc'
  });

  // Simulated API call - replace with your actual API endpoint
  const fetchStudents = async () => {
    try {
      setLoading(true);
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Replace this with your actual API call
      const response = await fetch('/api/students');
      if (!response.ok) throw new Error('Failed to fetch students');
      
      const data = await response.json();
      setStudents(data);
      setError(null);
    } catch (err) {
      setError(err.message);
      setStudents([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  const handleSort = (key) => {
    setSortConfig(prevConfig => ({
      key,
      direction: prevConfig.key === key && prevConfig.direction === 'asc' 
        ? 'desc' 
        : 'asc'
    }));
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Student Records</h1>
      
      <StudentTable
        data={students}
        sortConfig={sortConfig}
        onSort={handleSort}
        loading={loading}
        error={error}
      />
    </div>
  );
};

export default StudentsPage;