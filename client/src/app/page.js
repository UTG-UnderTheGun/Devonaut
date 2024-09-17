import { redirect } from 'next/navigation';

export default async function HomePage() {
  const isAuthenticated = false;

  if (!isAuthenticated) {
    redirect('/auth/login');
  }

  return (
    <div>
      <h1>Welcome to the Home Page!</h1>
    </div>
  );
}
