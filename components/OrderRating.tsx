'use client'

import { useState, useEffect } from 'react'
import { FaStar, FaPaperPlane } from 'react-icons/fa'

interface OrderRatingProps {
  orderId: string
  onRatingSubmitted?: () => void
}

export default function OrderRating({ orderId, onRatingSubmitted }: OrderRatingProps) {
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [existingRating, setExistingRating] = useState<any>(null)

  useEffect(() => {
    fetchExistingRating()
  }, [orderId])

  async function fetchExistingRating() {
    try {
      const res = await fetch(`/api/order-ratings?order_id=${orderId}`)
      if (res.ok) {
        const data = await res.json()
        if (data) {
          setRating(data.rating)
          setComment(data.review_comment || '')
          setExistingRating(data)
        }
      }
    } catch (err) {
      console.error('Error fetching rating:', err)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess(false)

    try {
      if (!rating) {
        setError('Please select a rating')
        return
      }

      const res = await fetch('/api/order-ratings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_id: orderId,
          rating,
          review_comment: comment
        })
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to submit rating')
      }

      setSuccess(true)
      onRatingSubmitted?.()
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('ratingSubmitted', { detail: { orderId } }))
      }
      setTimeout(() => setSuccess(false), 3000)
    } catch (err: any) {
      setError(err.message || 'Failed to submit rating')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-lg border border-yellow-200 p-6">
      <div className="flex items-center gap-2 mb-4">
        <FaStar className="text-yellow-500" size={24} />
        <h3 className="text-lg font-bold text-gray-900">Rate This Order</h3>
      </div>

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
          <p className="text-green-700 text-sm font-semibold">Thank you! Your rating has been saved.</p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
          <p className="text-red-700 text-sm font-semibold">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Star Rating */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-3">
            How satisfied are you with this order?
          </label>
          <div className="flex gap-2 mb-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                className={`p-3 rounded-lg transition transform hover:scale-110 ${
                  rating >= star
                    ? 'bg-yellow-300 text-yellow-700'
                    : 'bg-gray-200 text-gray-400 hover:bg-gray-300'
                }`}
              >
                <FaStar size={28} />
              </button>
            ))}
          </div>
          {rating > 0 && (
            <p className="text-sm text-gray-600">
              {rating === 1 && 'Very Poor'}
              {rating === 2 && 'Poor'}
              {rating === 3 && 'Satisfactory'}
              {rating === 4 && 'Very Good'}
              {rating === 5 && 'Excellent'}
            </p>
          )}
        </div>

        {/* Comment */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Share your feedback (optional)
          </label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="What did you like? What could be improved?..."
            rows={4}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent resize-none"
          />
          <p className="text-xs text-gray-500 mt-1">
            {comment.length}/500 characters
          </p>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading || !rating}
          className="w-full px-4 py-3 bg-gradient-to-r from-yellow-500 to-orange-500 text-white font-bold rounded-lg hover:from-yellow-600 hover:to-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
        >
          <FaPaperPlane size={16} />
          {loading ? 'Submitting...' : existingRating ? 'Update Rating' : 'Submit Rating'}
        </button>

        {existingRating && (
          <p className="text-xs text-gray-600 text-center">
            This rating was last updated on {new Date(existingRating.updated_at).toLocaleDateString()}
          </p>
        )}
      </form>
    </div>
  )
}
