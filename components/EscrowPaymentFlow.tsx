'use client'

import React, { useState } from 'react'
import { FaLock, FaExclamationTriangle, FaSpinner } from 'react-icons/fa'
import { useRouter } from 'next/navigation'

interface EscrowPaymentFlowProps {
  orderId: string
  quoteAmount: number
  clientId: string
  onPaymentAuthorized?: (data: any) => void
  disabled?: boolean
}

export default function EscrowPaymentFlow({
  orderId,
  quoteAmount,
  clientId,
  onPaymentAuthorized,
  disabled = false,
}: EscrowPaymentFlowProps) {
  const [step, setStep] = useState<'idle' | 'creating' | 'approving' | 'authorized' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const [paypalOrderId, setPaypalOrderId] = useState('')
  const [approveUrl, setApproveUrl] = useState('')
  const router = useRouter()

  const buildCurrentReturnUrl = () => {
    const url = new URL(window.location.href)
    url.searchParams.delete('token')
    url.searchParams.delete('PayerID')
    url.searchParams.delete('paymentId')
    return url.toString()
  }

  const handleCreateOrder = async () => {
    try {
      setStep('creating')
      setErrorMessage('')

      const returnUrl = buildCurrentReturnUrl()
      const cancelUrl = returnUrl
      console.debug('PayPal create order request', { orderId, returnUrl, cancelUrl })

      const response = await fetch('/api/paypal/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, returnUrl, cancelUrl }),
      })

      const data = await response.json()
      console.debug('PayPal create order response', data)
      
      if (!response.ok) {
        const errorMsg = typeof data.error === 'string' 
          ? data.error 
          : data.error?.message 
          ? String(data.error.message) 
          : data.error 
            ? JSON.stringify(data.error) 
            : 'Failed to create PayPal order'
        throw new Error(errorMsg)
      }

      setPaypalOrderId(data.orderID)
      const approvalLink = data.approveUrl
      
      // Only use the approve link if it's a valid URL, otherwise show error
      if (approvalLink && typeof approvalLink === 'string' && approvalLink.startsWith('http')) {
        setApproveUrl(approvalLink)
        setStep('approving')
      } else {
        throw new Error('PayPal did not return an approval URL. Please try again.')
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : typeof err === 'string' ? err : 'Unknown error'
      setErrorMessage(msg || 'Failed to create order')
      setStep('error')
    }
  }

  const handleReturnFromPayPal = async (paypalOrderIdFromReturn: string) => {
    console.debug('Handling PayPal return', { paypalOrderIdFromReturn, storedPaypalOrderId: paypalOrderId })
    try {
      setStep('approving')
      setErrorMessage('')

      const requestBody = {
        orderId,
        paypalOrderId: paypalOrderIdFromReturn || paypalOrderId,
      }
      console.debug('Authorize request body:', requestBody)
      
      const response = await fetch('/api/paypal/authorize-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      })

      const data = await response.json()
      console.debug('PayPal authorize-order response:', JSON.stringify(data, null, 2))

      if (!response.ok) {
        // Log the actual error object for debugging
        console.error('Authorize response not OK:', { status: response.status, data })
        // Extract error message safely - ensure we always return a string
        let errorMsg = 'Failed to authorize payment'
        if (data?.error) {
          if (typeof data.error === 'string') {
            errorMsg = data.error
          } else if (typeof data.error === 'object') {
            const msg = data.error.message || data.error.name || data.error.details
            errorMsg = typeof msg === 'string' ? msg : JSON.stringify(data.error)
          }
        }
        throw new Error(String(errorMsg))
      }

      setStep('authorized')
      if (onPaymentAuthorized) {
        onPaymentAuthorized(data)
      }

      // Hard refresh to get fresh server-side data after payment
      setTimeout(() => {
        window.location.reload()
      }, 1500)
    } catch (err: any) {
      // Better error handling - always convert to string
      let msg = 'Unknown error occurred'
      if (err instanceof Error) {
        msg = err.message || 'Unknown error'
      } else if (typeof err === 'string') {
        msg = err
      } else if (err) {
        try {
          msg = JSON.stringify(err)
        } catch {
          msg = String(err)
        }
      }
      console.error('PayPal return error:', msg, err)
      setErrorMessage(msg)
      setStep('error')
    }
  }

  // Check for PayPal return token in URL (runs on mount to handle return from PayPal)
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const token = params.get('token')
    const payerId = params.get('PayerID')
    
    // PayPal may return with either 'token' or 'PayerID' depending on the flow
    const paypalReturnToken = token || payerId
    
    console.debug('PayPal return check:', { token, payerId, paypalReturnToken, step })
    
    if (paypalReturnToken && step === 'idle') {
      // Clean up URL to remove token parameter (prevents re-processing on refresh)
      const url = new URL(window.location.href)
      url.searchParams.delete('token')
      url.searchParams.delete('PayerID')
      url.searchParams.delete('paymentId')
      window.history.replaceState({}, document.title, url.toString())
      
      handleReturnFromPayPal(paypalReturnToken)
    }
    // Intentionally only run on mount - do not include 'step' in deps
  }, [])

  return (
    <div className="rounded-lg border-2 border-purple-200 bg-purple-50 p-6">
      <div className="flex items-start gap-3 mb-4">
        <FaLock className="text-purple-600 text-xl mt-1 flex-shrink-0" />
        <div>
          <h3 className="text-lg font-bold text-gray-800">Secure Payment with Escrow</h3>
          <p className="text-sm text-gray-600 mt-1">
            Funds are held securely until work is completed and approved.
          </p>
        </div>
      </div>

      {/* Amount Summary */}
      <div className="bg-white rounded-lg p-4 mb-4 border border-purple-200">
        <div className="flex justify-between items-center">
          <span className="text-gray-700 font-medium">Order Amount</span>
          <span className="text-2xl font-bold text-purple-600">${quoteAmount.toFixed(2)}</span>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          This amount will be held in escrow. You&apos;ll approve release as milestones are completed.
        </p>
      </div>

      {/* Step States */}
      {(step === 'idle' || step === 'creating' || step === 'error') && (
        <>
          {step === 'error' && (
            <div className="mb-4 p-3 bg-red-100 border border-red-300 rounded-lg flex gap-2">
              <FaExclamationTriangle className="text-red-600 text-lg flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-red-800">Payment Error</p>
                <p className="text-sm text-red-700">{errorMessage}</p>
              </div>
            </div>
          )}

          <button
            onClick={handleCreateOrder}
            disabled={disabled || step === 'creating'}
            className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors"
          >
            {step === 'creating' && <FaSpinner className="animate-spin" />}
            {step === 'creating' ? 'Creating Secure Payment...' : 'Authorize Payment'}
          </button>
        </>
      )}

      {step === 'approving' && (
        <>
          {approveUrl ? (
            <>
              <p className="text-sm text-gray-700 mb-3">
                You&apos;ll be redirected to PayPal to approve the payment. Click the button below to continue.
              </p>
              <button
                type="button"
                onClick={() => {
                  window.location.href = approveUrl
                }}
                className="block w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg text-center transition-colors"
              >
                Continue to PayPal
              </button>
              <p className="text-xs text-gray-500 mt-3">
                ⏳ Waiting for you to approve on PayPal...
              </p>
            </>
          ) : (
            <div className="flex items-center justify-center gap-2 py-3">
              <FaSpinner className="animate-spin text-purple-600" />
              <span className="text-gray-700">Processing payment authorization...</span>
            </div>
          )}
        </>
      )}

      {step === 'authorized' && (
        <div className="p-4 bg-green-100 border border-green-300 rounded-lg">
          <p className="text-sm font-semibold text-green-800 flex items-center gap-2">
            ✓ Payment Authorized
          </p>
          <p className="text-sm text-green-700 mt-2">
            ${quoteAmount.toFixed(2)} is now held in escrow. Work can begin safely.
          </p>
        </div>
      )}

      {/* Info Section */}
      <div className="mt-4 pt-4 border-t border-purple-200">
        <p className="text-xs text-gray-600 mb-2 font-semibold">How Escrow Works:</p>
        <ul className="text-xs text-gray-600 space-y-1">
          <li>✓ Payment is authorized (funds held, not charged yet)</li>
          <li>✓ Freelancer completes work & uploads deliverables</li>
          <li>✓ You review and approve partial or full payment release</li>
          <li>✓ System captures approved amounts to freelancer account</li>
        </ul>
      </div>
    </div>
  )
}
