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
    getCachedAuthUser(supabase).then((user) => {
      if (user && user.user_metadata?.role !== 'admin') {
        setEnabled(true)
        fetch('/api/client/link-auth', { method: 'POST' }).catch(() => {})
      }
    })
  }, [])

  if (!enabled) return null
  return <PresenceHeartbeat />
}
