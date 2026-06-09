'use client'

import React, { useState, useEffect } from 'react'
import { FaSlidersH, FaCheck, FaExclamationTriangle, FaSpinner, FaTimes } from 'react-icons/fa'
import { useRouter } from 'next/navigation'

interface ReleasePaymentModalProps {
  orderId: string
  authorizationId: string
  authorizedAmount: number
  capturedAmount: number
  isOpen: boolean
  onClose: () => void
  onSuccess?: (data: any) => void
}

export default function ReleasePaymentModal({
  orderId,
  authorizationId,
  authorizedAmount,
  capturedAmount,
  isOpen,
  onClose,
  onSuccess,
}: ReleasePaymentModalProps) {
  const [releaseAmount, setReleaseAmount] = useState<number>(0)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const router = useRouter()

  const remainingInEscrow = Math.max(0, authorizedAmount - capturedAmount)

  useEffect(() => {
    if (isOpen) {
      setReleaseAmount(parseFloat(remainingInEscrow.toFixed(2)))
    }
  }, [isOpen, remainingInEscrow])

  const handleRelease = async () => {
    if (releaseAmount <= 0) {
      setError('Please select an amount to release')
      return
    }

    try {
      setIsLoading(true)
      setError('')

      const response = await fetch('/api/paypal/release-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId,
          authorizationId,
          amountToRelease: releaseAmount.toFixed(2),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to release payment')
      }

      setSuccess(true)
      if (onSuccess) {
        onSuccess(data)
      }

      // Close modal and refresh after 2 seconds
      setTimeout(() => {
        onClose()
        router.refresh()
      }, 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to release payment')
    } finally {
      setIsLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <FaSlidersH className="text-purple-600 text-lg" />
            <h2 className="text-xl font-bold text-gray-800">Release Payment</h2>
          </div>
          <button
            onClick={onClose}
            disabled={isLoading || success}
            className="text-gray-500 hover:text-gray-700 disabled:text-gray-300"
          >
            <FaTimes />
          </button>
        </div>

        {!success ? (
          <>
            {/* Balance Info */}
            <div className="mb-4 p-3 bg-gray-100 rounded-lg">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600">Remaining in Escrow</span>
                <span className="font-bold text-gray-900">${remainingInEscrow.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Already Released</span>
                <span className="font-bold text-green-600">${capturedAmount.toFixed(2)}</span>
              </div>
            </div>

            {/* Amount Display */}
            <div className="mb-4 p-4 bg-purple-50 border-2 border-purple-200 rounded-lg">
              <p className="text-xs text-gray-600 mb-1">Release Amount</p>
              <p className="text-3xl font-bold text-purple-600">${releaseAmount.toFixed(2)}</p>
              <p className="text-xs text-gray-500 mt-1">Approving the full remaining escrow balance</p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-4 p-3 bg-red-100 border border-red-300 rounded-lg flex gap-2">
                <FaExclamationTriangle className="text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {/* Info */}
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700">
              <p>
                <strong>Note:</strong> Once you approve this release, ${releaseAmount.toFixed(2)} will be captured from escrow and sent to the freelancer&apos;s account.
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={onClose}
                disabled={isLoading}
                className="flex-1 py-2 px-4 border-2 border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 disabled:bg-gray-50 disabled:text-gray-400 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleRelease}
                disabled={isLoading || releaseAmount <= 0}
                className="flex-1 py-2 px-4 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white font-semibold rounded-lg flex items-center justify-center gap-2 transition-colors"
              >
                {isLoading && <FaSpinner className="animate-spin" />}
                {isLoading ? 'Processing...' : 'Release Payment'}
              </button>
            </div>
          </>
        ) : (
          <div className="p-6 text-center">
            <div className="mb-4 text-4xl text-green-500">
              <FaCheck />
            </div>
            <p className="text-lg font-bold text-gray-800 mb-2">Payment Released!</p>
            <p className="text-sm text-gray-600">
              ${releaseAmount.toFixed(2)} has been captured from escrow and sent to the freelancer.
            </p>
            {remainingInEscrow - releaseAmount > 0 && (
              <p className="text-xs text-gray-500 mt-3">
                ${(remainingInEscrow - releaseAmount).toFixed(2)} remains in escrow.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
