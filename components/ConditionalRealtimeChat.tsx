'use client'

import { useEffect, useMemo, useState } from 'react'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import RealtimeChat from '@/components/RealtimeChat'

export default function ConditionalRealtimeChat() {
  const pathname = usePathname()
  const supabase = useMemo(() => createClient(), [])
  const [isAdminUser, setIsAdminUser] = useState(false)
  const [authState, setAuthState] = useState<'pending' | 'authenticated' | 'unauthenticated'>('pending')

  useEffect(() => {
    let active = true
    supabase
      .auth
      .getUser()
      .then(({ data }) => {
        if (!active) return
        const user = data?.user
        if (!user) {
          setAuthState('unauthenticated')
          return
        }
        const role = user.app_metadata?.role
        setIsAdminUser(role === 'admin')
        setAuthState('authenticated')
      })
      .catch(() => {
        if (active) setAuthState('unauthenticated')
      })

    return () => {
      active = false
    }
  }, [supabase])

  const isAdminPath = pathname?.startsWith('/admin')
  const isAuthPath =
    pathname === '/login' ||
    pathname === '/signup' ||
    pathname === '/admin/login'

  if (authState !== 'authenticated' || isAdminPath || isAuthPath || isAdminUser) {
    return null
  }

  return <RealtimeChat />
}

