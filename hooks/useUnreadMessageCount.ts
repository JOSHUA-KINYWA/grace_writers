'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export function useUnreadMessageCount(role: 'admin' | 'client', pollMs = 15000) {
  const [count, setCount] = useState(0)
  const [pulse, setPulse] = useState(false)
  const supabase = useMemo(() => createClient(), [])
  const apiPath = role === 'admin' ? '/api/admin/unread-message-count' : '/api/unread-message-count'

  useEffect(() => {
    let active = true

    async function load() {
      try {
        const res = await fetch(apiPath, { cache: 'no-store' })
        if (!res.ok || !active) return
        const data = await res.json()
        const unreadByOrder = (data.unreadByOrder || {}) as Record<string, number>
        const total = Object.values(unreadByOrder).reduce((sum, n) => sum + Number(n || 0), 0)
        setCount((prev) => {
          if (total > prev) setPulse(true)
          if (total < prev) setPulse(false)
          return total
        })
      } catch {
        // ignore
      }
    }

    load()
    const interval = setInterval(load, pollMs)
    const onRead = () => {
      load()
      setTimeout(load, 400)
      setTimeout(load, 1200)
    }
    window.addEventListener('messagesRead', onRead)

    const channel = supabase
      .channel(`unread-count-${role}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'order_messages' },
        () => load()
      )
      .subscribe()

    return () => {
      active = false
      clearInterval(interval)
      window.removeEventListener('messagesRead', onRead)
      supabase.removeChannel(channel)
    }
  }, [apiPath, pollMs, role, supabase])

  useEffect(() => {
    if (!pulse) return
    const t = setTimeout(() => setPulse(false), 4000)
    return () => clearTimeout(t)
  }, [pulse, count])

  return { count, pulse }
}
