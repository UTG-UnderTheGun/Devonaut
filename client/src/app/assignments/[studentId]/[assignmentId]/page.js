// app/assignments/[studentId]/[assignmentId]/page.js
'use client';
import { useParams } from 'next/navigation';
import StudentAssignment from '@/components/assignment/student-assignment';

export default function AssignmentPage() {
  const params = useParams();
  
  return (
    <StudentAssignment 
      studentId={params.studentId}
      assignmentId={params.assignmentId}
    />
  );
}