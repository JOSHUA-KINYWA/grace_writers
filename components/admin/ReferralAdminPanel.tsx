'use client'

import { useMemo, useState } from 'react'

interface ReferralSettings {
  confirmation_rule: 'paid_only' | 'completed_only' | 'paid_or_completed'
  reward_per_confirmed: number
  reward_currency: string
  updated_at?: string | null
}

interface ReferrerSummary {
  referrerUserId: string
  referrerName: string
  referrerEmail: string
  total: number
  pending: number
  confirmed: number
  invalid: number
}

interface ReferralAdminPanelProps {
  initialSettings: ReferralSettings
  referrerSummaries: ReferrerSummary[]
}

export default function ReferralAdminPanel({ initialSettings, referrerSummaries }: Readonly<ReferralAdminPanelProps>) {
  const [settings, setSettings] = useState<ReferralSettings>(initialSettings)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  const totals = useMemo(() => {
    const confirmed = referrerSummaries.reduce((sum, item) => sum + item.confirmed, 0)
    const pending = referrerSummaries.reduce((sum, item) => sum + item.pending, 0)
    const total = referrerSummaries.reduce((sum, item) => sum + item.total, 0)
    const rewards = confirmed * Number(settings.reward_per_confirmed || 0)
    return { confirmed, pending, total, rewards }
  }, [referrerSummaries, settings.reward_per_confirmed])

  const saveSettings = async () => {
    setSaving(true)
    setSaved(false)
    setError('')
    try {
      const res = await fetch('/api/referrals/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          confirmation_rule: settings.confirmation_rule,
          reward_per_confirmed: settings.reward_per_confirmed,
          reward_currency: settings.reward_currency,
        }),
      })
      if (!res.ok) {
        const text = await res.text()
        let message = 'Failed to save settings'
        try {
          const parsed = JSON.parse(text)
          message = parsed?.error || parsed?.message || message
        } catch {
          message = text || message
        }
        throw new Error(message)
      }
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-gray-200 p-5">
        <h2 className="text-xl font-bold text-gray-900">Referral Confirmation Rules</h2>
        <p className="text-sm text-gray-600 mt-1">
          Define when pending referrals become confirmed and how rewards are calculated.
        </p>

        <div className="grid md:grid-cols-3 gap-4 mt-4">
          <label className="text-sm">
            <span className="block text-gray-700 font-semibold mb-2">Confirmation rule</span>
            <select
              className="w-full rounded-lg border border-gray-300 px-3 py-2"
              value={settings.confirmation_rule}
              onChange={(e) =>
                setSettings((prev) => ({
                  ...prev,
                  confirmation_rule: e.target.value as ReferralSettings['confirmation_rule'],
                }))
              }
            >
              <option value="paid_or_completed">Paid OR completed</option>
              <option value="paid_only">Paid only</option>
              <option value="completed_only">Completed only</option>
            </select>
          </label>

          <label className="text-sm">
            <span className="block text-gray-700 font-semibold mb-2">Reward per confirmed referral</span>
            <input
              type="number"
              min={0}
              step="0.01"
              className="w-full rounded-lg border border-gray-300 px-3 py-2"
              value={settings.reward_per_confirmed}
              onChange={(e) =>
                setSettings((prev) => ({
                  ...prev,
                  reward_per_confirmed: Number(e.target.value || 0),
                }))
              }
            />
          </label>

          <label className="text-sm">
            <span className="block text-gray-700 font-semibold mb-2">Currency</span>
            <input
              type="text"
              maxLength={8}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 uppercase"
              value={settings.reward_currency}
              onChange={(e) =>
                setSettings((prev) => ({
                  ...prev,
                  reward_currency: e.target.value.toUpperCase(),
                }))
              }
            />
          </label>
        </div>

        <div className="mt-4 flex items-center gap-3">
          <button
            type="button"
            onClick={saveSettings}
            disabled={saving}
            className="px-4 py-2 rounded-lg bg-purple-600 text-white hover:bg-purple-700 transition disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save settings'}
          </button>
          {saved && <span className="text-sm text-green-700 font-semibold">Saved</span>}
          {error && <span className="text-sm text-red-700">{error}</span>}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500 font-semibold">Total tracked</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{totals.total}</p>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <p className="text-xs uppercase tracking-wide text-amber-700 font-semibold">Pending</p>
          <p className="text-2xl font-bold text-amber-800 mt-1">{totals.pending}</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <p className="text-xs uppercase tracking-wide text-green-700 font-semibold">Confirmed</p>
          <p className="text-2xl font-bold text-green-800 mt-1">{totals.confirmed}</p>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <p className="text-xs uppercase tracking-wide text-blue-700 font-semibold">Reward estimate</p>
          <p className="text-2xl font-bold text-blue-800 mt-1">
            {settings.reward_currency} {totals.rewards.toFixed(2)}
          </p>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-200">
          <h3 className="font-bold text-gray-900">Referrer Performance</h3>
        </div>
        {referrerSummaries.length === 0 ? (
          <div className="px-5 py-8 text-sm text-gray-500">No referral records yet.</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {referrerSummaries.map((row) => {
              const reward = row.confirmed * Number(settings.reward_per_confirmed || 0)
              return (
                <div key={row.referrerUserId} className="px-5 py-4 flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-gray-900 truncate">{row.referrerName || 'Referrer'}</p>
                    <p className="text-xs text-gray-500 truncate">{row.referrerEmail || row.referrerUserId}</p>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="px-2 py-1 rounded-full bg-slate-100 text-slate-700 font-semibold">Total {row.total}</span>
                    <span className="px-2 py-1 rounded-full bg-amber-100 text-amber-800 font-semibold">Pending {row.pending}</span>
                    <span className="px-2 py-1 rounded-full bg-green-100 text-green-800 font-semibold">Confirmed {row.confirmed}</span>
                    <span className="px-2 py-1 rounded-full bg-blue-100 text-blue-800 font-semibold">
                      {settings.reward_currency} {reward.toFixed(2)}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

