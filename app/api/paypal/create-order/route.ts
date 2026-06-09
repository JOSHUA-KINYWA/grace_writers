import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createPayPalOrder, buildPayPalCardPaymentSource, PayPalCardVerificationMethod } from '@/lib/paypal'

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

    const quoteAmount = Number(order.quote_amount ?? 0)
    const paidAmount = Number(order.paid_amount ?? 0)
    const outstanding = Number((quoteAmount - paidAmount).toFixed(2))

    if (!(outstanding > 0)) {
      return NextResponse.json({ error: 'Nothing to pay' }, { status: 400 })
    }

    const returnUrl = String(body?.returnUrl || '').trim() || undefined
    const cancelUrl = String(body?.cancelUrl || '').trim() || undefined
    const paymentSource = body?.paymentSource
    const enable3DS = Boolean(body?.enable3DS)
    const scaMethod = String(body?.scaMethod || 'SCA_WHEN_REQUIRED').toUpperCase() as PayPalCardVerificationMethod
    const paymentSourceType = String(body?.paymentSourceType || '').trim().toLowerCase()
    const riskData = body?.riskData
    const purchaseUnit = body?.purchaseUnit
    const applicationContext = body?.applicationContext
    const intent = String(body?.intent || 'AUTHORIZE').toUpperCase() as 'AUTHORIZE' | 'CAPTURE'

    let paymentSourcePayload = paymentSource
    if (!paymentSourcePayload && enable3DS && paymentSourceType === 'card') {
      paymentSourcePayload = buildPayPalCardPaymentSource({
        verificationMethod: scaMethod,
        experienceContext: {
          returnUrl,
          cancelUrl,
        },
      })
    }

    const payPalOrder = await createPayPalOrder({
      amount: outstanding.toFixed(2),
      returnUrl,
      cancelUrl,
      intent,
      paymentSource: paymentSourcePayload ?? undefined,
      riskData: riskData ? riskData : undefined,
      purchaseUnit: purchaseUnit ? purchaseUnit : undefined,
      applicationContext: applicationContext ? applicationContext : undefined,
    })
    await supabase
      .from('orders')
      .update({ paypal_order_id: payPalOrder.id })
      .eq('id', orderId)
      .then(({ error: updateError }) => {
        if (updateError) throw updateError
      })

    const approveUrl = Array.isArray(payPalOrder.links)
      ? payPalOrder.links.find((link: any) => link.rel === 'approve')?.href || ''
      : ''

    return NextResponse.json({ orderID: payPalOrder.id, approveUrl, returnUrl, cancelUrl })
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: error || 'Server error' }, { status: 500 })
  }
}
