'use client'

import { useEffect, useState } from 'react'

export function useClientsOnline(pollMs = 4000) {
  const [onlineByClientId, setOnlineByClientId] = useState<Record<string, boolean>>({})

  useEffect(() => {
    let active = true

    async function load() {
      try {
        const res = await fetch('/api/admin/clients-online', { cache: 'no-store' })
        if (!res.ok) return
        const data = await res.json()
        if (active) setOnlineByClientId(data.onlineByClientId || {})
      } catch {
        // ignore polling errors
      }
    }

    load()
    const interval = setInterval(load, pollMs)
    return () => {
      active = false
      clearInterval(interval)
    }
  }, [pollMs])

  return onlineByClientId
}
