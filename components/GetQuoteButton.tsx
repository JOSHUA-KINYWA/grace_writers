'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { getCachedAuthUser } from '@/lib/auth/client-session'

interface GetQuoteButtonProps {
  children: React.ReactNode
  className?: string
  /** Where signed-in users go (default: new order). */
  destination?: string
}

const defaultClasses =
  'inline-flex items-center justify-center gap-2 font-semibold transition-all duration-300 bg-purple-600 text-white px-6 py-3 rounded-full shadow-lg hover:bg-purple-700 hover:shadow-xl disabled:opacity-60'

export default function GetQuoteButton({
  children,
  className = '',
  destination = '/orders/new',
}: GetQuoteButtonProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleClick() {
    setLoading(true)
    try {
      const supabase = createClient()
      const user = await getCachedAuthUser(supabase)
      if (user) {
        router.push(destination)
      } else {
        router.push(`/login?next=${encodeURIComponent(destination)}`)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className={`${defaultClasses} ${className}`}
    >
      {loading ? 'Please wait…' : children}
    </button>
  )
}
