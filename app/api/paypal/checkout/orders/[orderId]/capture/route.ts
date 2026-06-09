import { NextResponse } from 'next/server'
import { capturePayPalOrder } from '@/lib/paypal'

export async function POST(
  req: Request,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId: routeOrderId } = await params
    const orderId = String(routeOrderId || '').trim()
    if (!orderId) {
      return NextResponse.json({ error: 'Missing orderId' }, { status: 400 })
    }

    const captureData = await capturePayPalOrder(orderId)
    return NextResponse.json(captureData)
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: error || 'Unable to capture PayPal order' }, { status: 500 })
  }
}
