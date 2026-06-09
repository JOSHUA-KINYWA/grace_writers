'use client'

import { useEffect, useRef, useState } from 'react'
import { FaCcPaypal, FaSpinner } from 'react-icons/fa'

declare global {
  interface Window {
    paypal?: any
  }
}

type PayPalGuestCheckoutButtonProps = {
  amount?: number
  currencyCode?: string
  disabled?: boolean
  onComplete?: (result: any) => void
  onError?: (message: string) => void
  onCancel?: () => void
}

const PAYPAL_CLIENT_ID = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || ''
const PAYPAL_MODE = process.env.NEXT_PUBLIC_PAYPAL_MODE === 'live' ? 'live' : 'sandbox'
const PAYPAL_SDK_URL = PAYPAL_MODE === 'live'
  ? 'https://www.paypal.com/web-sdk/v6/core'
  : 'https://www.sandbox.paypal.com/web-sdk/v6/core'

function loadScript(src: string, id: string) {
  return new Promise<HTMLScriptElement>((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('Window is not available'))
      return
    }

    const existing = document.getElementById(id) as HTMLScriptElement | null
    if (existing) {
      resolve(existing)
      return
    }

    const script = document.createElement('script')
    script.id = id
    script.src = src
    script.async = true
    script.onload = () => resolve(script)
    script.onerror = () => reject(new Error(`Failed to load ${src}`))
    document.body.appendChild(script)
  })
}

export default function PayPalGuestCheckoutButton({
  amount = 10,
  currencyCode = 'USD',
  disabled = false,
  onComplete,
  onError,
  onCancel,
}: PayPalGuestCheckoutButtonProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [isReady, setIsReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const sessionRef = useRef<any>(null)
  const buttonRef = useRef<HTMLButtonElement | null>(null)

  useEffect(() => {
    let cancelled = false

    async function initialize() {
      if (!PAYPAL_CLIENT_ID) {
        const message = 'PayPal client ID is not configured.'
        setError(message)
        setIsLoading(false)
        onError?.(message)
        return
      }

      try {
        await loadScript(PAYPAL_SDK_URL, 'paypal-v6-core')
        const paypal = window.paypal

        if (!paypal || typeof paypal.createInstance !== 'function') {
          throw new Error('PayPal v6 SDK is unavailable')
        }

        const sdkInstance = await paypal.createInstance({
          clientId: PAYPAL_CLIENT_ID,
          components: ['paypal-guest-payments'],
          pageType: 'checkout',
        })

        const eligibleMethods = await sdkInstance.findEligibleMethods({
          currencyCode,
        })

        if (!eligibleMethods || (Array.isArray(eligibleMethods) && eligibleMethods.length === 0)) {
          throw new Error('PayPal guest payments are not eligible for this browser or configuration.')
        }

        const guestPaymentSession = await sdkInstance.createPayPalGuestOneTimePaymentSession({
          onApprove: handleApprove,
          onCancel: handleCancel,
          onComplete: handleComplete,
          onError: handleError,
          onWarn: handleWarn,
        })

        sessionRef.current = guestPaymentSession
        if (!cancelled) {
          setIsReady(true)
          setIsLoading(false)
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err)
        if (!cancelled) {
          setError(message)
          setIsLoading(false)
          onError?.(message)
        }
      }
    }

    initialize()

    return () => {
      cancelled = true
    }
  }, [currencyCode, onComplete, onError, onCancel])

  const handleError = (data: any) => {
    const message = data?.message || 'PayPal guest checkout failed.'
    setError(String(message))
    onError?.(String(message))
  }

  const handleWarn = (data: any) => {
    const message = data?.message || 'PayPal checkout warning.'
    console.warn('PayPal guest checkout warning:', data)
    onError?.(String(message))
  }

  const handleCancel = () => {
    onCancel?.()
  }

  const handleComplete = (data: any) => {
    onComplete?.(data)
  }

  const handleApprove = async (data: any) => {
    if (!data?.orderId) {
      throw new Error('Missing PayPal order ID in approval payload.')
    }

    const response = await fetch('/api/paypal/checkout/orders/capture', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paypalOrderId: data.orderId }),
    })

    const result = await response.json()
    if (!response.ok) {
      throw new Error(result?.error || 'Unable to capture PayPal order.')
    }

    return result
  }

  const createOrder = async () => {
    const returnUrl = window.location.href
    const cancelUrl = window.location.href

    const response = await fetch('/api/paypal/checkout/orders/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: amount.toFixed(2),
        currency: currencyCode,
        description: 'PayPal standalone guest checkout',
        returnUrl,
        cancelUrl,
        purchaseUnit: {
          breakdown: {
            item_total: { currency_code: currencyCode, value: amount.toFixed(2) },
          },
        },
      }),
    })

    const data = await response.json()
    if (!response.ok) {
      throw new Error(data?.error || 'Unable to create PayPal order.')
    }

    return { orderId: data.id || data.orderID || data.orderId }
  }

  const handleStart = async () => {
    if (disabled || !sessionRef.current) return

    try {
      setError(null)
      await sessionRef.current.start(
        {
          targetElement: buttonRef.current,
          presentationMode: 'auto',
        },
        createOrder
      )
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      setError(message)
      onError?.(message)
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-center gap-3 mb-4">
        <div className="rounded-full bg-slate-100 p-2 text-slate-700">
          <FaCcPaypal className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Pay with card (guest checkout)</h3>
          <p className="text-xs text-slate-500">Standalone PayPal card payments without login.</p>
        </div>
      </div>

      <button
        ref={buttonRef}
        type="button"
        onClick={handleStart}
        disabled={!isReady || isLoading || disabled}
        className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
      >
        {isLoading ? <FaSpinner className="animate-spin" /> : null}
        {isLoading ? 'Initializing...' : 'Pay with card'}
      </button>

      {error ? (
        <div className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      ) : null}
    </div>
  )
}
