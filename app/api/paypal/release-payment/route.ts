import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { capturePayPalAuthorization, getPayPalOrder } from '@/lib/paypal'

function extractCaptureAmount(captureResponse: any, authorizationId: string) {
  const directAmount = Number(captureResponse?.amount?.value || 0)
  if (directAmount > 0) return { amount: directAmount, isTotal: false }

  const purchaseUnits = Array.isArray(captureResponse?.purchase_units)
    ? captureResponse.purchase_units
    : []
  const captures = purchaseUnits.flatMap((unit: any) =>
    Array.isArray(unit?.payments?.captures) ? unit.payments.captures : []
  )

  const matchingCaptures = captures.filter((capture: any) => {
    if (!authorizationId) return true
    const upLink = Array.isArray(capture?.links)
      ? capture.links.find((link: any) => link?.rel === 'up')?.href
      : ''
    return !upLink || String(upLink).includes(authorizationId)
  })
  const relevantCaptures = matchingCaptures.length > 0 ? matchingCaptures : captures

  const amount = relevantCaptures.reduce(
    (sum: number, capture: any) => sum + Number(capture?.amount?.value || 0),
    0
  )
  return { amount, isTotal: true }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const orderId = String(body?.orderId || '').trim()
    const authorizationId = String(body?.authorizationId || '').trim()
    const amountToRelease = String(body?.amountToRelease || '').trim() // Amount client approves to release

    if (!orderId || !authorizationId || !amountToRelease) {
      return NextResponse.json({ error: 'Missing orderId, authorizationId or amountToRelease' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, client_id, authorized_amount, approved_release_amount, captured_amount, quote_amount, paid_amount, escrow_status, paypal_order_id')
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

    const authorizedAmount = Number(order.authorized_amount ?? 0)
    const releaseAmount = Number(amountToRelease)
    const alreadyCaptured = Number(order.captured_amount ?? 0)
    const totalAvailableForCapture = authorizedAmount - alreadyCaptured

    // Validate the release amount
    if (releaseAmount <= 0) {
      return NextResponse.json({ error: 'Release amount must be greater than 0' }, { status: 400 })
    }

    if (releaseAmount > totalAvailableForCapture) {
      return NextResponse.json({ 
        error: `Cannot release more than authorized. Available: ${totalAvailableForCapture}, requested: ${releaseAmount}` 
      }, { status: 400 })
    }

    const finalCapture = releaseAmount >= totalAvailableForCapture
    let captureResponse: any
    try {
      captureResponse = await capturePayPalAuthorization(authorizationId, releaseAmount.toFixed(2), finalCapture)
    } catch (captureError: any) {
      const message = String(captureError?.message || captureError || '')
      if (!order.paypal_order_id || !/semantically incorrect|business validation|UNPROCESSABLE/i.test(message)) {
        throw captureError
      }
      captureResponse = await getPayPalOrder(order.paypal_order_id)
    }

    const captureResult = extractCaptureAmount(captureResponse, authorizationId)
    const capturedAmount = captureResult.isTotal
      ? Math.max(0, Number((captureResult.amount - alreadyCaptured).toFixed(2)))
      : Number(captureResult.amount.toFixed(2))

    if (!(capturedAmount > 0)) {
      return NextResponse.json({ error: 'Unable to determine capture amount' }, { status: 500 })
    }

    const newCapturedTotal = Number((alreadyCaptured + capturedAmount).toFixed(2))
    const isFullyReleased = newCapturedTotal >= authorizedAmount
    const newEscrowStatus = isFullyReleased ? 'released' : 'partial'

    const { error: updateError } = await supabase
      .from('orders')
      .update({
        approved_release_amount: Number(order.approved_release_amount ?? 0) + releaseAmount,
        captured_amount: newCapturedTotal,
        paid_amount: newCapturedTotal,
        escrow_status: newEscrowStatus,
        payment_status: isFullyReleased ? 'paid' : 'partial',
        final_payment_released_at: isFullyReleased ? new Date().toISOString() : null,
      })
      .eq('id', orderId)

    if (updateError) throw updateError

    return NextResponse.json({ 
      ok: true, 
      capturedAmount: capturedAmount,
      totalCaptured: newCapturedTotal,
      authorizedAmount: authorizedAmount,
      remainingInEscrow: authorizedAmount - newCapturedTotal,
      escrowStatus: newEscrowStatus,
      paymentStatus: isFullyReleased ? 'paid' : 'partial',
      message: isFullyReleased 
        ? `Payment complete! ${capturedAmount} captured. Total: ${newCapturedTotal}`
        : `Partial release approved. Captured: ${capturedAmount}. Total captured: ${newCapturedTotal}. Remaining in escrow: ${authorizedAmount - newCapturedTotal}`
    })
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: error || 'Server error' }, { status: 500 })
  }
}
