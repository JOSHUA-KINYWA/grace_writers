import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'

type ConfirmationRule = 'paid_only' | 'completed_only' | 'paid_or_completed'
type SupabaseClient = Awaited<ReturnType<typeof createServerClient>>
type OrderRow = {
  id: string
  client_id: string | null
  title: string | null
  status: string | null
  payment_status: string | null
}

function orderQualifiesForReferral(
  status: string | null | undefined,
  paymentStatus: string | null | undefined,
  rule: ConfirmationRule
) {
  if (rule === 'paid_only') return paymentStatus === 'paid'
  if (rule === 'completed_only') return status === 'completed'
  return status === 'completed' || paymentStatus === 'paid'
}

function buildOrderUpdatePayload(body: any, currentOrder: OrderRow) {
  const nextStatus = body?.status ? String(body.status) : null
  const paymentStatus = body?.payment_status ? String(body.payment_status) : null
  const payload: Record<string, any> = {
    updated_at: new Date().toISOString(),
  }

  if (nextStatus !== null) payload.status = nextStatus
  if (body?.quote_amount !== undefined) payload.quote_amount = body.quote_amount
  if (body?.paid_amount !== undefined) payload.paid_amount = body.paid_amount
  if (paymentStatus !== null) payload.payment_status = paymentStatus
  if (body?.admin_notes !== undefined) payload.admin_notes = body.admin_notes
  if (nextStatus === 'completed' && currentOrder.status !== 'completed') {
    payload.completed_at = new Date().toISOString()
  }

  return payload
}

function getFinalOrderState(updateData: Record<string, any>, currentOrder: OrderRow) {
  return {
    status: (updateData.status ?? currentOrder.status) as string | null,
    paymentStatus: (updateData.payment_status ?? currentOrder.payment_status) as string | null,
  }
}

function milestoneReached(
  currentOrder: OrderRow,
  finalStatus: string | null,
  finalPaymentStatus: string | null
) {
  return (
    (finalStatus === 'completed' && currentOrder.status !== 'completed') ||
    (finalPaymentStatus === 'paid' && currentOrder.payment_status !== 'paid')
  )
}

async function requireAdmin(supabase: SupabaseClient) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false as const, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  if (user.user_metadata?.role !== 'admin') {
    return { ok: false as const, response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }
  return { ok: true as const }
}

async function getOrder(supabase: SupabaseClient, orderId: string) {
  const { data, error } = await supabase
    .from('orders')
    .select('id, client_id, title, status, payment_status')
    .eq('id', orderId)
    .maybeSingle()
  if (error) throw error
  return (data || null) as OrderRow | null
}

async function notifyClient(supabase: SupabaseClient, currentOrder: OrderRow, orderId: string, nextStatusLabel: string) {
  if (!currentOrder.client_id) return
  const { data: clientRecord } = await supabase
    .from('clients')
    .select('id, auth_user_id')
    .eq('id', currentOrder.client_id)
    .maybeSingle()
  const notifyUserId = clientRecord?.auth_user_id || clientRecord?.id
  if (!notifyUserId) return

  await supabase.from('notifications').insert({
    user_id: notifyUserId,
    order_id: orderId,
    type: 'order_update',
    title: 'Order Status Updated',
    message: `Your order "${currentOrder.title || 'Order'}" status changed to: ${nextStatusLabel}`,
  }).catch(() => {})
}

async function loadConfirmationRule(supabase: SupabaseClient): Promise<ConfirmationRule> {
  const { data } = await supabase
    .from('referral_settings')
    .select('confirmation_rule')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  const raw = String(data?.confirmation_rule || 'paid_or_completed')
  if (raw === 'paid_only' || raw === 'completed_only' || raw === 'paid_or_completed') {
    return raw
  }
  return 'paid_or_completed'
}

async function reconcileReferralsIfEligible(
  supabase: SupabaseClient,
  currentOrder: OrderRow,
  finalStatus: string | null,
  finalPaymentStatus: string | null
) {
  if (!currentOrder.client_id) return 0
  if (!milestoneReached(currentOrder, finalStatus, finalPaymentStatus)) return 0

  const confirmationRule = await loadConfirmationRule(supabase)
  if (!orderQualifiesForReferral(finalStatus, finalPaymentStatus, confirmationRule)) return 0

  const { data: clientRow } = await supabase
    .from('clients')
    .select('id, auth_user_id')
    .eq('id', currentOrder.client_id)
    .maybeSingle()

  const authUserId = String(clientRow?.auth_user_id || '')
  let referralUpdate = supabase
    .from('referrals')
    .update({
      status: 'confirmed',
      confirmed_at: new Date().toISOString(),
    })
    .eq('status', 'pending')
    .eq('referred_client_id', currentOrder.client_id)
    .select('id')

  if (authUserId) {
    referralUpdate = supabase
      .from('referrals')
      .update({
        status: 'confirmed',
        confirmed_at: new Date().toISOString(),
      })
      .eq('status', 'pending')
      .or(`referred_client_id.eq.${currentOrder.client_id},referred_user_id.eq.${authUserId}`)
      .select('id')
  }

  const { data: updatedRows } = await referralUpdate
  return Array.isArray(updatedRows) ? updatedRows.length : 0
}

export async function POST(req: Request) {
  try {
    const supabase = await createServerClient()
    const auth = await requireAdmin(supabase)
    if (!auth.ok) return auth.response

    const body = await req.json()
    const orderId = String(body?.orderId || '').trim()
    if (!orderId) return NextResponse.json({ error: 'Missing orderId' }, { status: 400 })

    const currentOrder = await getOrder(supabase, orderId)
    if (!currentOrder) return NextResponse.json({ error: 'Order not found' }, { status: 404 })

    const updateData = buildOrderUpdatePayload(body, currentOrder)

    const { error: updateErr } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', orderId)
    if (updateErr) throw updateErr

    const { status: finalStatus, paymentStatus: finalPaymentStatus } = getFinalOrderState(updateData, currentOrder)
    const nextStatusLabel = String(finalStatus || currentOrder.status || 'updated').replace('_', ' ')
    await notifyClient(supabase, currentOrder, orderId, nextStatusLabel)
    const reconciled = await reconcileReferralsIfEligible(supabase, currentOrder, finalStatus, finalPaymentStatus)

    return NextResponse.json({ ok: true, reconciled }, { status: 200 })
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err))
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 })
  }
}

