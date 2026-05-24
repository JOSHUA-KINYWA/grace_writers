'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getCachedAuthUser } from '@/lib/auth/client-session'

const HEARTBEAT_MS = 25 * 1000

/** Keeps the signed-in user marked online while the dashboard is open. */
export default function PresenceHeartbeat() {
  useEffect(() => {
    const supabase = createClient()
    let active = true
    let userId: string | null = null

    async function ping(isOnline = true) {
      if (!userId) return
      try {
        await fetch('/api/user-status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ is_online: isOnline }),
        })
      } catch {
        // ignore transient network errors
      }
    }

    async function init() {
      const user = await getCachedAuthUser(supabase)
      if (!active || !user) return
      userId = user.id
      if (user.user_metadata?.role !== 'admin') {
        fetch('/api/client/link-auth', { method: 'POST' }).catch(() => {})
      }
      await ping(true)
    }

    void init()

    const interval = setInterval(() => {
      void ping(true)
    }, HEARTBEAT_MS)

    const onVisible = () => {
      if (document.visibilityState === 'visible') void ping(true)
    }

    const onUnload = () => {
      if (!userId) return
      const body = JSON.stringify({ is_online: false })
      navigator.sendBeacon?.('/api/user-status', new Blob([body], { type: 'application/json' }))
    }

    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('beforeunload', onUnload)

    return () => {
      active = false
      clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('beforeunload', onUnload)
    }
  }, [])

  return null
}
