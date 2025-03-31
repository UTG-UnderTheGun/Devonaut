import { NextResponse } from 'next/server';
import { jwtDecode } from 'jwt-decode';

export async function middleware(request) {
  const token = request.cookies.get('access_token');
  
  // If no token, redirect to login
  if (!token) {
    return NextResponse.redirect(new URL('/auth/signin', request.url));
  }

  try {
    // Decode the JWT token
    const decoded = jwtDecode(token.value);
    const userRole = decoded.role || 'student';

    // Check if trying to access teacher routes
    if (request.nextUrl.pathname.startsWith('/teacher') && userRole !== 'teacher') {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }

    return NextResponse.next();
  } catch (error) {
    // If token is invalid, redirect to login
    return NextResponse.redirect(new URL('/auth/signin', request.url));
  }
}

export const config = {
  matcher: [
    '/teacher/:path*',
    '/dashboard/:path*',
    '/coding/:path*'
  ]
}; 