import { NextResponse } from 'next/server'
import { createPayPalOrder } from '@/lib/paypal'
import { getAppUrl } from '@/lib/app-url'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const amount = String(body?.amount || '10.00').trim()
    const currency = String(body?.currency || 'USD').trim().toUpperCase() || 'USD'
    const description = String(body?.description || 'PayPal standalone checkout').trim()
    const returnUrl = String(body?.returnUrl || getAppUrl()).trim()
    const cancelUrl = String(body?.cancelUrl || returnUrl).trim()

    const payPalOrder = await createPayPalOrder({
      amount,
      intent: 'CAPTURE',
      returnUrl,
      cancelUrl,
      purchaseUnit: {
        description,
        breakdown: body?.purchaseUnit?.breakdown || {
          item_total: { currency_code: currency, value: amount },
        },
        shipping: body?.purchaseUnit?.shipping,
        supplementaryData: body?.purchaseUnit?.supplementaryData,
      },
      applicationContext: body?.applicationContext,
    })

    return NextResponse.json(payPalOrder)
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: error || 'Unable to create PayPal order' }, { status: 500 })
  }
}
