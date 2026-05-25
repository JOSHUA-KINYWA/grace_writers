'use client'

import { useCallback, useEffect, useState } from 'react'
import { FaStar, FaTrash, FaEye, FaEyeSlash } from 'react-icons/fa'

interface AdminRatingRow {
  id: string
  rating: number
  review_comment?: string | null
  rating_type?: string
  is_visible?: boolean
  is_published?: boolean
  admin_reply?: string | null
  client_display_name?: string | null
  created_at?: string
  order?: { id: string; title?: string } | null
  client?: { id: string; name?: string; email?: string } | null
}

export default function AdminRatingsManager() {
  const [rows, setRows] = useState<AdminRatingRow[]>([])
  const [loading, setLoading] = useState(true)
  const [replyDraft, setReplyDraft] = useState<Record<string, string>>({})
  const [savingId, setSavingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/order-ratings?admin=true', { cache: 'no-store' })
      if (res.ok) {
        const data = await res.json()
        setRows(Array.isArray(data) ? data : [])
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function patchRating(id: string, body: Record<string, unknown>) {
    setSavingId(id)
    try {
      const res = await fetch('/api/order-ratings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...body }),
      })
      if (!res.ok) throw new Error('Update failed')
      await load()
    } finally {
      setSavingId(null)
    }
  }

  async function deleteRating(id: string) {
    if (!confirm('Delete this rating permanently?')) return
    setSavingId(id)
    try {
      await fetch(`/api/order-ratings?id=${encodeURIComponent(id)}`, { method: 'DELETE' })
      await load()
    } finally {
      setSavingId(null)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Ratings & reviews</h1>
        <p className="text-sm text-slate-600 mt-1">
          Reply to clients, hide reviews that are not appropriate, or delete spam.
        </p>
      </div>

      {loading ? (
        <p className="text-slate-600">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="text-slate-600">No ratings yet.</p>
      ) : (
        <div className="space-y-4">
          {rows.map((row) => (
            <article
              key={row.id}
              className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-slate-900">
                    {row.client_display_name || row.client?.name || 'Client'}
                  </p>
                  <p className="text-xs text-slate-500">
                    {row.rating_type === 'platform' ? 'Platform review' : 'Order review'}
                    {row.order?.title ? ` · ${row.order.title}` : ''}
                  </p>
                  <div className="flex items-center gap-1 mt-2 text-yellow-500">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <FaStar
                        key={i}
                        size={14}
                        className={i <= Number(row.rating) ? 'text-yellow-500' : 'text-slate-300'}
                      />
                    ))}
                    <span className="text-xs text-slate-600 ml-1">{row.rating}/5</span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 shrink-0">
                  <button
                    type="button"
                    disabled={savingId === row.id}
                    onClick={() =>
                      patchRating(row.id, { is_visible: !row.is_visible })
                    }
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 text-sm font-medium hover:bg-slate-50"
                  >
                    {row.is_visible !== false ? <FaEye /> : <FaEyeSlash />}
                    {row.is_visible !== false ? 'Visible' : 'Hidden'}
                  </button>
                  <button
                    type="button"
                    disabled={savingId === row.id}
                    onClick={() => deleteRating(row.id)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-red-200 text-red-700 text-sm font-medium hover:bg-red-50"
                  >
                    <FaTrash />
                    Delete
                  </button>
                </div>
              </div>

              {row.review_comment && (
                <p className="text-sm text-slate-700 mt-3 break-words">{row.review_comment}</p>
              )}

              {row.admin_reply && (
                <div className="mt-3 rounded-lg bg-purple-50 border border-purple-100 p-3">
                  <p className="text-xs font-semibold text-purple-800">Your reply</p>
                  <p className="text-sm text-slate-700 mt-1">{row.admin_reply}</p>
                </div>
              )}

              <div className="mt-4 flex flex-col sm:flex-row gap-2">
                <textarea
                  value={replyDraft[row.id] ?? row.admin_reply ?? ''}
                  onChange={(e) =>
                    setReplyDraft((d) => ({ ...d, [row.id]: e.target.value }))
                  }
                  placeholder="Write a public reply…"
                  rows={2}
                  className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm min-w-0"
                />
                <button
                  type="button"
                  disabled={savingId === row.id}
                  onClick={() =>
                    patchRating(row.id, {
                      admin_reply: replyDraft[row.id] ?? '',
                      is_published: true,
                    })
                  }
                  className="shrink-0 px-4 py-2 rounded-lg bg-purple-600 text-white text-sm font-semibold hover:bg-purple-700 disabled:opacity-50"
                >
                  Save reply
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
