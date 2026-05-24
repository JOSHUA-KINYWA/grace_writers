'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import UserAvatar from '@/components/UserAvatar'

export default function DashboardHeaderUser() {
  const [name, setName] = useState('')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    async function load() {
      try {
        const res = await fetch('/api/profile/avatar', { cache: 'no-store' })
        if (!res.ok || !active) return
        const data = await res.json()
        if (active) {
          setName(data.name || '')
          setAvatarUrl(data.url || null)
        }
      } catch {
        /* ignore */
      }
    }
    load()
    const onProfile = () => load()
    window.addEventListener('profile-updated', onProfile)
    return () => {
      active = false
      window.removeEventListener('profile-updated', onProfile)
    }
  }, [])

  return (
    <Link
      href="/account/profile"
      className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 px-2 py-1.5 shrink-0"
      title="Account settings"
    >
      <UserAvatar src={avatarUrl} name={name} size="sm" />
      <span className="hidden sm:inline text-sm font-medium text-slate-700 max-w-[120px] truncate">
        {name || 'Account'}
      </span>
    </Link>
  )
}
