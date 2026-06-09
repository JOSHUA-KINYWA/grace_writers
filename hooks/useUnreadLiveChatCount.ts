'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export function useUnreadLiveChatCount(role: 'admin' | 'client', pollMs = 15000) {
  const [count, setCount] = useState(0)
  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    if (role !== 'admin') return

    let active = true

    async function load() {
      try {
        const res = await fetch('/api/admin/live-chat-unread', { cache: 'no-store' })
        if (!res.ok || !active) return
        const data = await res.json()
        setCount(Number(data.total || 0))
      } catch {
        // ignore
      }
    }

    load()
    const interval = setInterval(load, pollMs)
    const channel = supabase
      .channel('admin-live-chat-unread')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => load())
      .subscribe()

    return () => {
      active = false
      clearInterval(interval)
      supabase.removeChannel(channel)
    }
  }, [pollMs, role, supabase])

  return count
}
