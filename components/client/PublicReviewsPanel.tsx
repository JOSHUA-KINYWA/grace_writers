'use client'

import { useEffect, useMemo, useState } from 'react'
import { FaStar } from 'react-icons/fa'

export interface PublicReview {
  id: string
  rating: number
  review_comment?: string | null
  rating_type?: string
  client_display_name?: string | null
  admin_reply?: string | null
  admin_reply_at?: string | null
  created_at?: string
  order?: {
    id: string
    title?: string
    services?: { category?: string | null; title?: string | null } | null
  } | null
}

type ReviewTypeFilter = 'all' | 'order' | 'platform'

function getOrderTopic(review: PublicReview): string {
  const svc = review.order?.services
  return svc?.category || svc?.title || review.order?.title || 'General'
}

export default function PublicReviewsPanel() {
  const [reviews, setReviews] = useState<PublicReview[]>([])
  const [loading, setLoading] = useState(true)
  const [starFilter, setStarFilter] = useState<number | 'all'>('all')
  const [typeFilter, setTypeFilter] = useState<ReviewTypeFilter>('all')
  const [topicFilter, setTopicFilter] = useState<string>('all')

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const res = await fetch('/api/order-ratings?public=true', { cache: 'no-store' })
        if (res.ok) {
          const data = await res.json()
          setReviews(Array.isArray(data) ? data : [])
        }
      } catch {
        setReviews([])
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const orderTopics = useMemo(() => {
    const topics = new Set<string>()
    reviews.forEach((r) => {
      if (r.rating_type === 'platform') return
      topics.add(getOrderTopic(r))
    })
    return Array.from(topics).sort((a, b) => a.localeCompare(b))
  }, [reviews])

  const filtered = useMemo(() => {
    let list = reviews
    if (typeFilter === 'order') {
      list = list.filter((r) => r.rating_type !== 'platform')
    } else if (typeFilter === 'platform') {
      list = list.filter((r) => r.rating_type === 'platform')
    }
    if (typeFilter !== 'platform' && topicFilter !== 'all') {
      list = list.filter((r) => r.rating_type !== 'platform' && getOrderTopic(r) === topicFilter)
    }
    if (starFilter !== 'all') {
      list = list.filter((r) => Math.round(Number(r.rating)) === starFilter)
    }
    return list
  }, [reviews, starFilter, typeFilter, topicFilter])

  const statsSource = useMemo(() => {
    if (typeFilter === 'order') return reviews.filter((r) => r.rating_type !== 'platform')
    if (typeFilter === 'platform') return reviews.filter((r) => r.rating_type === 'platform')
    return reviews
  }, [reviews, typeFilter])

  const average = useMemo(() => {
    if (!statsSource.length) return 0
    return statsSource.reduce((s, r) => s + Number(r.rating || 0), 0) / statsSource.length
  }, [statsSource])

  const starCounts = useMemo(() => {
    const counts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    statsSource.forEach((r) => {
      const s = Math.min(5, Math.max(1, Math.round(Number(r.rating))))
      counts[s] = (counts[s] || 0) + 1
    })
    return counts
  }, [statsSource])

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-4 sm:p-5 shadow-sm">
      <div className="flex flex-col gap-4 mb-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">Community</p>
          <h2 className="text-lg font-bold text-slate-900">Client reviews</h2>
          {statsSource.length > 0 && (
            <p className="text-sm text-slate-600 mt-1">
              {average.toFixed(1)} / 5 · {statsSource.length} review
              {statsSource.length === 1 ? '' : 's'}
              {typeFilter === 'order' ? ' (orders)' : typeFilter === 'platform' ? ' (platform)' : ''}
            </p>
          )}
        </div>

        <div className="flex flex-wrap gap-1.5">
          {(['all', 'order', 'platform'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => {
                setTypeFilter(t)
                if (t === 'platform') setTopicFilter('all')
              }}
              className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${
                typeFilter === t
                  ? 'bg-purple-600 text-white border-purple-600'
                  : 'border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              {t === 'all' ? 'All reviews' : t === 'order' ? 'Order reviews' : 'Platform reviews'}
            </button>
          ))}
        </div>

        {typeFilter !== 'platform' && orderTopics.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-slate-600 shrink-0">Topic:</span>
            <select
              value={topicFilter}
              onChange={(e) => setTopicFilter(e.target.value)}
              className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white max-w-full"
            >
              <option value="all">All topics</option>
              {orderTopics.map((topic) => (
                <option key={topic} value={topic}>
                  {topic}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setStarFilter('all')}
            className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${
              starFilter === 'all'
                ? 'bg-purple-600 text-white border-purple-600'
                : 'border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            All stars
          </button>
          {[5, 4, 3, 2, 1].map((stars) => (
            <button
              key={stars}
              type="button"
              onClick={() => setStarFilter(stars)}
              className={`px-2.5 py-1 rounded-full text-xs font-semibold border inline-flex items-center gap-1 ${
                starFilter === stars
                  ? 'bg-purple-600 text-white border-purple-600'
                  : 'border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              {stars} <FaStar className="text-[10px]" />
              <span className="opacity-80">({starCounts[stars] || 0})</span>
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-slate-600">Loading reviews…</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-slate-600">
          {reviews.length === 0
            ? 'No published reviews yet. Complete an order and share your experience.'
            : 'No reviews match these filters.'}
        </p>
      ) : (
        <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
          {filtered.map((review) => {
            const topic =
              review.rating_type === 'platform' ? null : getOrderTopic(review)
            return (
              <article
                key={review.id}
                className="rounded-xl border border-slate-200 bg-slate-50 p-3 sm:p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-slate-900">
                    {review.client_display_name || 'Verified client'}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {topic && (
                      <span className="text-xs font-medium text-slate-700 bg-slate-200 px-2 py-0.5 rounded-full">
                        {topic}
                      </span>
                    )}
                    <span className="text-xs font-medium text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">
                      {review.rating_type === 'platform' ? 'Platform' : 'Order'}
                    </span>
                  </div>
                </div>
                <div className="mt-1 flex items-center gap-0.5 text-yellow-500">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <FaStar
                      key={i}
                      className={i <= Number(review.rating) ? 'text-yellow-500' : 'text-slate-300'}
                      size={14}
                    />
                  ))}
                  <span className="ml-2 text-xs text-slate-500">{Number(review.rating).toFixed(1)}</span>
                </div>
                {review.order?.title && review.rating_type !== 'platform' && (
                  <p className="text-xs text-slate-500 mt-1 truncate">Re: {review.order.title}</p>
                )}
                {review.review_comment && (
                  <p className="text-sm text-slate-700 mt-2 break-words">{review.review_comment}</p>
                )}
                {review.admin_reply && (
                  <div className="mt-3 rounded-lg border border-purple-100 bg-purple-50/80 p-3">
                    <p className="text-xs font-semibold text-purple-800">Team response</p>
                    <p className="text-sm text-slate-700 mt-1 break-words">{review.admin_reply}</p>
                  </div>
                )}
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}
