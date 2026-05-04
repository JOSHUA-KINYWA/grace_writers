'use client'

import { useEffect, useMemo, useState } from 'react'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import RealtimeChat from '@/components/RealtimeChat'

export default function ConditionalRealtimeChat() {
  const pathname = usePathname()
  const supabase = useMemo(() => createClient(), [])
  const [isAdminUser, setIsAdminUser] = useState(false)

  useEffect(() => {
    let active = true
    supabase.auth.getUser().then(({ data }) => {
      if (!active) return
      const role = data?.user?.user_metadata?.role
      setIsAdminUser(role === 'admin')
    }).catch(() => {})
    return () => {
      active = false
    }
  }, [supabase])

  const isAdminPath = pathname?.startsWith('/admin')
  const isAuthPath =
    pathname === '/login' ||
    pathname === '/signup' ||
    pathname === '/admin/login'

  if (isAdminPath || isAuthPath || isAdminUser) {
    return null
  }

  return <RealtimeChat roomName="support-chat" />
}

