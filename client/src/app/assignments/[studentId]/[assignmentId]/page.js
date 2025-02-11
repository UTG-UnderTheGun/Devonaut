// app/assignments/[studentId]/[assignmentId]/page.js
'use client';
import { useRouter } from 'next/navigation';
import StudentAssignment from '@/components/assignment/student-assignment';

export default function AssignmentPage() {
  const router = useRouter();

  const handleBack = () => {
    router.push('/teacher/dashboard');
  };

  return (
    <StudentAssignment 
      onBack={handleBack}
    />
  );
}