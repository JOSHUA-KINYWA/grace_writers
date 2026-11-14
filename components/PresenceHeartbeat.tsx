'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

const HEARTBEAT_MS = 25 * 1000

/** Keeps the signed-in user marked online while the dashboard is open. */
export default function PresenceHeartbeat() {
  useEffect(() => {
    const supabase = createClient()
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

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      queueMicrotask(() => {
        if (event === 'SIGNED_OUT') {
          void ping(false)
          userId = null
          return
        }
        if (!session?.user) return
        userId = session.user.id
        if (session.user.app_metadata?.role !== 'admin') {
          fetch('/api/client/link-auth', { method: 'POST' }).catch(() => {})
        }
        void ping(true)
      })
    })

    void supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        userId = user.id
        if (user.app_metadata?.role !== 'admin') {
          fetch('/api/client/link-auth', { method: 'POST' }).catch(() => {})
        }
        void ping(true)
      }
    })

    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') void ping(true)
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
      clearInterval(interval)
      subscription.unsubscribe()
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('beforeunload', onUnload)
    }
  }, [])

  return null
}
