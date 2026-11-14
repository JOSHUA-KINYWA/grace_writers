import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { capturePayPalOrder } from '@/lib/paypal'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const orderId = String(body?.orderId || '').trim()
    const paypalOrderId = String(body?.paypalOrderId || '').trim()

    if (!orderId || !paypalOrderId) {
      return NextResponse.json({ error: 'Missing orderId or paypalOrderId' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, client_id, quote_amount, paid_amount, payment_status, paypal_order_id')
      .eq('id', orderId)
      .maybeSingle()

    if (orderError) throw orderError
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    const { data: clientRecord, error: clientError } = await supabase
      .from('clients')
      .select('id, auth_user_id, email')
      .eq('id', order.client_id)
      .maybeSingle()

    if (clientError) throw clientError
    const currentUserEmail = String(user.email || '').trim().toLowerCase()
    const clientEmail = String(clientRecord?.email || '').trim().toLowerCase()
    const clientMatchesUser =
      clientRecord?.auth_user_id === user.id ||
      (!clientRecord?.auth_user_id && clientEmail && currentUserEmail && clientEmail === currentUserEmail)

    if (!clientRecord || !clientMatchesUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    if (!order.paypal_order_id || order.paypal_order_id !== paypalOrderId) {
      return NextResponse.json({ error: 'PayPal order does not match this order' }, { status: 409 })
    }

    const captureResponse = await capturePayPalOrder(paypalOrderId)
    const captureStatus = String(captureResponse?.purchase_units?.[0]?.payments?.captures?.[0]?.status || '').toUpperCase()
    if (captureStatus !== 'COMPLETED') {
      return NextResponse.json({ error: `PayPal capture is not completed (${captureStatus || 'unknown'})` }, { status: 409 })
    }
    const captureAmount = Number(
      captureResponse?.purchase_units?.[0]?.payments?.captures?.[0]?.amount?.value || 0
    )

    if (!(captureAmount > 0)) {
      return NextResponse.json({ error: 'Unable to determine capture amount' }, { status: 500 })
    }

    const currentPaid = Number(order.paid_amount ?? 0)
    const nextPaidAmount = Number((currentPaid + captureAmount).toFixed(2))
    const quoteAmount = Number(order.quote_amount ?? 0)
    const paymentStatus = quoteAmount > 0 && nextPaidAmount >= quoteAmount ? 'paid' : 'partial'

    const { error: updateError } = await supabase
      .from('orders')
      .update({ paid_amount: nextPaidAmount, payment_status: paymentStatus })
      .eq('id', orderId)

    if (updateError) throw updateError

    return NextResponse.json({ ok: true, paidAmount: nextPaidAmount, paymentStatus })
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: error || 'Server error' }, { status: 500 })
  }
}
