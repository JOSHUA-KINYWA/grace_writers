import { NextResponse } from 'next/server'
import { createPayPalOrder } from '@/lib/paypal'
import { getAppUrl } from '@/lib/app-url'

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const returnUrl = String(body?.returnUrl || getAppUrl()).trim()
    const cancelUrl = String(body?.cancelUrl || returnUrl).trim()

    const sampleAmount = '10.00'
    const payPalOrder = await createPayPalOrder({
      amount: sampleAmount,
      intent: 'CAPTURE',
      returnUrl,
      cancelUrl,
      purchaseUnit: {
        description: 'PayPal standalone guest checkout',
        breakdown: {
          item_total: { currency_code: 'USD', value: sampleAmount },
        },
        shipping: {
          options: [
            {
              id: 'SHIP_FRE',
              label: 'Free shipping',
              type: 'SHIPPING',
              selected: true,
              amount: { currency_code: 'USD', value: '0.00' },
            },
            {
              id: 'SHIP_EXP',
              label: 'Expedited shipping',
              type: 'SHIPPING',
              selected: false,
              amount: { currency_code: 'USD', value: '5.00' },
            },
          ],
        },
      },
    })

    return NextResponse.json(payPalOrder)
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: error || 'Unable to create sample PayPal order' }, { status: 500 })
  }
}
