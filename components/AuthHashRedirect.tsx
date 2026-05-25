'use client'

import { useEffect } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

/**
 * Supabase email links often redirect to Site URL root with #access_token=...
 * Forward those to /auth/callback so the session is established.
 */
export default function AuthHashRedirect() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const router = useRouter()

  useEffect(() => {
    if (typeof window === 'undefined') return
    const hash = window.location.hash
    if (!hash || !hash.includes('access_token')) return
    if (pathname.startsWith('/auth/callback')) return

    const next = searchParams.get('next') || '/dashboard'
    const flow = searchParams.get('flow')
    let target = `/auth/callback?next=${encodeURIComponent(next)}${hash}`
    if (flow) target = `/auth/callback?next=${encodeURIComponent(next)}&flow=${encodeURIComponent(flow)}${hash}`
    router.replace(target)
  }, [pathname, router, searchParams])

  return null
}
