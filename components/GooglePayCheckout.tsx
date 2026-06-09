'use client'

import { useEffect, useRef, useState } from 'react'
import { FaGoogle, FaSpinner } from 'react-icons/fa'

declare global {
  interface Window {
    google?: any
    paypal?: any
  }
}

type GooglePayCheckoutProps = {
  orderId: string
  amount: number
  onPaymentComplete?: (result: any) => void
  onError?: (message: string) => void
}

const PAYPAL_CLIENT_ID = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || ''
const PAYPAL_MODE = process.env.NEXT_PUBLIC_PAYPAL_MODE === 'live' ? 'live' : 'sandbox'

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

function getGoogleTransactionInfo(purchaseAmount: string, countryCode: string) {
  const totalAmount = parseFloat(purchaseAmount)
  const subtotal = (totalAmount * 0.9).toFixed(2)
  const tax = (totalAmount * 0.1).toFixed(2)

  return {
    displayItems: [
      {
        label: 'Subtotal',
        type: 'SUBTOTAL',
        price: subtotal,
      },
      {
        label: 'Tax',
        type: 'TAX',
        price: tax,
      },
    ],
    countryCode,
    currencyCode: 'USD',
    totalPriceStatus: 'FINAL',
    totalPrice: purchaseAmount,
    totalPriceLabel: 'Total',
  }
}

function getGooglePaymentDataRequest(purchaseAmount: string, googlePayConfig: any) {
  const {
    allowedPaymentMethods,
    merchantInfo,
    apiVersion,
    apiVersionMinor,
    countryCode,
  } = googlePayConfig || {}

  return {
    apiVersion,
    apiVersionMinor,
    allowedPaymentMethods,
    merchantInfo,
    callbackIntents: ['PAYMENT_AUTHORIZATION'],
    transactionInfo: getGoogleTransactionInfo(purchaseAmount, countryCode || 'US'),
  }
}

function buildPayPalOrderPayload(purchaseAmount: string, returnUrl: string, cancelUrl: string) {
  return {
    intent: 'CAPTURE',
    paymentSource: {
      google_pay: {
        attributes: {
          verification: {
            method: 'SCA_WHEN_REQUIRED',
          },
        },
        experience_context: {
          return_url: returnUrl,
          cancel_url: cancelUrl,
        },
      },
    },
    amount: purchaseAmount,
  }
}

export default function GooglePayCheckout({ orderId, amount, onPaymentComplete, onError }: GooglePayCheckoutProps) {
  const [loading, setLoading] = useState(true)
  const [buttonReady, setButtonReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const buttonContainerRef = useRef<HTMLDivElement>(null)
  const googlePaySessionRef = useRef<any>(null)
  const paymentsClientRef = useRef<any>(null)
  const googlePayConfigRef = useRef<any>(null)

  useEffect(() => {
    let cancelled = false

    async function initialize() {
      if (!PAYPAL_CLIENT_ID) {
        const message = 'Google Pay cannot initialize because PayPal client ID is not configured.'
        setError(message)
        setLoading(false)
        onError?.(message)
        return
      }

      try {
        await loadScript('https://pay.google.com/gp/p/js/pay.js', 'google-pay-js')
        const paypalSdkUrl = PAYPAL_MODE === 'live'
          ? 'https://www.paypal.com/web-sdk/v6/core'
          : 'https://www.sandbox.paypal.com/web-sdk/v6/core'
        await loadScript(paypalSdkUrl, 'paypal-v6-js')

        const paypal = window.paypal
        if (!paypal || typeof paypal.createInstance !== 'function') {
          throw new Error('PayPal v6 SDK is unavailable')
        }

        const sdkInstance = await paypal.createInstance({
          clientId: PAYPAL_CLIENT_ID,
          components: ['googlepay-payments'],
          pageType: 'checkout',
        })

        const googlePaySession = sdkInstance.createGooglePayOneTimePaymentSession()
        const googlePayConfig = await googlePaySession.getGooglePayConfig()

        const paymentsClient = new window.google.payments.api.PaymentsClient({
          environment: PAYPAL_MODE === 'live' ? 'PRODUCTION' : 'TEST',
          paymentDataCallbacks: {
            onPaymentAuthorized: async (paymentData: any) => {
              return await handlePaymentAuthorized(paymentData)
            },
          },
        })

        const isReadyToPay = await paymentsClient.isReadyToPay({
          allowedPaymentMethods: googlePayConfig.allowedPaymentMethods,
          apiVersion: googlePayConfig.apiVersion,
          apiVersionMinor: googlePayConfig.apiVersionMinor,
        })

        if (!isReadyToPay?.result) {
          throw new Error('Google Pay is not available on this device')
        }

        googlePaySessionRef.current = googlePaySession
        paymentsClientRef.current = paymentsClient
        googlePayConfigRef.current = googlePayConfig
        if (!cancelled) {
          setButtonReady(true)
          setLoading(false)
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err)
        if (!cancelled) {
          setError(message)
          setLoading(false)
          onError?.(message)
        }
      }
    }

    initialize()

    return () => {
      cancelled = true
    }
  }, [onError])

  useEffect(() => {
    if (!buttonReady || loading || error) return
    if (!buttonContainerRef.current || !paymentsClientRef.current) return

    const existing = buttonContainerRef.current.querySelector('button')
    if (existing) return

    const button = paymentsClientRef.current.createButton({
      onClick: handleGooglePayButtonClick,
      buttonType: 'long',
      buttonColor: 'default',
    })

    buttonContainerRef.current.appendChild(button)
  }, [buttonReady, loading, error])

  const handleGooglePayButtonClick = async () => {
    if (!paymentsClientRef.current || !googlePayConfigRef.current || !googlePaySessionRef.current) {
      const message = 'Google Pay is not initialized yet.'
      setError(message)
      onError?.(message)
      return
    }

    setError(null)

    try {
      const paymentDataRequest = getGooglePaymentDataRequest(amount.toFixed(2), googlePayConfigRef.current)
      const paymentData = await paymentsClientRef.current.loadPaymentData(paymentDataRequest)

      if (!paymentData || !paymentData.paymentMethodData) {
        throw new Error('Google Pay returned invalid payment data.')
      }

      const returnUrl = window.location.href
      const cancelUrl = window.location.href
      const orderPayload = buildPayPalOrderPayload(amount.toFixed(2), returnUrl, cancelUrl)
      const createResponse = await fetch('/api/paypal/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId,
          intent: 'CAPTURE',
          paymentSource: orderPayload.paymentSource,
          returnUrl,
          cancelUrl,
          enable3DS: true,
          scaMethod: 'SCA_WHEN_REQUIRED',
          paymentSourceType: 'googlepay',
        }),
      })

      const created = await createResponse.json()
      if (!createResponse.ok) {
        throw new Error(created?.error || 'Unable to create Google Pay order')
      }

      const createdOrderId = created.orderID
      const googlePaySession = googlePaySessionRef.current
      const confirmResult = await googlePaySession.confirmOrder({
        orderId: createdOrderId,
        paymentMethodData: paymentData.paymentMethodData,
      })

      if (confirmResult?.status === 'PAYER_ACTION_REQUIRED') {
        throw new Error('Google Pay requires additional payer action before the payment can complete.')
      }

      const captureResponse = await fetch('/api/paypal/capture-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, paypalOrderId: createdOrderId }),
      })

      const captureData = await captureResponse.json()
      if (!captureResponse.ok) {
        throw new Error(captureData?.error || 'Unable to capture Google Pay order')
      }

      onPaymentComplete?.({
        paypalOrderId: createdOrderId,
        captureData,
        confirmResult,
      })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      setError(message)
      onError?.(message)
    }
  }

  const handlePaymentAuthorized = async (paymentData: any) => {
    if (!paymentData) {
      return { transactionState: 'ERROR', error: { message: 'Payment authorization failed.' } }
    }

    return { transactionState: 'SUCCESS' }
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex items-center gap-3 mb-3">
        <div className="rounded-full bg-slate-100 p-2 text-slate-700">
          <FaGoogle className="h-5 w-5" />
        </div>
        <div>
          <h4 className="text-sm font-semibold text-slate-900">Pay with Google Pay</h4>
          <p className="text-xs text-slate-500">Fast checkout via Google Pay and PayPal v6.</p>
        </div>
      </div>
      <div ref={buttonContainerRef} className="min-h-[48px]" />
      {loading && (
        <div className="mt-3 flex items-center gap-2 text-sm text-gray-600">
          <FaSpinner className="animate-spin" /> Initializing Google Pay...
        </div>
      )}
      {error && (
        <div className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}
    </div>
  )
}
