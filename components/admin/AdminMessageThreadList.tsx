'use client'

import Link from 'next/link'
import OnlineStatusBadge from '@/components/admin/OnlineStatusBadge'
import { useClientsOnline } from '@/components/admin/useClientsOnline'

export interface AdminMessageThread {
  orderId: string
  href: string
  clientId?: string | null
  clientName: string
  clientEmail: string
  orderTitle: string
  latestContent: string
  latestAt: string
  unreadClientCount: number
}

interface AdminMessageThreadListProps {
  threads: AdminMessageThread[]
  selectedOrderId?: string | null
}

export default function AdminMessageThreadList({
  threads,
  selectedOrderId,
}: AdminMessageThreadListProps) {
  const onlineByClientId = useClientsOnline()

  if (threads.length === 0) {
    return (
      <div className="p-6 text-sm text-gray-500 text-center">
        No threads matched your current filters.
      </div>
    )
  }

  return (
    <>
      {threads.map((thread) => {
        const isActive = selectedOrderId === thread.orderId
        const isOnline = thread.clientId ? Boolean(onlineByClientId[thread.clientId]) : false

        return (
          <Link
            key={thread.orderId}
            href={thread.href}
            className={`block p-4 transition ${
              isActive ? 'bg-purple-50 border-l-4 border-purple-500' : 'hover:bg-gray-50 border-l-4 border-transparent'
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-bold text-gray-900 truncate">{thread.clientName}</p>
                  {thread.clientId && <OnlineStatusBadge isOnline={isOnline} compact />}
                </div>
                <p className="text-xs text-gray-500 truncate">{thread.clientEmail || 'No email'}</p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {thread.unreadClientCount > 0 && (
                  <span className="inline-flex items-center rounded-full bg-red-100 text-red-700 px-2 py-0.5 text-[11px] font-bold">
                    {thread.unreadClientCount}
                  </span>
                )}
              </div>
            </div>
            <p className="mt-2 text-xs font-semibold text-slate-700 truncate">{thread.orderTitle}</p>
            <p className="mt-1 text-xs text-gray-600 line-clamp-2">{thread.latestContent}</p>
            <p className="mt-1 text-[11px] text-gray-400">{thread.latestAt}</p>
          </Link>
        )
      })}
    </>
  )
}
