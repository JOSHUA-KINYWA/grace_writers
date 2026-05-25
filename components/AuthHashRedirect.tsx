'use client'

import { useEffect } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

/**
 * Handles Supabase auth redirects:
 * - #access_token on any path → /auth/callback
 * - localhost with tokens → production NEXT_PUBLIC_APP_URL (fixes old emails)
 */
export default function AuthHashRedirect() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const router = useRouter()

  useEffect(() => {
    if (typeof window === 'undefined') return

    const hash = window.location.hash
    const hasAuthHash =
      hash.includes('access_token') ||
      hash.includes('token_hash') ||
      searchParams.has('code') ||
      searchParams.has('token_hash')

    if (!hasAuthHash) return
    if (pathname.startsWith('/auth/callback')) return

    const prod = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '')
    const isLocalhost =
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1'

    const next = searchParams.get('next') || '/dashboard'
    const flow = searchParams.get('flow')
    const query = new URLSearchParams()
    query.set('next', next)
    if (flow) query.set('flow', flow)
    searchParams.forEach((v, k) => {
      if (k !== 'next' && k !== 'flow') query.set(k, v)
    })

    const callbackPath = `/auth/callback?${query.toString()}${hash}`

    if (isLocalhost && prod && !prod.includes('localhost')) {
      window.location.replace(`${prod}${callbackPath}`)
      return
    }

    router.replace(callbackPath)
  }, [pathname, router, searchParams])

  return null
}
