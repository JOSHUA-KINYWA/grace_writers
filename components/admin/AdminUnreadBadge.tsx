'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { FaEnvelope } from 'react-icons/fa'

export default function AdminUnreadBadge() {
  const [count, setCount] = useState(0)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/admin/unread-message-count', { cache: 'no-store' })
        if (!res.ok) return
        const data = await res.json()
        const total = Object.values((data.unreadByOrder || {}) as Record<string, number>).reduce(
          (sum, n) => sum + Number(n || 0),
          0
        )
        setCount(total)
      } catch {
        // ignore
      }
    }

    load()
    const interval = setInterval(load, 15000)
    const onRead = () => load()
    window.addEventListener('messagesRead', onRead)

    return () => {
      clearInterval(interval)
      window.removeEventListener('messagesRead', onRead)
    }
  }, [])

  return (
    <Link
      href="/admin/messages"
      className="relative inline-flex items-center gap-2 text-sm text-slate-600 bg-slate-100 hover:bg-slate-200 px-3 py-2 rounded-lg transition"
    >
      <FaEnvelope />
      <span className="hidden sm:inline">Messages</span>
      {count > 0 && (
        <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-600 text-white text-[10px] font-bold flex items-center justify-center">
          {count > 99 ? '99+' : count}
        </span>
      )}
    </Link>
  )
}
