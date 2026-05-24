'use client'

import { FaCircle } from 'react-icons/fa'

interface OnlineStatusBadgeProps {
  isOnline: boolean
  compact?: boolean
}

export default function OnlineStatusBadge({ isOnline, compact = false }: OnlineStatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-semibold ${
        compact ? 'text-[10px] px-1.5 py-0.5' : 'text-xs px-2 py-0.5'
      } ${isOnline ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-600'}`}
    >
      <FaCircle size={6} className={isOnline ? 'text-green-500 animate-pulse' : 'text-slate-400'} />
      {isOnline ? 'Online' : 'Offline'}
    </span>
  )
}
