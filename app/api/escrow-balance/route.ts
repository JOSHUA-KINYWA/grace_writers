import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient as createSupabaseService } from '@supabase/supabase-js'

function getServiceClient() {
  return createSupabaseService(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  )
}

function summarizeOrders(orders: Array<{ authorized_amount: number | null; captured_amount: number | null }>) {
  return orders.reduce(
    (summary, order) => {
      const authorized = Number(order.authorized_amount ?? 0)
      const captured = Number(order.captured_amount ?? 0)
      const remaining = Math.max(0, authorized - captured)
      return {
        authorized: summary.authorized + authorized,
        captured: summary.captured + captured,
        balance: summary.balance + remaining,
        count: remaining > 0 ? summary.count + 1 : summary.count,
      }
    },
    { authorized: 0, captured: 0, balance: 0, count: 0 }
  )
}

export async function GET() {
  try {
    const supabase = await createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const service = getServiceClient()
    const isAdmin = user.user_metadata?.role === 'admin'
    let query = service
      .from('orders')
      .select('authorized_amount, captured_amount')
      .in('escrow_status', ['authorized', 'partial'])

    if (!isAdmin) {
      const { data: client } = await service
        .from('clients')
        .select('id')
        .or(`auth_user_id.eq.${user.id},email.eq.${user.email || ''}`)
        .limit(1)
        .maybeSingle()

      if (!client?.id) {
        return NextResponse.json({ balance: 0, authorized: 0, captured: 0, count: 0 })
      }

      query = query.eq('client_id', client.id)
    }

    const { data, error } = await query
    if (error) throw error

    const summary = summarizeOrders(data || [])
    return NextResponse.json({
      ...summary,
      authorized: Number(summary.authorized.toFixed(2)),
      captured: Number(summary.captured.toFixed(2)),
      balance: Number(summary.balance.toFixed(2)),
    })
  } catch (err) {
    const error = err instanceof Error ? err.message : 'Unable to fetch escrow balance'
    return NextResponse.json({ error }, { status: 500 })
  }
}
