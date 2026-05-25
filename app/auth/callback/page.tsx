'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

function AuthCallbackHandler() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    async function finish() {
      const next = searchParams.get('next') || '/dashboard'
      const flow = searchParams.get('flow')
      const safeNext = next.startsWith('/') && !next.startsWith('//') ? next : '/dashboard'

      try {
        const code = searchParams.get('code')
        if (code) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
          if (exchangeError) throw exchangeError
          if (!active) return
          router.replace(flow === 'recovery' ? '/account/change-password' : safeNext)
          return
        }

        const tokenHash = searchParams.get('token_hash')
        const type = searchParams.get('type') as
          | 'signup'
          | 'recovery'
          | 'invite'
          | 'email'
          | 'email_change'
          | null

        if (tokenHash && type) {
          const { error: verifyError } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type,
          })
          if (verifyError) throw verifyError
          if (!active) return
          if (type === 'recovery') {
            router.replace('/account/change-password')
          } else {
            router.replace(safeNext)
          }
          return
        }

        if (typeof window !== 'undefined' && window.location.hash.includes('access_token')) {
          const { data, error: sessionError } = await supabase.auth.getSession()
          if (sessionError) throw sessionError
          if (data.session) {
            router.replace(flow === 'recovery' ? '/account/change-password' : safeNext)
            return
          }
        }

        setError(
          'This link is invalid or has expired. Request a new reset email or sign in again.'
        )
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Authentication failed'
        setError(message)
      }
    }

    finish()
    return () => {
      active = false
    }
  }, [router, searchParams, supabase])

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
          <h1 className="text-xl font-bold text-slate-900 mb-2">Link could not be opened</h1>
          <p className="text-sm text-red-600 mb-6">{error}</p>
          <div className="flex flex-col gap-2">
            <Link
              href="/forgot-password"
              className="bg-purple-600 text-white py-3 rounded-lg font-semibold hover:bg-purple-700"
            >
              Request new reset link
            </Link>
            <Link href="/login" className="text-purple-600 font-medium hover:underline">
              Back to login
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <p className="text-slate-600">Signing you in…</p>
    </div>
  )
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
          <p className="text-slate-600">Loading…</p>
        </div>
      }
    >
      <AuthCallbackHandler />
    </Suspense>
  )
}
