'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import AdminMessageThreadList, { type AdminMessageThread } from '@/components/admin/AdminMessageThreadList'

interface AdminMessagesLiveThreadsProps {
  initialThreads: AdminMessageThread[]
  selectedOrderId?: string | null
}

export default function AdminMessagesLiveThreads({
  initialThreads,
  selectedOrderId,
}: AdminMessagesLiveThreadsProps) {
  const [threads, setThreads] = useState(initialThreads)
  const searchParams = useSearchParams()

  useEffect(() => {
    setThreads(initialThreads)
  }, [initialThreads])

  useEffect(() => {
    async function refresh() {
      try {
        const params = new URLSearchParams(searchParams?.toString() || '')
        const res = await fetch(`/api/admin/message-threads?${params.toString()}`, {
          cache: 'no-store',
        })
        if (!res.ok) return
        const data = await res.json()
        if (Array.isArray(data.threads)) {
          setThreads(data.threads)
        }
      } catch {
        // ignore
      }
    }

    refresh()
    const interval = setInterval(refresh, 5000)
    const onMessagesRead = () => refresh()
    window.addEventListener('messagesRead', onMessagesRead)

    return () => {
      clearInterval(interval)
      window.removeEventListener('messagesRead', onMessagesRead)
    }
  }, [searchParams])

  if (threads.length === 0) {
    return <div className="p-6 text-sm text-gray-500 text-center">No order messages yet.</div>
  }

  return (
    <AdminMessageThreadList
      threads={threads}
      selectedOrderId={selectedOrderId}
    />
  )
}
