'use client'

import { useState, useEffect } from 'react'
import { FaSearch, FaCheckCircle, FaPlay, FaExclamationTriangle } from 'react-icons/fa'

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
    name?: { given_name?: string; surname?: string }
  }
}

type PayPalSchedule = {
  schedule_id?: string
  template_id?: string
  schedule_type?: string
  delivery_method?: string
  start_date?: string
  frequency?: number
  status?: string
}

type PayPalReportTestResult = {
  authResult?: any
  transactionResult?: any
  scheduleResult?: any
}

export default function AdminReportsPage() {
  const [startDate, setStartDate] = useState(() => {
    const date = new Date()
    date.setDate(date.getDate() - 30)
    return date.toISOString().slice(0, 10)
  })
  const [endDate, setEndDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [transactionStatus, setTransactionStatus] = useState('SUCCESS')
  const [transactionId, setTransactionId] = useState('')
  const [pageSize, setPageSize] = useState(50)
  const [transactions, setTransactions] = useState<PayPalTransaction[]>([])
  const [totalItems, setTotalItems] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [scheduleTemplateId, setScheduleTemplateId] = useState('')
  const [scheduleType, setScheduleType] = useState('DAILY')
  const [deliveryMethod, setDeliveryMethod] = useState('SFTP')
  const [scheduleStartDate, setScheduleStartDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [scheduleFrequency, setScheduleFrequency] = useState(1)
  const [schedules, setSchedules] = useState<PayPalSchedule[]>([])
  const [scheduleLoading, setScheduleLoading] = useState(false)
  const [scheduleError, setScheduleError] = useState<string | null>(null)
  const [scheduleMessage, setScheduleMessage] = useState<string | null>(null)
  const [testLoading, setTestLoading] = useState(false)
  const [testError, setTestError] = useState<string | null>(null)
  const [testResult, setTestResult] = useState<PayPalReportTestResult | null>(null)

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
          transactionId,
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

  const fetchSchedules = async () => {
    setScheduleLoading(true)
    setScheduleError(null)
    setScheduleMessage(null)

    try {
      const response = await fetch('/api/paypal/reports/schedules')
      const payload = await response.json()

      if (!response.ok || !payload.ok) {
        throw new Error(payload.error || 'Unable to fetch PayPal report schedules')
      }

      const data = payload.data
      setSchedules(data.schedules || data || [])
    } catch (err: any) {
      setScheduleError(typeof err?.message === 'string' ? err.message : 'Schedule request failed')
      setSchedules([])
    } finally {
      setScheduleLoading(false)
    }
  }

  const createSchedule = async () => {
    setScheduleLoading(true)
    setScheduleError(null)
    setScheduleMessage(null)

    try {
      const response = await fetch('/api/paypal/reports/schedules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateId: scheduleTemplateId,
          scheduleType,
          deliveryMethod,
          startDate: `${scheduleStartDate}`,
          frequency: scheduleFrequency,
        }),
      })
      const payload = await response.json()

      if (!response.ok || !payload.ok) {
        throw new Error(payload.error || 'Unable to create PayPal report schedule')
      }

      setScheduleMessage('Schedule created successfully.')
      setScheduleTemplateId('')
      await fetchSchedules()
    } catch (err: any) {
      setScheduleError(typeof err?.message === 'string' ? err.message : 'Schedule creation failed')
    } finally {
      setScheduleLoading(false)
    }
  }

  const deleteSchedule = async (scheduleId?: string) => {
    if (!scheduleId) return
    setScheduleLoading(true)
    setScheduleError(null)
    setScheduleMessage(null)

    try {
      const response = await fetch(`/api/paypal/reports/schedules/${encodeURIComponent(scheduleId)}`, {
        method: 'DELETE',
      })
      const payload = await response.json()

      if (!response.ok || !payload.ok) {
        throw new Error(payload.error || 'Unable to delete PayPal report schedule')
      }

      setScheduleMessage('Schedule deleted successfully.')
      await fetchSchedules()
    } catch (err: any) {
      setScheduleError(typeof err?.message === 'string' ? err.message : 'Schedule delete failed')
    } finally {
      setScheduleLoading(false)
    }
  }

  const runReportTests = async () => {
    setTestLoading(true)
    setTestError(null)
    setTestResult(null)

    try {
      const response = await fetch('/api/paypal/reports/test')
      const payload = await response.json()

      if (!response.ok || !payload.ok) {
        throw new Error(payload.error || 'Unable to run PayPal report tests')
      }

      setTestResult(payload)
    } catch (err: any) {
      setTestError(typeof err?.message === 'string' ? err.message : 'PayPal test request failed')
    } finally {
      setTestLoading(false)
    }
  }

  useEffect(() => {
    fetchTransactions(1)
    fetchSchedules()
  }, [])

  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))
  const totalAmount = transactions.reduce((sum, transaction) => {
    const value = Number(transaction.transaction_info?.transaction_amount?.value ?? 0)
    return sum + value
  }, 0)

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between mb-8">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">PayPal Reports</h2>
          <p className="text-gray-600">
            Search PayPal transaction data and automate report schedules using PayPal reporting APIs.
          </p>
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
              {page} / {totalPages}
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
              Transaction ID
              <input
                type="text"
                value={transactionId}
                onChange={(event) => setTransactionId(event.target.value)}
                className="w-full rounded-lg border-gray-300 bg-white text-sm text-gray-900 shadow-sm"
                placeholder="Optional ID"
              />
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
                  return (
                    <tr key={`${info.transaction_id ?? 'row'}-${idx}`}>
                      <td className="px-4 py-4 font-medium text-slate-900">{info.transaction_id || '—'}</td>
                      <td className="px-4 py-4 text-slate-600">{new Date(info.transaction_initiation_date || '').toLocaleString() || '—'}</td>
                      <td className="px-4 py-4 text-slate-600">
                        {info.transaction_amount?.currency_code} {info.transaction_amount?.value}
                      </td>
                      <td className="px-4 py-4 text-slate-600">{info.transaction_status || '—'}</td>
                      <td className="px-4 py-4 text-slate-600">{info.transaction_event_code || '—'}</td>
                      <td className="px-4 py-4 text-slate-600">{payer.email_address || payer.name?.given_name || '—'}</td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-gray-600">Page {page} of {totalPages}</div>
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

      <div className="mt-12">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between mb-4">
          <div>
            <h3 className="text-2xl font-bold text-gray-900">Scheduled PayPal Reports</h3>
            <p className="text-gray-600">
              Configure and manage PayPal report schedules via the reporting schedules API.
            </p>
          </div>
          <button
            type="button"
            onClick={fetchSchedules}
            className="inline-flex items-center gap-2 rounded-lg bg-slate-800 px-4 py-2 text-white hover:bg-slate-900 transition"
          >
            Refresh schedules
          </button>
        </div>

        <div className="grid gap-4 xl:grid-cols-[1fr_400px]">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="grid gap-4">
              {scheduleError && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                  {scheduleError}
                </div>
              )}
              {scheduleMessage && (
                <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-700">
                  {scheduleMessage}
                </div>
              )}

              <label className="space-y-1 text-sm text-gray-600">
                Report template ID
                <input
                  type="text"
                  value={scheduleTemplateId}
                  onChange={(event) => setScheduleTemplateId(event.target.value)}
                  className="w-full rounded-lg border-gray-300 bg-white text-sm text-gray-900 shadow-sm"
                  placeholder="Enter PayPal template ID"
                />
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-1 text-sm text-gray-600">
                  Schedule type
                  <select
                    value={scheduleType}
                    onChange={(event) => setScheduleType(event.target.value)}
                    className="w-full rounded-lg border-gray-300 bg-white text-sm text-gray-900 shadow-sm"
                  >
                    <option value="DAILY">Daily</option>
                    <option value="WEEKLY">Weekly</option>
                    <option value="MONTHLY">Monthly</option>
                  </select>
                </label>
                <label className="space-y-1 text-sm text-gray-600">
                  Delivery method
                  <select
                    value={deliveryMethod}
                    onChange={(event) => setDeliveryMethod(event.target.value)}
                    className="w-full rounded-lg border-gray-300 bg-white text-sm text-gray-900 shadow-sm"
                  >
                    <option value="SFTP">SFTP</option>
                  </select>
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-1 text-sm text-gray-600">
                  Start date
                  <input
                    type="date"
                    value={scheduleStartDate}
                    onChange={(event) => setScheduleStartDate(event.target.value)}
                    className="w-full rounded-lg border-gray-300 bg-white text-sm text-gray-900 shadow-sm"
                  />
                </label>
                <label className="space-y-1 text-sm text-gray-600">
                  Frequency
                  <input
                    type="number"
                    min={1}
                    value={scheduleFrequency}
                    onChange={(event) => setScheduleFrequency(Number(event.target.value))}
                    className="w-full rounded-lg border-gray-300 bg-white text-sm text-gray-900 shadow-sm"
                  />
                </label>
              </div>

              <button
                type="button"
                disabled={scheduleLoading || !scheduleTemplateId.trim()}
                onClick={createSchedule}
                className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {scheduleLoading ? 'Saving...' : 'Create schedule'}
              </button>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="mb-4 flex items-center justify-between gap-4">
              <div>
                <h4 className="text-lg font-semibold text-slate-900">Existing schedules</h4>
                <p className="text-sm text-gray-600">View active PayPal report schedules.</p>
              </div>
              {scheduleLoading && <span className="text-sm text-slate-500">Loading...</span>}
            </div>

            {schedules.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-300 p-6 text-sm text-slate-500">
                No schedules found.
              </div>
            ) : (
              <div className="space-y-4">
                {schedules.map((schedule) => (
                  <div key={schedule.schedule_id || schedule.template_id} className="rounded-2xl border border-slate-200 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm text-slate-500">Schedule ID</p>
                        <p className="font-medium text-slate-900">{schedule.schedule_id || '—'}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => deleteSchedule(schedule.schedule_id)}
                        className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 hover:bg-red-100"
                      >
                        Delete
                      </button>
                    </div>
                    <div className="mt-3 grid gap-2 text-sm text-slate-700">
                      <p><span className="font-semibold">Template:</span> {schedule.template_id || '—'}</p>
                      <p><span className="font-semibold">Type:</span> {schedule.schedule_type || '—'}</p>
                      <p><span className="font-semibold">Delivery:</span> {schedule.delivery_method || '—'}</p>
                      <p><span className="font-semibold">Start date:</span> {schedule.start_date || '—'}</p>
                      <p><span className="font-semibold">Frequency:</span> {schedule.frequency ?? '—'}</p>
                      <p><span className="font-semibold">Status:</span> {schedule.status || '—'}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-4">
              <div>
                <h4 className="text-lg font-semibold text-slate-900">PayPal Report Verification</h4>
                <p className="text-sm text-gray-600">
                  Run sandbox and live checks for authentication, transaction search, and schedule retrieval.
                </p>
              </div>
              <button
                type="button"
                disabled={testLoading}
                onClick={runReportTests}
                className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm text-white hover:bg-green-700 disabled:opacity-50"
              >
                {testLoading ? 'Running tests...' : 'Run report tests'}
              </button>
            </div>

            {testError && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                <FaExclamationTriangle className="inline mr-2" /> {testError}
              </div>
            )}

            {testResult && (
              <div className="space-y-4">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center gap-2 text-slate-900 text-sm font-semibold">
                    <FaCheckCircle className="text-green-600" /> Authentication
                  </div>
                  <div className="mt-2 text-sm text-slate-700">
                    <p>Mode: {testResult.authResult?.mode || 'unknown'}</p>
                    <p>Base URL: {testResult.authResult?.baseUrl || 'unknown'}</p>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center gap-2 text-slate-900 text-sm font-semibold">
                    <FaCheckCircle className="text-green-600" /> Transaction Search
                  </div>
                  <div className="mt-2 text-sm text-slate-700">
                    <p>Recent transactions returned: {testResult.transactionResult?.recentTransactions ?? 'N/A'}</p>
                    <p>Total items: {testResult.transactionResult?.totalItems ?? 'N/A'}</p>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center gap-2 text-slate-900 text-sm font-semibold">
                    <FaCheckCircle className="text-green-600" /> Schedule API
                  </div>
                  <div className="mt-2 text-sm text-slate-700">
                    <p>Status: {testResult.scheduleResult?.ok ? 'Available' : 'Unavailable'}</p>
                    {testResult.scheduleResult?.count !== undefined && (
                      <p>Schedule count: {testResult.scheduleResult.count}</p>
                    )}
                    {testResult.scheduleResult?.error && (
                      <p className="text-red-700">{testResult.scheduleResult.error}</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
