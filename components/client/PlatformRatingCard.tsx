'use client'

import { useEffect, useState } from 'react'
import { FaStar } from 'react-icons/fa'

export default function PlatformRatingCard() {
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingExisting, setLoadingExisting] = useState(true)
  const [existingId, setExistingId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    async function load() {
      setLoadingExisting(true)
      try {
        const res = await fetch('/api/order-ratings?platform_mine=true', { cache: 'no-store' })
        if (res.ok) {
          const data = await res.json()
          if (data?.id) {
            setExistingId(data.id)
            setRating(Number(data.rating) || 0)
            setComment(data.review_comment || '')
          }
        }
      } catch {
        /* ignore */
      } finally {
        setLoadingExisting(false)
      }
    }
    load()
  }, [])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!rating) {
      setError('Select a star rating')
      return
    }
    setLoading(true)
    setError('')
    setSuccess(false)
    try {
      const res = await fetch('/api/order-ratings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rating_type: 'platform',
          rating,
          review_comment: comment,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to submit')
      if (data?.id) setExistingId(data.id)
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to submit')
    } finally {
      setLoading(false)
    }
  }

  if (loadingExisting) {
    return <p className="text-sm text-slate-600">Loading your platform review…</p>
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      {success && (
        <p className="text-sm text-green-700 font-medium">
          {existingId ? 'Your platform review has been updated.' : 'Thank you — your platform review has been submitted.'}
        </p>
      )}
      <p className="text-sm text-slate-600">
        {existingId
          ? 'You can change your overall rating anytime.'
          : 'Rate your overall experience with Grace Tutors.'}
      </p>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((i) => (
          <button
            key={i}
            type="button"
            onClick={() => setRating(i)}
            className="p-1"
            aria-label={`${i} stars`}
          >
            <FaStar className={i <= rating ? 'text-yellow-500' : 'text-slate-300'} size={22} />
          </button>
        ))}
      </div>
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Optional comment (visible to other clients when published)"
        rows={3}
        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="px-4 py-2 rounded-lg bg-purple-600 text-white text-sm font-semibold hover:bg-purple-700 disabled:opacity-50"
      >
        {loading ? 'Saving…' : existingId ? 'Update platform review' : 'Submit platform review'}
      </button>
    </form>
  )
}
