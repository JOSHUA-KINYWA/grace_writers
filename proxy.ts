import { updateSession } from './lib/supabase/middleware'
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { Database } from './lib/types/database'

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl

  // Always allow API routes, static files, and _next
  if (pathname.startsWith('/api') || pathname.startsWith('/_next') || pathname.startsWith('/static')) {
    return NextResponse.next()
  }

  // Let updateSession run to refresh cookies if needed
  const response = await updateSession(request)

  // Better session detection - check for a valid Supabase user server-side
  const cookieHeader = request.headers.get('cookie') || ''

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

  let hasSession = false
  if (supabaseUrl && supabaseAnonKey && (cookieHeader.includes('sb-') || cookieHeader.includes('auth-token'))) {
    try {
      const supabase = createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll() {
            // noop in proxy
            return
          },
        },
      })

      const { data: { user } } = await supabase.auth.getUser()
      hasSession = !!user
    } catch (err) {
      hasSession = false
    }
  }

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

  // Pages intended ONLY for visitors who are NOT logged in.
  // If a user has a session, keep them in the app experience.
  const unauthOnlyPages = ['/', '/login', '/signup']
  const isUnauthOnly = unauthOnlyPages.includes(pathname)

  if (hasSession && isUnauthOnly) {
    const dashboardUrl = new URL('/dashboard', request.url)
    return NextResponse.redirect(dashboardUrl)
  }

  // Public pages - allow access
  return response
}

