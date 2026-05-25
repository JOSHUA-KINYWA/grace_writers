'use client'

import { useCallback, useEffect, useState } from 'react'

type Health = {
  configured: boolean
  provider: string
  fromEmail: string | null
  adminEmail: string | null
  hasApiKey: boolean
  hasSmtpRelay: boolean
  hint: string | null
}

export default function EmailHealthPanel() {
  const [health, setHealth] = useState<Health | null>(null)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/email-health', { cache: 'no-store' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to load')
      setHealth(data)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function sendTest() {
    setSending(true)
    setResult(null)
    setError(null)
    try {
      const res = await fetch('/api/admin/test-email', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Send failed')
      setResult(`Test sent to ${data.to} via ${data.provider}. Check inbox and spam.`)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Send failed')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow p-6 mb-6 border border-slate-200">
      <h3 className="text-xl font-semibold text-gray-900 mb-2">Email (Brevo)</h3>
      <p className="text-sm text-gray-600 mb-4">
        Verify API key and sender after changing credentials in Vercel (.env).
      </p>

      {loading ? (
        <p className="text-sm text-slate-600">Checking configuration…</p>
      ) : health ? (
        <ul className="text-sm space-y-2 mb-4">
          <li>
            <span className="font-medium">Status:</span>{' '}
            {health.configured ? (
              <span className="text-green-700">Configured ({health.provider})</span>
            ) : (
              <span className="text-red-700">Not configured</span>
            )}
          </li>
          <li>
            <span className="font-medium">From (verified sender):</span>{' '}
            {health.fromEmail || '—'}
          </li>
          <li>
            <span className="font-medium">Admin notifications to:</span>{' '}
            {health.adminEmail || '— (set ADMIN_EMAIL)'}
          </li>
          <li>
            <span className="font-medium">Brevo API key:</span>{' '}
            {health.hasApiKey ? 'Set' : 'Missing'}
          </li>
          {health.hint && (
            <li className="text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-3 mt-2">
              {health.hint}
            </li>
          )}
        </ul>
      ) : null}

      {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
      {result && <p className="text-sm text-green-700 mb-3">{result}</p>}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="px-4 py-2 rounded-lg border border-slate-200 text-sm font-medium hover:bg-slate-50 disabled:opacity-50"
        >
          Refresh status
        </button>
        <button
          type="button"
          onClick={sendTest}
          disabled={sending || !health?.configured}
          className="px-4 py-2 rounded-lg bg-purple-600 text-white text-sm font-semibold hover:bg-purple-700 disabled:opacity-50"
        >
          {sending ? 'Sending…' : 'Send test email'}
        </button>
      </div>
    </div>
  )
}
