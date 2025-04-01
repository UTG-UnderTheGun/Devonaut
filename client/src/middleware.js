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
    
    // Log the decoded token to verify the role (you can remove this in production)
    console.log('Decoded token:', decoded);
    
    // Access role directly from decoded token
    const userRole = decoded.role;

    // Check if trying to access teacher routes
    if (request.nextUrl.pathname.startsWith('/teacher')) {
      if (userRole !== 'teacher') {
        console.log('Access denied: User role is', userRole); // For debugging
        return NextResponse.redirect(new URL('/dashboard', request.url));
      }
    }

    return NextResponse.next();
  } catch (error) {
    console.error('Token validation error:', error); // For debugging
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