'use client'

import React from 'react'
import { FaLock, FaCheck, FaClock } from 'react-icons/fa'

interface EscrowBalanceDisplayProps {
  authorizedAmount: number
  capturedAmount: number
  approvedReleaseAmount: number
  escrowStatus: string
  compact?: boolean
}

export default function EscrowBalanceDisplay({
  authorizedAmount,
  capturedAmount,
  approvedReleaseAmount,
  escrowStatus,
  compact = false,
}: EscrowBalanceDisplayProps) {
  const remainingInEscrow = Math.max(0, authorizedAmount - capturedAmount)
  const percentCaptured = authorizedAmount > 0 ? (capturedAmount / authorizedAmount) * 100 : 0

  const statusConfig = {
    pending: { label: 'Awaiting Payment', color: 'bg-yellow-50', borderColor: 'border-yellow-200', textColor: 'text-yellow-700' },
    authorized: { label: 'Held in Escrow', color: 'bg-blue-50', borderColor: 'border-blue-200', textColor: 'text-blue-700' },
    partial: { label: 'Partially Released', color: 'bg-purple-50', borderColor: 'border-purple-200', textColor: 'text-purple-700' },
    released: { label: 'Fully Released', color: 'bg-green-50', borderColor: 'border-green-200', textColor: 'text-green-700' },
  }

  const current = statusConfig[escrowStatus as keyof typeof statusConfig] || statusConfig.pending

  if (compact) {
    return (
      <div className={`p-3 rounded-lg ${current.color} border ${current.borderColor}`}>
        <div className="flex items-center gap-2">
          <FaLock className={current.textColor} />
          <div>
            <p className={`text-sm font-semibold ${current.textColor}`}>{current.label}</p>
            <p className="text-xs text-gray-600">
              ${capturedAmount.toFixed(2)} of ${authorizedAmount.toFixed(2)} released
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`w-full rounded-lg border-2 ${current.borderColor} ${current.color} p-6 min-w-0`}>
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-bold text-gray-800">Escrow Balance</h3>
          <span className={`text-sm font-semibold px-3 py-1 rounded-full ${current.color} ${current.textColor}`}>
            {current.label}
          </span>
        </div>

        {/* Progress Bar */}
        <div className="mt-4">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-700">Release Progress</span>
            <span className={`font-semibold ${current.textColor}`}>{percentCaptured.toFixed(0)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className="bg-green-500 h-3 rounded-full transition-all duration-300"
              style={{ width: `${percentCaptured}%` }}
            />
          </div>
        </div>
      </div>

      {/* Balance Breakdown */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
        <div className="bg-white rounded-lg p-4 border border-gray-200 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <FaLock className="text-blue-500 text-lg" />
            <span className="text-xs font-semibold text-gray-600 uppercase">Authorized</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">${authorizedAmount.toFixed(2)}</p>
          <p className="text-xs text-gray-500 mt-1">Total held in escrow</p>
        </div>

        <div className="bg-white rounded-lg p-4 border border-gray-200 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <FaCheck className="text-green-500 text-lg" />
            <span className="text-xs font-semibold text-gray-600 uppercase">Captured</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">${capturedAmount.toFixed(2)}</p>
          <p className="text-xs text-gray-500 mt-1">Released to you</p>
        </div>

        <div className="bg-white rounded-lg p-4 border border-gray-200 min-w-0 sm:col-span-2">
          <div className="flex items-center gap-2 mb-2">
            <FaClock className="text-yellow-500 text-lg" />
            <span className="text-xs font-semibold text-gray-600 uppercase">Remaining</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">${remainingInEscrow.toFixed(2)}</p>
          <p className="text-xs text-gray-500 mt-1">Awaiting approval</p>
        </div>
      </div>

      {/* Status Messages */}
      {escrowStatus === 'authorized' && (
        <div className="mt-4 p-3 bg-blue-100 border border-blue-300 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>✓ Payment authorized.</strong> Funds are held securely. Work can proceed while funds remain in escrow.
          </p>
        </div>
      )}

      {escrowStatus === 'partial' && (
        <div className="mt-4 p-3 bg-purple-100 border border-purple-300 rounded-lg">
          <p className="text-sm text-purple-800">
            <strong>⏳ Partial release approved.</strong> ${remainingInEscrow.toFixed(2)} remains in escrow awaiting further approval.
          </p>
        </div>
      )}

      {escrowStatus === 'released' && (
        <div className="mt-4 p-3 bg-green-100 border border-green-300 rounded-lg">
          <p className="text-sm text-green-800">
            <strong>✓ Payment complete!</strong> All authorized funds have been captured and released.
          </p>
        </div>
      )}
    </div>
  )
}
