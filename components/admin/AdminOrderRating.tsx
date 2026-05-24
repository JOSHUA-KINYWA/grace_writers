'use client'

import { useEffect, useState } from 'react'
import { FaStar } from 'react-icons/fa'

interface AdminOrderRatingProps {
  orderId: string
}

export default function AdminOrderRating({ orderId }: AdminOrderRatingProps) {
  const [rating, setRating] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/order-ratings?order_id=${orderId}`, { cache: 'no-store' })
        if (res.ok) {
          const data = await res.json()
          setRating(data && data.rating ? data : null)
        }
      } catch {
        setRating(null)
      } finally {
        setLoading(false)
      }
    }
    load()
    const onRating = () => load()
    window.addEventListener('ratingSubmitted', onRating)
    const interval = setInterval(load, 10000)
    return () => {
      window.removeEventListener('ratingSubmitted', onRating)
      clearInterval(interval)
    }
  }, [orderId])

  if (loading) {
    return <p className="text-sm text-gray-500">Loading client rating...</p>
  }

  if (!rating) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
        <p className="text-sm font-semibold text-amber-900">No client rating yet</p>
        <p className="text-xs text-amber-800 mt-1">The client can rate this order once it is delivered or completed.</p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
      <div className="flex items-center gap-2 mb-2">
        <FaStar className="text-yellow-500" />
        <h3 className="font-bold text-gray-900">Client Rating</h3>
        <span className="ml-auto text-sm font-bold text-amber-800">{Number(rating.rating).toFixed(1)} / 5</span>
      </div>
      <div className="flex gap-1 mb-2">
        {[1, 2, 3, 4, 5].map((star) => (
          <FaStar
            key={star}
            className={star <= Number(rating.rating) ? 'text-yellow-500' : 'text-slate-300'}
            size={16}
          />
        ))}
      </div>
      {rating.review_comment && (
        <p className="text-sm text-gray-700 whitespace-pre-wrap">{rating.review_comment}</p>
      )}
      <p className="text-xs text-gray-500 mt-2">
        Submitted {new Date(rating.created_at).toLocaleString()}
      </p>
    </div>
  )
}
