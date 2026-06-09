'use client'

import { useEffect, useMemo, useState } from 'react'
import { FaLink, FaPlus, FaTrash, FaSyncAlt } from 'react-icons/fa'

type PayPalLineItem = {
  name?: string
  description?: string
  unit_amount?: { currency_code?: string; value?: string }
  quantity?: number
}

type PayPalPaymentLink = {
  id?: string
  payment_resource_id?: string
  href?: string
  type?: string
  status?: string
  reusable?: string
  line_items?: PayPalLineItem[]
  created_date?: string
}

export default function AdminPaymentLinksPage() {
  const [paymentLinks, setPaymentLinks] = useState<PayPalPaymentLink[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const [name, setName] = useState('Service Purchase')
  const [price, setPrice] = useState('49.99')
  const [currency, setCurrency] = useState('USD')
  const [returnUrl, setReturnUrl] = useState('https://example.com/thank-you')
  const [quantity, setQuantity] = useState(1)

  const [creating, setCreating] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  const fetchLinks = async () => {
    setLoading(true)
    setError(null)
    setMessage(null)

    try {
      const response = await fetch('/api/paypal/payment-links')
      const payload = await response.json()

      if (!response.ok || !payload.ok) {
        throw new Error(payload.error || 'Unable to fetch PayPal payment links')
      }

      const data = payload.data
      const items = data.payment_resources || data.payment_resources_list || data.items || []
      setPaymentLinks(Array.isArray(items) ? items : [])
    } catch (err: any) {
      setError(typeof err?.message === 'string' ? err.message : 'Payment links request failed')
      setPaymentLinks([])
    } finally {
      setLoading(false)
    }
  }

  const createLink = async () => {
    setCreating(true)
    setError(null)
    setMessage(null)

    try {
      const response = await fetch('/api/paypal/payment-links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          returnUrl,
          line_items: [
            {
              name,
              unit_amount: { currency_code: currency, value: price },
              quantity,
            },
          ],
        }),
      })
      const payload = await response.json()

      if (!response.ok || !payload.ok) {
        throw new Error(payload.error || 'Unable to create payment link')
      }

      setMessage('Payment link created successfully.')
      await fetchLinks()
    } catch (err: any) {
      setError(typeof err?.message === 'string' ? err.message : 'Payment link creation failed')
    } finally {
      setCreating(false)
    }
  }

  const deleteLink = async (paymentResourceId?: string) => {
    if (!paymentResourceId) return
    setRefreshing(true)
    setError(null)
    setMessage(null)

    try {
      const response = await fetch(`/api/paypal/payment-links/${encodeURIComponent(paymentResourceId)}`, {
        method: 'DELETE',
      })
      const payload = await response.json()

      if (!response.ok || !payload.ok) {
        throw new Error(payload.error || 'Unable to delete payment link')
      }

      setMessage('Payment link deleted successfully.')
      await fetchLinks()
    } catch (err: any) {
      setError(typeof err?.message === 'string' ? err.message : 'Delete payment link failed')
    } finally {
      setRefreshing(false)
    }
  }

  const totalLinks = useMemo(() => paymentLinks.length, [paymentLinks])

  useEffect(() => {
    fetchLinks()
  }, [])

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between mb-8">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">PayPal Payment Links</h2>
          <p className="text-gray-600">Create, view, and manage PayPal payment links from the admin dashboard.</p>
        </div>
        <button
          type="button"
          onClick={fetchLinks}
          disabled={loading || refreshing}
          className="inline-flex items-center gap-2 bg-slate-700 text-white px-4 py-2 rounded-lg hover:bg-slate-800 transition disabled:opacity-50"
        >
          <FaSyncAlt /> Refresh
        </button>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_420px] mb-8">
        <div className="space-y-4">
          <div className="bg-white rounded-xl shadow p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-700 grid place-items-center">
                <FaLink />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-slate-900">Create New Payment Link</h3>
                <p className="text-sm text-gray-500">Use PayPal payment resources for buy now links and reusable payments.</p>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-1 text-sm text-gray-600">
                Item name
                <input
                  type="text"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="w-full rounded-lg border-gray-300 bg-white text-sm text-gray-900 shadow-sm"
                />
              </label>
              <label className="space-y-1 text-sm text-gray-600">
                Price
                <input
                  type="number"
                  min={0.01}
                  step={0.01}
                  value={price}
                  onChange={(event) => setPrice(event.target.value)}
                  className="w-full rounded-lg border-gray-300 bg-white text-sm text-gray-900 shadow-sm"
                />
              </label>
              <label className="space-y-1 text-sm text-gray-600">
                Currency
                <input
                  type="text"
                  value={currency}
                  onChange={(event) => setCurrency(event.target.value.toUpperCase())}
                  className="w-full rounded-lg border-gray-300 bg-white text-sm text-gray-900 shadow-sm"
                />
              </label>
              <label className="space-y-1 text-sm text-gray-600">
                Quantity
                <input
                  type="number"
                  min={1}
                  value={quantity}
                  onChange={(event) => setQuantity(Number(event.target.value))}
                  className="w-full rounded-lg border-gray-300 bg-white text-sm text-gray-900 shadow-sm"
                />
              </label>
              <label className="space-y-1 text-sm text-gray-600 sm:col-span-2">
                Return URL
                <input
                  type="url"
                  value={returnUrl}
                  onChange={(event) => setReturnUrl(event.target.value)}
                  placeholder="https://example.com/thank-you"
                  className="w-full rounded-lg border-gray-300 bg-white text-sm text-gray-900 shadow-sm"
                />
              </label>
            </div>
            <div className="mt-6">
              <button
                type="button"
                onClick={createLink}
                disabled={creating}
                className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
              >
                <FaPlus /> {creating ? 'Creating...' : 'Create Payment Link'}
              </button>
            </div>
          </div>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          )}
          {message && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
              {message}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl shadow p-6">
          <div className="flex items-center justify-between gap-4 mb-4">
            <div>
              <p className="text-sm text-gray-500">Payment links</p>
              <h3 className="text-xl font-semibold text-slate-900">Available links</h3>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-700">{totalLinks}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-slate-50 text-slate-700">
                <tr>
                  <th className="px-4 py-3">Link</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Price</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {paymentLinks.length === 0 && !loading ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-gray-500">
                      No payment links available.
                    </td>
                  </tr>
                ) : (
                  paymentLinks.map((link, index) => {
                    const id = link.payment_resource_id || link.id || `link-${index}`
                    const item = link.line_items?.[0]
                    return (
                      <tr key={id}>
                        <td className="px-4 py-4 text-slate-900 max-w-[300px] truncate">
                          <a className="text-blue-600 hover:underline" href={link.href || '#'} target="_blank" rel="noreferrer">
                            {link.href || id}
                          </a>
                        </td>
                        <td className="px-4 py-4 text-slate-600">{link.type || 'LINK'}</td>
                        <td className="px-4 py-4 text-slate-600">{link.status || 'unknown'}</td>
                        <td className="px-4 py-4 text-slate-600">
                          {item?.unit_amount?.currency_code} {item?.unit_amount?.value}
                        </td>
                        <td className="px-4 py-4">
                          <button
                            type="button"
                            onClick={() => deleteLink(id)}
                            disabled={refreshing}
                            className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 hover:bg-red-100 disabled:opacity-50"
                          >
                            <FaTrash /> Delete
                          </button>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
