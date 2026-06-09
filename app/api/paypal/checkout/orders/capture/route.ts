import { NextResponse } from 'next/server'
import { capturePayPalOrder } from '@/lib/paypal'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const paypalOrderId = String(body?.paypalOrderId || body?.orderId || '').trim()

    if (!paypalOrderId) {
      return NextResponse.json({ error: 'Missing paypalOrderId' }, { status: 400 })
    }

    const captureData = await capturePayPalOrder(paypalOrderId)
    return NextResponse.json(captureData)
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: error || 'Unable to capture PayPal order' }, { status: 500 })
  }
}
