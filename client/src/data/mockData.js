
export const students = [
    { 
      id: '6510741111', 
      name: 'Thanakit Devonaut', 
      section: '760001', 
      score: 10,
      email: 'thanakit.d@university.edu',
      lastSubmission: '2024-02-04'
    },
    { 
      id: '6510741112', 
      name: 'Wuttiphat Devonaut', 
      section: '760001', 
      score: 9,
      email: 'wuttiphat.d@university.edu',
      lastSubmission: '2024-02-03'
    },
    { 
      id: '6510741113', 
      name: 'Nattakit Devonaut', 
      section: '760002', 
      score: 8,
      email: 'nattakit.d@university.edu',
      lastSubmission: '2024-02-02'
    },
    { 
      id: '6510741114', 
      name: 'Kittphon Devonaut', 
      section: '760002', 
      score: 7,
      email: 'kittphon.d@university.edu',
      lastSubmission: '2024-02-01'
    }
  ];
  
  export const assignments = [
    { 
      id: 1,
      title: 'For Loop Assignment',
      chapter: 'Chapter 6 For Loop',
      dueDate: '14/02/2025 23:59',
      pending: 12,
      points: 10,
      description: 'Practice using for loops in Python',
      type: 'Programming',
      submissionType: 'File Upload'
    },
    { 
      id: 2,
      title: 'While Loop Assignment',
      chapter: 'Chapter 7 While Loop',
      dueDate: '14/02/2025 23:59',
      pending: 12,
      points: 10,
      description: 'Practice using while loops in Python',
      type: 'Programming',
      submissionType: 'File Upload'
    },
    { 
      id: 3,
      title: 'For Loop Assignment',
      chapter: 'Chapter 6 For Loop',
      dueDate: '23:59',
      pending: 12,
      points: 10,
      description: 'Advanced for loop concepts',
      type: 'Programming',
      submissionType: 'File Upload'
    },
    { 
      id: 4,
      title: 'While Loop Assignment',
      chapter: 'Chapter 7 While Loop',
      dueDate: '23:59',
      pending: 12,
      points: 10,
      description: 'Advanced while loop concepts',
      type: 'Programming',
      submissionType: 'File Upload'
    }
  ];
  
  export const sections = [
    {
      id: '760001',
      name: 'Section 760001',
      schedule: 'Monday, Wednesday 9:00-10:30',
      totalStudents: 30
    },
    {
      id: '760002',
      name: 'Section 760002',
      schedule: 'Tuesday, Thursday 13:00-14:30',
      totalStudents: 30
    }
  ];
  
  export const stats = [
    { 
      id: 'students',
      title: 'TOTAL STUDENT', 
      value: '60'
    },
    { 
      id: 'assignments',
      title: 'ASSIGNMENT', 
      value: '14'
    },
    { 
      id: 'pending',
      title: 'PENDING ASSIGNMENT', 
      value: '42'
    },
    { 
      id: 'sections',
      title: 'TOTAL SECTION', 
      value: '2'
    }
  ];
  
  // Helper function to get formatted date
  export const getCurrentDate = () => {
    const options = { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    };
    return new Date().toLocaleDateString('en-US', options);
  };
  
  // Helper function to format dates consistently
  export const formatDate = (date) => {
    if (!date) return '';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  // Constants
  export const ITEMS_PER_PAGE = 10;
  
  export const SECTION_OPTIONS = [
    { value: 'all', label: 'All Sections' },
    { value: '760001', label: 'Section 760001' },
    { value: '760002', label: 'Section 760002' }
  ];


  export const pendingAssignments = [
    {
      id: 1,
      studentName: 'Thanakit Devonaut',
      section: '760001',
      assignmentTitle: 'For Loop Assignment',
      chapter: 'Chapter 6 For Loop',
      dueDate: '2024-02-14T23:59:00',
      timeLeft: '2 days left',
      timeLeftStatus: 'warning',
      status: 'Not Started'
    },
    {
      id: 2,
      studentName: 'Wuttiphat Devonaut',
      section: '760001',
      assignmentTitle: 'While Loop Assignment',
      chapter: 'Chapter 7 While Loop',
      dueDate: '2024-02-14T23:59:00',
      timeLeft: '5 hours left',
      timeLeftStatus: 'urgent',
      status: 'In Progress'
    },
    {
      id: 3,
      studentName: 'Nattakit Devonaut',
      section: '760002',
      assignmentTitle: 'For Loop Assignment',
      chapter: 'Chapter 6 For Loop',
      dueDate: '2024-02-15T23:59:00',
      timeLeft: '3 days left',
      timeLeftStatus: 'normal',
      status: 'In Progress'
    },
    {
      id: 4,
      studentName: 'Kittphon Devonaut',
      section: '760002',
      assignmentTitle: 'While Loop Assignment',
      chapter: 'Chapter 7 While Loop',
      dueDate: '2024-02-13T23:59:00',
      timeLeft: 'Overdue',
      timeLeftStatus: 'urgent',
      status: 'Overdue'
    }
  ];
  
  export const sectionDetails = [
    {
      id: '760001',
      totalStudents: 30,
      schedule: 'Monday, Wednesday 9:00-10:30',
      completionRate: 75,
      assignmentsCompleted: 10,
      assignmentsPending: 4,
      averageScore: 8.5,
      topPerformers: 5,
      needsAttention: 3,
      lastActivity: '2024-02-05T10:30:00',
      upcomingDeadlines: 2,
      assignments: {
        total: 14,
        completed: 10,
        inProgress: 2,
        notStarted: 2
      }
    },
    {
      id: '760002',
      totalStudents: 30,
      schedule: 'Tuesday, Thursday 13:00-14:30',
      completionRate: 68,
      assignmentsCompleted: 8,
      assignmentsPending: 6,
      averageScore: 7.8,
      topPerformers: 4,
      needsAttention: 5,
      lastActivity: '2024-02-05T14:30:00',
      upcomingDeadlines: 3,
      assignments: {
        total: 14,
        completed: 8,
        inProgress: 4,
        notStarted: 2
      }
    }
  ];

  export const assignmentSubmissions = [
    {
      studentId: '6510741111',
      studentName: 'Wuttiphut Devonaut',
      submissionTime: '2024-02-04 21:34',
      status: 'Submitted',
      score: 0,
      assignmentTitle: 'For Loop Assignment'
    },
    {
      studentId: '6510741111',
      studentName: 'Thanagith Devonaut',
      submissionTime: '2024-02-02 21:34',
      status: 'Submitted',
      score: 0,
      assignmentTitle: 'For Loop Assignment'
    },
    {
      studentId: '6510741111',
      studentName: 'Nattakit Devonaut',
      submissionTime: '2024-02-05 06:24',
      status: 'Late Submitted',
      score: 0,
      assignmentTitle: 'For Loop Assignment'
    },
    {
      studentId: '6510741111',
      studentName: 'Kittpon Devonaut',
      submissionTime: null,
      status: 'Not Submitted',
      score: 0,
      assignmentTitle: 'For Loop Assignment'
    },
    {
      studentId: '6510741111',
      studentName: 'Lux taheyoung',
      submissionTime: '2024-02-01 15:30',
      status: 'Completed',
      score: 10,
      assignmentTitle: 'For Loop Assignment'
    }
  ];