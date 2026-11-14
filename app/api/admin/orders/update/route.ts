import { isAdminUser } from '@/lib/auth/admin'
import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient as createSupabaseService } from '@supabase/supabase-js'

type ConfirmationRule = 'paid_only' | 'completed_only' | 'paid_or_completed'
type SupabaseClient = Awaited<ReturnType<typeof createServerClient>>
type OrderRow = {
  id: string
  client_id: string | null
  title: string | null
  status: string | null
  payment_status: string | null
  quote_amount: number | null
  paid_amount: number | null
  currency_code: string
  billing_unit: string
  page_count: number | null
  rate_per_page: number | null
  admin_notes: string | null
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
  if (body?.currency_code !== undefined) {
    const currency = String(body.currency_code).toUpperCase()
    if (!['USD', 'KES'].includes(currency)) throw new Error('Currency must be USD or KES')
    payload.currency_code = currency
  }
  if (body?.billing_unit !== undefined) {
    const unit = String(body.billing_unit)
    if (!['custom', 'page'].includes(unit)) throw new Error('Billing unit must be custom or page')
    payload.billing_unit = unit
  }
  if (body?.page_count !== undefined) {
    const count = body.page_count === null || body.page_count === '' ? null : Number(body.page_count)
    if (count !== null && (!Number.isInteger(count) || count < 0)) throw new Error('Page count must be a whole number of zero or more')
    payload.page_count = count
  }
  if (body?.rate_per_page !== undefined) {
    const rate = body.rate_per_page === null || body.rate_per_page === '' ? null : Number(body.rate_per_page)
    if (rate !== null && (!Number.isFinite(rate) || rate < 0)) throw new Error('Rate per page must be zero or more')
    payload.rate_per_page = rate
  }
  const nextBillingUnit = payload.billing_unit ?? currentOrder.billing_unit
  const nextPageCount = payload.page_count ?? currentOrder.page_count
  const nextRate = payload.rate_per_page ?? currentOrder.rate_per_page
  if (nextBillingUnit === 'page') {
    if (nextPageCount == null || nextRate == null) throw new Error('Set both page count and rate per page before saving page-based pricing')
    payload.quote_amount = Number((nextPageCount * nextRate).toFixed(2))
  }
  if (body?.quote_amount !== undefined && nextBillingUnit !== 'page') payload.quote_amount = body.quote_amount
  if (body?.paid_amount !== undefined) payload.paid_amount = body.paid_amount
  if (paymentStatus !== null) payload.payment_status = paymentStatus
  if (body?.admin_notes !== undefined) payload.admin_notes = body.admin_notes
  if (body?.client_notes !== undefined) payload.client_notes = body.client_notes
  if (body?.deliverables !== undefined) payload.deliverables = body.deliverables
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
  if (!isAdminUser(user)) {
    return { ok: false as const, response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }
  return { ok: true as const }
}

async function getOrder(supabase: SupabaseClient, orderId: string) {
  const { data, error } = await supabase
    .from('orders')
    .select('id, client_id, title, status, payment_status, quote_amount, paid_amount, admin_notes, currency_code, billing_unit, page_count, rate_per_page')
    .eq('id', orderId)
    .maybeSingle()
  if (error) throw error
  return (data || null) as OrderRow | null
}

function formatStatusLabel(value: string) {
  return value.replace(/_/g, ' ')
}

async function notifyClient(
  currentOrder: OrderRow,
  orderId: string,
  updates: {
    statusLabel?: string
    statusSlug?: string
    paymentLabel?: string
    paymentSlug?: string
    detailLines?: string[]
  }
) {
  if (!currentOrder.client_id) return

  const service = createSupabaseService(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: clientRecord } = await service
    .from('clients')
    .select('id, auth_user_id, email, name')
    .eq('id', currentOrder.client_id)
    .maybeSingle()

  const notifyUserId = clientRecord?.auth_user_id || clientRecord?.id
  if (!notifyUserId) return

  const parts: string[] = []
  if (updates.statusLabel) parts.push(`Status: ${updates.statusLabel}`)
  if (updates.paymentLabel) parts.push(`Payment: ${updates.paymentLabel}`)
  if (updates.detailLines?.length) parts.push(...updates.detailLines)
  const summary = parts.join(' • ') || 'Your order was updated'

  try {
    await service.from('notifications').insert({
      user_id: notifyUserId,
      order_id: orderId,
      type: 'order_update',
      title: 'Order updated',
      message: `Your order "${currentOrder.title || 'Order'}" — ${summary}`,
      read: false,
    })
  } catch (notifErr) {
    console.error('Failed to create database notification:', notifErr)
  }
  // Email intentionally omitted — in-app notification only (Brevo quota).
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

    let updateData: Record<string, any>
    try {
      updateData = buildOrderUpdatePayload(body, currentOrder)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid order pricing'
      return NextResponse.json({ error: message }, { status: 400 })
    }

    const { error: updateErr } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', orderId)
    if (updateErr) throw updateErr

    const { status: finalStatus, paymentStatus: finalPaymentStatus } = getFinalOrderState(updateData, currentOrder)
    const statusChanged =
      finalStatus !== null && finalStatus !== currentOrder.status
    const paymentChanged =
      finalPaymentStatus !== null && finalPaymentStatus !== currentOrder.payment_status

    const quoteChanged =
      body?.quote_amount !== undefined &&
      Number(body.quote_amount) !== Number(currentOrder.quote_amount ?? 0)
      || (body?.currency_code !== undefined && String(body.currency_code).toUpperCase() !== currentOrder.currency_code)
      || (body?.page_count !== undefined && Number(body.page_count) !== Number(currentOrder.page_count ?? 0))
      || (body?.rate_per_page !== undefined && Number(body.rate_per_page) !== Number(currentOrder.rate_per_page ?? 0))
    const paidAmountChanged =
      body?.paid_amount !== undefined &&
      Number(body.paid_amount) !== Number(currentOrder.paid_amount ?? 0)
    const adminNotesChanged =
      body?.admin_notes !== undefined &&
      String(body.admin_notes ?? '') !== String(currentOrder.admin_notes ?? '')

    const detailLines: string[] = []
    if (quoteChanged) {
      detailLines.push('Order pricing was updated — check messages for details')
    }
    if (paidAmountChanged) {
      detailLines.push('Payment status was updated on your order')
    }
    if (adminNotesChanged) {
      detailLines.push('Admin added an update note — check your dashboard')
    }

    const shouldNotify =
      statusChanged ||
      paymentChanged ||
      quoteChanged ||
      paidAmountChanged ||
      adminNotesChanged

    if (shouldNotify) {
      void notifyClient(currentOrder, orderId, {
        statusLabel: statusChanged && finalStatus ? formatStatusLabel(finalStatus) : undefined,
        statusSlug: statusChanged && finalStatus ? finalStatus : undefined,
        paymentLabel:
          paymentChanged && finalPaymentStatus
            ? formatStatusLabel(finalPaymentStatus)
            : undefined,
        paymentSlug:
          paymentChanged && finalPaymentStatus ? finalPaymentStatus : undefined,
        detailLines: detailLines.length > 0 ? detailLines : undefined,
      })
    }

    const reconciled = await reconcileReferralsIfEligible(
      supabase,
      currentOrder,
      finalStatus,
      finalPaymentStatus
    )

    return NextResponse.json(
      {
        ok: true,
        reconciled,
        notified: shouldNotify,
        emailQueued: false,
      },
      { status: 200 }
    )
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err))
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 })
  }
}

