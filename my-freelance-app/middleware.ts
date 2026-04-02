import { updateSession } from './lib/supabase/middleware'
import { NextRequest, NextResponse } from 'next/server'

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl

  // Always allow API routes, static files, and _next
  if (pathname.startsWith('/api') || pathname.startsWith('/_next') || pathname.startsWith('/static')) {
    return NextResponse.next()
  }

  // Let updateSession run to refresh cookies if needed
  const response = await updateSession(request)
  
  // Better session detection - check for multiple Supabase cookies
  const cookieHeader = request.headers.get('cookie') || ''
  const hasSession = cookieHeader.includes('sb-') || cookieHeader.includes('auth-token')

  // Protected routes that require authentication
  const protectedPrefixes = ['/admin', '/dashboard', '/orders', '/account']
  const isProtected = protectedPrefixes.some((p) => pathname.startsWith(p)) && !pathname.startsWith('/admin/login')

  // If protected route and no session, redirect to login (but not if already on login)
  if (isProtected && !hasSession && !pathname.startsWith('/login')) {
    const loginUrl = new URL('/login', request.url)
    const dest = `${pathname}${search || ''}`
    loginUrl.searchParams.set('next', dest)
    return NextResponse.redirect(loginUrl)
  }

  // Routes that authenticated users should NOT access (unauthenticated-only pages)
  // This is more restrictive now - allow public pages for everyone
  const marketingPages = ['/', '/about', '/contact', '/services', '/portfolio']
  
  // Public pages - allow access to everyone including authenticated users
  // (Authenticated users can still see marketing when they want)

  // Public pages - allow access
  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
