import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { authorizePayPalOrder, getPayPalOrder } from '@/lib/paypal'

function extractAuthorization(paypalOrder: any) {
  const authorization = paypalOrder?.purchase_units?.[0]?.payments?.authorizations?.[0]
  return {
    authorizationId: String(authorization?.id || '').trim(),
    authorizedAmount: Number(authorization?.amount?.value || 0),
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const orderId = String(body?.orderId || '').trim()
    const paypalOrderId = String(body?.paypalOrderId || '').trim()

    console.log('Authorize request:', { orderId, paypalOrderId })

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
      .select('id, client_id, quote_amount, paid_amount, payment_status, paypal_authorization_id')
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

    // Check if already authorized
    if (order.paypal_authorization_id) {
      return NextResponse.json({ 
        ok: true, 
        paymentStatus: order.payment_status || 'unpaid',
        paypalOrderId,
        authorizationId: order.paypal_authorization_id,
        authorizedAmount: Number(order.authorized_amount || 0),
        escrowStatus: order.escrow_status || 'authorized',
        message: 'Payment already authorized.'
      })
    }

    let authorizeResponse: any
    try {
      authorizeResponse = await authorizePayPalOrder(paypalOrderId)
    } catch (authorizeError: any) {
      const message = String(authorizeError?.message || authorizeError || '')
      if (!/semantically incorrect|business validation|UNPROCESSABLE/i.test(message)) {
        throw authorizeError
      }
      authorizeResponse = await getPayPalOrder(paypalOrderId)
    }
    console.log('PayPal authorize response:', JSON.stringify(authorizeResponse, null, 2))
    
    const { authorizationId, authorizedAmount } = extractAuthorization(authorizeResponse)

    if (!authorizationId) {
      return NextResponse.json({ error: 'Unable to determine PayPal authorization ID' }, { status: 500 })
    }

    const { error: updateError } = await supabase
      .from('orders')
      .update({
        payment_status: 'unpaid',
        paypal_order_id: paypalOrderId,
        paypal_authorization_id: authorizationId,
        authorized_amount: authorizedAmount,
        escrow_status: 'authorized',
      })
      .eq('id', orderId)

    if (updateError) throw updateError

    return NextResponse.json({ 
      ok: true, 
      paymentStatus: 'unpaid', 
      paypalOrderId,
      authorizationId,
      authorizedAmount: authorizedAmount,
      escrowStatus: 'authorized',
      message: 'Funds authorized and held in escrow. Awaiting order completion.'
    })
  } catch (err: any) {
    const error = typeof err?.message === 'string' 
      ? err.message 
      : typeof err?.message === 'object'
        ? JSON.stringify(err.message)
        : typeof err === 'string' 
          ? err 
          : err?.cause?.message || 'Unknown error'
    console.error('PayPal authorize-order error:', error, err)
    return NextResponse.json({ error }, { status: 500 })
  }
}
