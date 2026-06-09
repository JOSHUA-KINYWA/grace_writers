'use client'

import { useEffect, useRef, useState } from 'react'
import { FaCreditCard, FaSpinner } from 'react-icons/fa'

declare global {
  interface Window {
    paypal?: any
  }
}

type CardFieldsCheckoutProps = {
  orderId: string
  amount?: number
  currencyCode?: string
  onPaymentComplete?: (result: any) => void
  onError?: (message: string) => void
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

export default function CardFieldsCheckout({
  orderId,
  amount = 10,
  currencyCode = 'USD',
  onPaymentComplete,
  onError,
}: CardFieldsCheckoutProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [isReady, setIsReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitState, setSubmitState] = useState<'idle' | 'submitting' | 'success'>('idle')
  const cardFieldsRef = useRef<{ number?: HTMLDivElement; expiry?: HTMLDivElement; cvv?: HTMLDivElement }>({})
  const sessionRef = useRef<any>(null)

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
          components: ['card-fields'],
          pageType: 'checkout',
        })

        const eligibleMethods = await sdkInstance.findEligibleMethods({ currencyCode })
        const isCardFieldsEligible = typeof eligibleMethods?.isEligible === 'function'
          ? eligibleMethods.isEligible('advanced_cards')
          : Boolean(eligibleMethods)

        if (!isCardFieldsEligible) {
          throw new Error('Card Fields are not available for this browser or account.')
        }

        const cardSession = await sdkInstance.createCardFieldsOneTimePaymentSession()

        const numberField = cardSession.createCardFieldsComponent({
          type: 'number',
          placeholder: 'Card number',
          style: {
            input: {
              fontSize: '16px',
              padding: '12px',
              border: '1px solid #d1d5db',
              borderRadius: '0.5rem',
            },
          },
        })

        const expiryField = cardSession.createCardFieldsComponent({
          type: 'expiry',
          placeholder: 'MM/YY',
          style: {
            input: {
              fontSize: '16px',
              padding: '12px',
              border: '1px solid #d1d5db',
              borderRadius: '0.5rem',
            },
          },
        })

        const cvvField = cardSession.createCardFieldsComponent({
          type: 'cvv',
          placeholder: 'CVV',
          style: {
            input: {
              fontSize: '16px',
              padding: '12px',
              border: '1px solid #d1d5db',
              borderRadius: '0.5rem',
            },
          },
        })

        cardFieldsRef.current.number?.appendChild(numberField)
        cardFieldsRef.current.expiry?.appendChild(expiryField)
        cardFieldsRef.current.cvv?.appendChild(cvvField)

        sessionRef.current = cardSession
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
  }, [currencyCode, onError])

  const createOrder = async () => {
    const returnUrl = window.location.href
    const cancelUrl = window.location.href
    const response = await fetch('/api/paypal/create-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderId,
        intent: 'CAPTURE',
        returnUrl,
        cancelUrl,
      }),
    })
    const data = await response.json()
    if (!response.ok) {
      throw new Error(data?.error || 'Unable to create PayPal order.')
    }
    return data.id || data.orderID || data.orderId
  }

  const captureOrder = async (paypalOrderId: string) => {
    const response = await fetch('/api/paypal/capture-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId, paypalOrderId }),
    })
    const data = await response.json()
    if (!response.ok) {
      throw new Error(data?.error || 'Unable to capture PayPal order.')
    }
    return data
  }

  const handlePay = async () => {
    if (!sessionRef.current) return
    setSubmitState('submitting')
    setError(null)

    try {
      const orderId = await createOrder()
      const response = await sessionRef.current.submit(orderId, {
        billingAddress: {
          postalCode: '95131',
        },
      })

      const { state, data } = response || {}
      switch (state) {
        case 'succeeded': {
          const approvedOrderId = data?.orderId || orderId
          const captureData = await captureOrder(approvedOrderId)
          onPaymentComplete?.({ state, data, orderId: approvedOrderId, captureData })
          setSubmitState('success')
          break
        }
        case 'canceled': {
          onError?.('Authentication was canceled. Please try again.')
          break
        }
        case 'failed': {
          const message = data?.message || 'Card submission failed. Please verify your details.'
          onError?.(message)
          break
        }
        default: {
          onError?.(`Unhandled state: ${state}`)
          break
        }
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      setError(message)
      onError?.(message)
    } finally {
      setSubmitState('idle')
    }
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5">
      <div className="flex items-center gap-3 mb-4">
        <div className="rounded-full bg-slate-100 p-2 text-slate-700">
          <FaCreditCard className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Card Fields — One-Time Payment</h3>
          <p className="text-xs text-slate-500">Enter card details securely with PayPal hosted fields.</p>
        </div>
      </div>

      <div className="space-y-3">
        <div ref={(el) => { cardFieldsRef.current.number = el ?? undefined }} className="card-field min-h-[3rem] rounded-lg border border-slate-200 bg-slate-50 p-2" />
        <div ref={(el) => { cardFieldsRef.current.expiry = el ?? undefined }} className="card-field min-h-[3rem] rounded-lg border border-slate-200 bg-slate-50 p-2" />
        <div ref={(el) => { cardFieldsRef.current.cvv = el ?? undefined }} className="card-field min-h-[3rem] rounded-lg border border-slate-200 bg-slate-50 p-2" />
      </div>

      <button
        type="button"
        onClick={handlePay}
        disabled={!isReady || isLoading || submitState === 'submitting'}
        className="mt-5 w-full rounded-lg bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
      >
        {submitState === 'submitting' ? <FaSpinner className="mr-2 inline-block animate-spin" /> : null}
        {isLoading ? 'Loading card fields...' : submitState === 'submitting' ? 'Processing payment...' : 'Pay securely'}
      </button>

      {error ? (
        <div className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      ) : null}
    </div>
  )
}
