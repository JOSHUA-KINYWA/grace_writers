'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { FaShoppingCart } from 'react-icons/fa'

interface OrderButtonProps {
  serviceId: string
  serviceTitle: string
  className?: string
}

export default function OrderButton({ serviceId, serviceTitle, className = '' }: Readonly<OrderButtonProps>) {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  async function checkAuth() {
    const { data: { user } } = await supabase.auth.getUser()
    setUser(user)
    setLoading(false)
  }

  useEffect(() => {
    const t = setTimeout(() => {
      checkAuth()
    }, 0)
    return () => clearTimeout(t)
  }, [])

  if (loading) {
    return (
      <div className="flex-1 bg-gray-300 text-white px-6 py-4 rounded-lg text-center font-semibold">
        Loading...
      </div>
    )
  }

  if (!user) {
    return (
      <Link
        href={`/login?next=/orders/new&service=${serviceId}`}
        className={`flex-1 bg-purple-600 text-white px-6 py-4 rounded-lg text-center font-semibold hover:bg-purple-700 transition flex items-center justify-center gap-2 ${className}`}
      >
        <FaShoppingCart /> Create Order (Login Required)
      </Link>
    )
  }

  return (
    <Link
      href={`/orders/new?service=${serviceId}`}
      className={`flex-1 bg-purple-600 text-white px-6 py-4 rounded-lg text-center font-semibold hover:bg-purple-700 transition flex items-center justify-center gap-2 ${className}`}
    >
      <FaShoppingCart /> Create Order for {serviceTitle}
    </Link>
  )
}
