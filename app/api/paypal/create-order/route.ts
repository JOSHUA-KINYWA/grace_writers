import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createPayPalOrder, buildPayPalCardPaymentSource, PayPalCardVerificationMethod } from '@/lib/paypal'
import { getAppUrl } from '@/lib/app-url'

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

    const appOrigin = new URL(getAppUrl()).origin
    const validateRedirect = (value: unknown) => {
      if (!value) return undefined
      const parsed = new URL(String(value))
      if (parsed.origin !== appOrigin) throw new Error('PayPal return and cancel URLs must belong to this application')
      return parsed.toString()
    }
    const returnUrl = validateRedirect(body?.returnUrl)
    const cancelUrl = validateRedirect(body?.cancelUrl)
    const paymentSource = body?.paymentSource
    const enable3DS = Boolean(body?.enable3DS)
    const scaMethod = String(body?.scaMethod || 'SCA_WHEN_REQUIRED').toUpperCase() as PayPalCardVerificationMethod
    const paymentSourceType = String(body?.paymentSourceType || '').trim().toLowerCase()
    const riskData = body?.riskData
    const intent = String(body?.intent || 'AUTHORIZE').toUpperCase() as 'AUTHORIZE' | 'CAPTURE'
    if (intent !== 'AUTHORIZE' && intent !== 'CAPTURE') {
      return NextResponse.json({ error: 'Invalid payment intent' }, { status: 400 })
    }

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
    })
    const { error: updateError } = await supabase
      .from('orders')
      .update({ paypal_order_id: payPalOrder.id })
      .eq('id', orderId)
    if (updateError) throw updateError

    const approveUrl = Array.isArray(payPalOrder.links)
      ? payPalOrder.links.find((link: any) => link.rel === 'approve')?.href || ''
      : ''

    return NextResponse.json({ orderID: payPalOrder.id, approveUrl, returnUrl, cancelUrl })
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: error || 'Server error' }, { status: 500 })
  }
}
