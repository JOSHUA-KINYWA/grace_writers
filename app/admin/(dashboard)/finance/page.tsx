'use client'

import { useEffect, useState } from 'react'

type FinanceOrder = {
  id: string
  title: string | null
  status: string | null
  payment_status: string | null
  quote_amount: number | null
  paid_amount: number | null
  created_at: string | null
  clients: { name: string | null; email: string | null } | Array<{ name: string | null; email: string | null }> | null
}

type FinanceData = {
  totals: { quoted: number; collected: number; outstanding: number }
  orders: FinanceOrder[]
}

const money = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
})

function getClient(order: FinanceOrder) {
  return Array.isArray(order.clients) ? order.clients[0] : order.clients
}

export default function FinancePage() {
  const [data, setData] = useState<FinanceData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    fetch('/api/admin/finance', { cache: 'no-store' })
      .then(async (response) => {
        const result = await response.json()
        if (!response.ok) throw new Error(result.error || 'Failed to load order payments')
        if (active) setData(result)
      })
      .catch((requestError: unknown) => {
        if (active) setError(requestError instanceof Error ? requestError.message : 'Failed to load order payments')
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [])

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-900">Order Payments</h2>
        <p className="mt-2 text-gray-600">
          Totals use the quote and paid amounts recorded on orders. Expenses and standalone invoices are not tracked here.
        </p>
      </div>

      {error && (
        <div role="alert" className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
          {error}
        </div>
      )}

      <div className="mb-8 grid grid-cols-1 gap-5 md:grid-cols-3">
        {[
          { label: 'Quoted across orders', value: data?.totals.quoted },
          { label: 'Payments recorded', value: data?.totals.collected },
          { label: 'Outstanding balance', value: data?.totals.outstanding },
        ].map((item) => (
          <div key={item.label} className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm text-slate-600">{item.label}</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">
              {loading ? 'Loading…' : money.format(item.value || 0)}
            </p>
          </div>
        ))}
      </div>

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-6 py-4">
          <h3 className="font-semibold text-slate-900">Orders and payment status</h3>
        </div>
        {loading ? (
          <p className="p-6 text-center text-slate-500">Loading orders…</p>
        ) : !data?.orders.length ? (
          <p className="p-6 text-center text-slate-500">No orders found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px]">
              <thead className="bg-slate-50 text-left text-sm text-slate-700">
                <tr>
                  <th className="px-5 py-3 font-semibold">Order</th>
                  <th className="px-5 py-3 font-semibold">Client</th>
                  <th className="px-5 py-3 font-semibold">Quoted</th>
                  <th className="px-5 py-3 font-semibold">Paid</th>
                  <th className="px-5 py-3 font-semibold">Payment status</th>
                  <th className="px-5 py-3 font-semibold">Created</th>
                </tr>
              </thead>
              <tbody>
                {data.orders.map((order) => {
                  const client = getClient(order)
                  return (
                    <tr key={order.id} className="border-t border-slate-100 text-sm">
                      <td className="px-5 py-4 font-medium text-slate-900">{order.title || 'Untitled order'}</td>
                      <td className="px-5 py-4 text-slate-600">{client?.name || client?.email || '—'}</td>
                      <td className="px-5 py-4 text-slate-700">{money.format(Number(order.quote_amount || 0))}</td>
                      <td className="px-5 py-4 text-slate-700">{money.format(Number(order.paid_amount || 0))}</td>
                      <td className="px-5 py-4 capitalize text-slate-700">{(order.payment_status || 'unpaid').replace(/_/g, ' ')}</td>
                      <td className="px-5 py-4 text-slate-600">
                        {order.created_at ? new Date(order.created_at).toLocaleDateString() : '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
