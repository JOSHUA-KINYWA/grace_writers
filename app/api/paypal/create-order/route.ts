import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createPayPalOrder } from '@/lib/paypal'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const orderId = String(body?.orderId || '').trim()
    if (!orderId) {
      return NextResponse.json({ error: 'Missing orderId' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, client_id, quote_amount, paid_amount, payment_status')
      .eq('id', orderId)
      .maybeSingle()

    if (orderError) throw orderError
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    const { data: clientRecord, error: clientError } = await supabase
      .from('clients')
      .select('id, auth_user_id')
      .eq('id', order.client_id)
      .maybeSingle()

    if (clientError) throw clientError
    if (!clientRecord || clientRecord.auth_user_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const quoteAmount = Number(order.quote_amount ?? 0)
    const paidAmount = Number(order.paid_amount ?? 0)
    const outstanding = Number((quoteAmount - paidAmount).toFixed(2))

    if (!(outstanding > 0)) {
      return NextResponse.json({ error: 'Nothing to pay' }, { status: 400 })
    }

    const payPalOrder = await createPayPalOrder(outstanding.toFixed(2))
    return NextResponse.json({ orderID: payPalOrder.id })
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: error || 'Server error' }, { status: 500 })
  }
}
