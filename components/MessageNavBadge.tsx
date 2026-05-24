'use client'

import Link from 'next/link'
import { FaComments } from 'react-icons/fa'
import { useUnreadMessageCount } from '@/hooks/useUnreadMessageCount'

interface MessageNavBadgeProps {
  role: 'admin' | 'client'
  href: string
  className?: string
  iconOnly?: boolean
}

export default function MessageNavBadge({
  role,
  href,
  className = '',
  iconOnly = false,
}: MessageNavBadgeProps) {
  const { count, pulse } = useUnreadMessageCount(role)

  return (
    <Link
      href={href}
      className={`relative inline-flex items-center gap-2 transition ${className} ${
        pulse ? 'animate-pulse ring-2 ring-red-400 ring-offset-1 rounded-lg' : ''
      }`}
      title={count > 0 ? `${count} unread message${count === 1 ? '' : 's'}` : 'Messages'}
    >
      <FaComments className={count > 0 ? 'text-blue-600' : undefined} />
      {!iconOnly && <span className="hidden sm:inline">Messages</span>}
      {count > 0 && (
        <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-600 text-white text-[10px] font-bold flex items-center justify-center shadow-md">
          {count > 99 ? '99+' : count}
        </span>
      )}
    </Link>
  )
}
