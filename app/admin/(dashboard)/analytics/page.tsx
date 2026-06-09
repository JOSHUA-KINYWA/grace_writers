'use client'

import { useState, useEffect } from 'react'
import { FaSearch } from 'react-icons/fa'

type PayPalTransaction = {
  transaction_info?: {
    transaction_id?: string
    transaction_initiation_date?: string
    transaction_amount?: { currency_code?: string; value?: string }
    transaction_status?: string
    transaction_event_code?: string
    transaction_subject?: string
  }
  payer_info?: {
    email_address?: string
    payer_id?: string
    name?: string | {
      given_name?: string
      surname?: string
      full_name?: string
    }
  }
}

export default function AnalyticsPage() {
  const [startDate, setStartDate] = useState(() => {
    const date = new Date()
    date.setDate(date.getDate() - 30)
    return date.toISOString().slice(0, 10)
  })
  const [endDate, setEndDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [transactionStatus, setTransactionStatus] = useState('SUCCESS')
  const [pageSize, setPageSize] = useState(50)
  const [transactions, setTransactions] = useState<PayPalTransaction[]>([])
  const [totalItems, setTotalItems] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchTransactions = async (pageOverride = 1) => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/paypal/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startDate: `${startDate}T00:00:00Z`,
          endDate: `${endDate}T23:59:59Z`,
          transactionStatus,
          page: pageOverride,
          pageSize,
        }),
      })
      const payload = await response.json()

      if (!response.ok || !payload.ok) {
        throw new Error(payload.error || 'Unable to fetch PayPal transaction report')
      }

      const data = payload.data
      setTransactions(data.transaction_details || [])
      setTotalItems(Number(data.total_items || data.total_transactions || 0))
      setPage(pageOverride)
    } catch (err: any) {
      setError(typeof err?.message === 'string' ? err.message : 'PayPal report request failed')
      setTransactions([])
      setTotalItems(0)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTransactions(1)
  }, [])

  const totalPages = Math.ceil(totalItems / pageSize)
  const totalAmount = transactions.reduce((sum, transaction) => {
    const value = Number(transaction.transaction_info?.transaction_amount?.value ?? 0)
    return sum + value
  }, 0)

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between mb-8">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Analytics & PayPal Reports</h2>
          <p className="text-gray-600">Search PayPal transaction data for your business.</p>
        </div>
        <button
          type="button"
          onClick={() => fetchTransactions(page)}
          className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
        >
          <FaSearch /> Refresh
        </button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px] mb-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow p-5">
            <p className="text-sm text-gray-500">Transactions</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">{totalItems}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-5">
            <p className="text-sm text-gray-500">Total Amount</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">${totalAmount.toFixed(2)}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-5">
            <p className="text-sm text-gray-500">Page Size</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">{pageSize}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-5">
            <p className="text-sm text-gray-500">Page</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">
              {page} / {totalPages || 1}
            </p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1 text-sm text-gray-600">
              Start date
              <input
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
                className="w-full rounded-lg border-gray-300 bg-white text-sm text-gray-900 shadow-sm"
              />
            </label>
            <label className="space-y-1 text-sm text-gray-600">
              End date
              <input
                type="date"
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
                className="w-full rounded-lg border-gray-300 bg-white text-sm text-gray-900 shadow-sm"
              />
            </label>
            <label className="space-y-1 text-sm text-gray-600">
              Status filter
              <select
                value={transactionStatus}
                onChange={(event) => setTransactionStatus(event.target.value)}
                className="w-full rounded-lg border-gray-300 bg-white text-sm text-gray-900 shadow-sm"
              >
                <option value="SUCCESS">SUCCESS</option>
                <option value="PENDING">PENDING</option>
                <option value="DENIED">DENIED</option>
                <option value="REFUNDED">REFUNDED</option>
                <option value="">All</option>
              </select>
            </label>
            <label className="space-y-1 text-sm text-gray-600">
              Page size
              <input
                type="number"
                min={1}
                max={200}
                value={pageSize}
                onChange={(event) => setPageSize(Number(event.target.value))}
                className="w-full rounded-lg border-gray-300 bg-white text-sm text-gray-900 shadow-sm"
              />
            </label>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="border-b border-gray-200 bg-slate-50 px-5 py-4 flex items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">PayPal Transaction Results</h3>
            <p className="text-sm text-gray-600">Showing up to {pageSize} transactions per page.</p>
          </div>
          <button
            type="button"
            disabled={loading}
            onClick={() => fetchTransactions(page)}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Loading...' : 'Reload'}
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] divide-y divide-gray-200 text-left text-sm">
            <thead className="bg-slate-100 text-slate-700">
              <tr>
                <th className="px-4 py-3">Transaction ID</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Event</th>
                <th className="px-4 py-3">Payer</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {transactions.length === 0 && !loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-gray-500">
                    No PayPal transactions found for this range.
                  </td>
                </tr>
              ) : (
                transactions.map((transaction, idx) => {
                  const info = transaction.transaction_info || {}
                  const payer = transaction.payer_info || {}
                  const payerName =
                    typeof payer.name === 'string'
                      ? payer.name
                      : payer.name?.full_name || payer.name?.given_name
                  return (
                    <tr key={`${info.transaction_id ?? 'row'}-${idx}`}>
                      <td className="px-4 py-4 font-medium text-slate-900">{info.transaction_id || '—'}</td>
                      <td className="px-4 py-4 text-slate-600">{new Date(info.transaction_initiation_date || '').toLocaleString() || '—'}</td>
                      <td className="px-4 py-4 text-slate-600">
                        {info.transaction_amount?.currency_code} {info.transaction_amount?.value}
                      </td>
                      <td className="px-4 py-4 text-slate-600">{info.transaction_status || '—'}</td>
                      <td className="px-4 py-4 text-slate-600">{info.transaction_event_code || '—'}</td>
                      <td className="px-4 py-4 text-slate-600">{payer.email_address || payerName || '—'}</td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-gray-600">Page {page} of {totalPages || 1}</div>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={page <= 1 || loading}
            onClick={() => fetchTransactions(page - 1)}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 disabled:opacity-50"
          >
            Previous
          </button>
          <button
            type="button"
            disabled={page >= totalPages || loading}
            onClick={() => fetchTransactions(page + 1)}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  )
}
