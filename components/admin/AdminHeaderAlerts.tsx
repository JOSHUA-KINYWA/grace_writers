'use client'

import Link from 'next/link'
import { FaComments, FaStar } from 'react-icons/fa'
import { useUnreadMessageCount } from '@/hooks/useUnreadMessageCount'
import { useUnreadLiveChatCount } from '@/hooks/useUnreadLiveChatCount'

function Badge({ count }: { count: number }) {
  if (count <= 0) return null
  return (
    <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-600 text-white text-[10px] font-bold flex items-center justify-center shadow-md">
      {count > 99 ? '99+' : count}
    </span>
  )
}

export default function AdminHeaderAlerts() {
  const { count: msgCount, pulse: msgPulse } = useUnreadMessageCount('admin')
  const liveCount = useUnreadLiveChatCount('admin')

  return (
    <div className="flex items-center gap-2 flex-wrap justify-end">
      <Link
        href="/admin/messages"
        className={`relative inline-flex items-center gap-2 text-sm text-slate-600 bg-slate-100 hover:bg-slate-200 px-3 py-2 rounded-lg transition ${
          msgPulse ? 'ring-2 ring-red-400 ring-offset-1' : ''
        }`}
        title={msgCount > 0 ? `${msgCount} unread order messages` : 'Order messages'}
      >
        <FaComments className={msgCount > 0 ? 'text-blue-600' : undefined} />
        <span className="hidden sm:inline">Messages</span>
        <Badge count={msgCount} />
      </Link>
      <Link
        href="/admin/chat"
        className={`relative inline-flex items-center gap-2 text-sm text-slate-600 bg-slate-100 hover:bg-slate-200 px-3 py-2 rounded-lg transition ${
          liveCount > 0 ? 'ring-2 ring-orange-400 ring-offset-1' : ''
        }`}
        title={liveCount > 0 ? `${liveCount} unread live chat` : 'Live chat'}
      >
        <FaComments className={liveCount > 0 ? 'text-orange-600' : undefined} />
        <span className="hidden sm:inline">Live chat</span>
        <Badge count={liveCount} />
      </Link>
      <Link
        href="/admin/ratings"
        className="inline-flex items-center gap-2 text-sm text-slate-600 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-3 py-2 rounded-lg transition"
        title="Manage client ratings"
      >
        <FaStar className="text-amber-600" />
        <span className="hidden sm:inline">Ratings</span>
      </Link>
    </div>
  )
}
