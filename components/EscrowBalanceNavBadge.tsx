'use client'

import { useEffect, useState } from 'react'
import { FaWallet } from 'react-icons/fa'

type EscrowSummary = {
  balance: number
  count: number
}

type EscrowBalanceNavBadgeProps = {
  compact?: boolean
}

export default function EscrowBalanceNavBadge({ compact = false }: EscrowBalanceNavBadgeProps) {
  const [summary, setSummary] = useState<EscrowSummary | null>(null)

  useEffect(() => {
    let active = true

    async function loadBalance() {
      try {
        const response = await fetch('/api/escrow-balance', { cache: 'no-store' })
        if (!response.ok || !active) return

        const data = await response.json()
        setSummary({
          balance: Number(data.balance ?? 0),
          count: Number(data.count ?? 0),
        })
      } catch {
        if (active) setSummary(null)
      }
    }

    loadBalance()
    const interval = window.setInterval(loadBalance, 30000)
    window.addEventListener('focus', loadBalance)

    return () => {
      active = false
      window.clearInterval(interval)
      window.removeEventListener('focus', loadBalance)
    }
  }, [])

  if (!summary) return null

  const orderLabel = `${summary.count} escrow order${summary.count === 1 ? '' : 's'}`

  return (
    <div
      title={`Active escrow balance: $${summary.balance.toFixed(2)} across ${orderLabel}`}
      className="inline-flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 ring-1 ring-emerald-200"
    >
      <FaWallet className="shrink-0" />
      {!compact && <span>Escrow</span>}
      <span>${summary.balance.toFixed(2)}</span>
    </div>
  )
}
