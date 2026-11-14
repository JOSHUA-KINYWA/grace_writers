'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getCachedAuthUser } from '@/lib/auth/client-session'
import PresenceHeartbeat from '@/components/PresenceHeartbeat'

/** Presence ping for logged-in clients (not admins) across the whole app. */
export default function ClientPresenceHeartbeat() {
  const [enabled, setEnabled] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    let active = true
    const enableForUser = (user: { app_metadata?: Record<string, unknown> } | null) => {
      const shouldEnable = Boolean(user && user.app_metadata?.role !== 'admin')
      setEnabled(shouldEnable)
      if (shouldEnable) fetch('/api/client/link-auth', { method: 'POST' }).catch(() => {})
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      queueMicrotask(() => {
        if (active) enableForUser(session?.user || null)
      })
    })
    void getCachedAuthUser(supabase).then((user) => {
      if (active) enableForUser(user)
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [])

  if (!enabled) return null
  return <PresenceHeartbeat />
}
