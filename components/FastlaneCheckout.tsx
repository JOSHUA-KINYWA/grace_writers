'use client'

import { useEffect, useRef, useState } from 'react'
import { FaCreditCard, FaSpinner } from 'react-icons/fa'

declare global {
  interface Window {
    paypal?: any
  }
}

type FastlaneCheckoutProps = {
  orderId: string
  amount: number
  currencyCode?: string
  onPaymentComplete?: (result: any) => void
  onError?: (message: string) => void
}

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

export default function FastlaneCheckout({
  orderId,
  amount,
  currencyCode = 'USD',
  onPaymentComplete,
  onError,
}: FastlaneCheckoutProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [isReady, setIsReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeStep, setActiveStep] = useState<'email' | 'member' | 'guest' | 'ready'>('email')
  const [email, setEmail] = useState('')
  const [shippingAddress, setShippingAddress] = useState<any>(null)
  const fastlaneRef = useRef<any>(null)
  const paymentComponentRef = useRef<any>(null)
  const watermarkRef = useRef<HTMLDivElement | null>(null)
  const cardContainerRef = useRef<HTMLDivElement | null>(null)
  const paymentContainerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    let cancelled = false

    async function initFastlane() {
      setError(null)

      try {
        await loadScript(PAYPAL_SDK_URL, 'paypal-v6-core')

        const paypal = window.paypal
        if (!paypal || typeof paypal.createInstance !== 'function') {
          throw new Error('PayPal v6 SDK is unavailable.')
        }

        const tokenResponse = await fetch('/api/paypal/auth/browser-safe-client-token')
        const tokenPayload = await tokenResponse.json()
        if (!tokenResponse.ok) {
          throw new Error(tokenPayload?.error || 'Unable to fetch browser-safe client token.')
        }

        const clientToken = tokenPayload?.accessToken
        if (!clientToken) {
          throw new Error('PayPal browser-safe client token is missing.')
        }

        const sdkInstance = await paypal.createInstance({
          clientToken,
          pageType: 'checkout',
          clientMetadataId: typeof window?.crypto?.randomUUID === 'function' ? window.crypto.randomUUID() : `uid-${Date.now()}`,
          components: ['fastlane'],
        })

        const fastlane = await sdkInstance.createFastlane()
        fastlaneRef.current = fastlane

        const watermark = await fastlane.FastlaneWatermarkComponent({
          includeAdditionalInfo: true,
        })

        watermark.render('#watermark-container')

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

    initFastlane()

    return () => {
      cancelled = true
    }
  }, [onError])

  const createPayPalOrder = async (paymentToken: string) => {
    const response = await fetch('/api/paypal/create-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderId,
        paymentSource: {
          card: {
            single_use_token: paymentToken,
          },
        },
        purchaseUnit: {
          amount: {
            currencyCode,
            value: amount.toFixed(2),
          },
          breakdown: {
            item_total: {
              currency_code: currencyCode,
              value: amount.toFixed(2),
            },
          },
        },
        intent: 'CAPTURE',
      }),
    })

    const data = await response.json()
    if (!response.ok) {
      throw new Error(data?.error || 'Unable to create PayPal order.')
    }
    return data.orderID || data.id || data.orderId
  }

  const createOrder = async () => {
    if (!paymentComponentRef.current) {
      throw new Error('Fastlane payment component is not initialized.')
    }

    const paymentTokenResponse = await paymentComponentRef.current.getPaymentToken()
    const paymentToken = paymentTokenResponse?.id || paymentTokenResponse?.paymentToken || paymentTokenResponse?.token

    if (!paymentToken) {
      throw new Error('Failed to receive a payment token from Fastlane.')
    }

    const createdOrderId = await createPayPalOrder(paymentToken)
    return createdOrderId
  }

  const submitPayPalOrder = async () => {
    if (!paymentComponentRef.current) {
      setError('Payment component is not available.')
      return
    }

    try {
      setError(null)
      const orderIdResult = await createOrder()
      if (!orderIdResult) {
        throw new Error('PayPal order creation returned an invalid order ID.')
      }

      let confirmResult: any
      if (typeof paymentComponentRef.current.confirmOrder === 'function') {
        confirmResult = await paymentComponentRef.current.confirmOrder({ orderId: orderIdResult })
      }

      if (confirmResult?.state === 'succeeded' || confirmResult?.state === 'completed' || !confirmResult) {
        const captureResponse = await fetch('/api/paypal/capture-order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId, paypalOrderId: orderIdResult }),
        })
        const captureData = await captureResponse.json()
        if (!captureResponse.ok) {
          throw new Error(captureData?.error || 'Unable to capture Fastlane payment.')
        }
        onPaymentComplete?.({ paypalOrderId: orderIdResult, state: 'succeeded', captureData })
      } else if (confirmResult?.state === 'failed') {
        throw new Error(confirmResult?.data?.message || 'PayPal Fastlane confirmation failed.')
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      setError(message)
      onError?.(message)
    }
  }

  const renderGuestExperience = async () => {
    if (!fastlaneRef.current) {
      throw new Error('Fastlane is not initialized.')
    }

    const paymentComponent = await fastlaneRef.current.FastlanePaymentComponent({})
    await paymentComponent.render('#card-container')
    paymentComponentRef.current = paymentComponent
    setActiveStep('ready')
  }

  const renderMemberExperience = async (profileData: any) => {
    if (!fastlaneRef.current) {
      throw new Error('Fastlane is not initialized.')
    }

    setShippingAddress(profileData?.shippingAddress ?? null)

    const paymentComponent = await fastlaneRef.current.FastlanePaymentComponent({
      options: {},
      shippingAddress: profileData?.shippingAddress,
    })

    await paymentComponent.render('#payment-container')
    paymentComponentRef.current = paymentComponent
    setActiveStep('ready')
  }

  const handleEmailSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)

    if (!email.trim()) {
      setError('Please enter your email address.')
      return
    }

    if (!fastlaneRef.current) {
      setError('Fastlane is not initialized. Please refresh the page.')
      return
    }

    try {
      const lookupResult = await fastlaneRef.current.identity.lookupCustomerByEmail(email.trim())
      const customerContextId = lookupResult?.customerContextId

      if (customerContextId) {
        const authResult = await fastlaneRef.current.identity.triggerAuthenticationFlow(customerContextId)
        if (authResult?.authenticationState === 'succeeded') {
          await renderMemberExperience(authResult.profileData)
          setActiveStep('member')
          return
        }
      }

      await renderGuestExperience()
      setActiveStep('guest')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      setError(message)
      onError?.(message)
      await renderGuestExperience()
      setActiveStep('guest')
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex items-center gap-3 mb-4">
        <div className="rounded-full bg-slate-100 p-2 text-slate-700">
          <FaCreditCard className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-slate-900">PayPal Fastlane</h3>
          <p className="text-xs text-slate-500">Fastlane quick checkout for returning customers and guests.</p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm text-slate-600 mb-2">Enter your email to determine if you&apos;re a Fastlane member.</p>
          <form onSubmit={handleEmailSubmit} className="flex flex-col gap-3">
            <div>
              <label htmlFor="fastlane-email" className="sr-only">Email</label>
              <input
                id="fastlane-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm shadow-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                disabled={isLoading}
              />
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {isLoading ? <FaSpinner className="animate-spin" /> : null}
              {isLoading ? 'Loading...' : 'Lookup email'}
            </button>
          </form>
        </div>

        <div id="watermark-container" ref={watermarkRef} className="min-h-[70px]" />

        {shippingAddress ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-900">Shipping address</p>
            <pre className="whitespace-pre-wrap text-sm text-slate-700">{JSON.stringify(shippingAddress, null, 2)}</pre>
          </div>
        ) : null}

        <div id="payment-container" ref={paymentContainerRef} className="min-h-[220px] rounded-xl border border-slate-200 bg-slate-50 p-4" />
        <div id="card-container" ref={cardContainerRef} className="min-h-[220px] rounded-xl border border-slate-200 bg-slate-50 p-4" />

        <button
          type="button"
          onClick={submitPayPalOrder}
          disabled={!isReady || activeStep === 'email' || Boolean(error)}
          className="w-full rounded-lg bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
        >
          {isLoading || activeStep === 'email' ? 'Prepare Fastlane' : 'Submit Fastlane payment'}
        </button>

        {error ? (
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}
      </div>
    </div>
  )
}
