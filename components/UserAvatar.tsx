'use client'

import { FaUser } from 'react-icons/fa'

type UserAvatarProps = {
  src?: string | null
  name?: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizeMap = {
  sm: 'w-8 h-8 text-sm',
  md: 'w-10 h-10 text-base',
  lg: 'w-12 h-12 text-lg',
}

export default function UserAvatar({ src, name, size = 'md', className = '' }: UserAvatarProps) {
  const initials = (name || '?')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('')

  return (
    <div
      className={`${sizeMap[size]} rounded-full overflow-hidden bg-purple-100 text-purple-700 flex items-center justify-center font-bold shrink-0 ${className}`}
      title={name || 'Profile'}
    >
      {src ? (
        <img src={src} alt="" className="w-full h-full object-cover" />
      ) : initials ? (
        <span>{initials}</span>
      ) : (
        <FaUser className="opacity-60" />
      )}
    </div>
  )
}
