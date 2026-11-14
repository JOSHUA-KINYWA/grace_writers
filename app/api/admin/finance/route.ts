import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient as createSupabaseService } from '@supabase/supabase-js'

const PAGE_SIZE = 1000

export async function GET() {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || user.user_metadata?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const service = createSupabaseService(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const orders: Array<{
      id: string
      title: string | null
      status: string | null
      payment_status: string | null
      quote_amount: number | null
      paid_amount: number | null
      created_at: string | null
      clients: { name: string | null; email: string | null } | Array<{ name: string | null; email: string | null }> | null
    }> = []

    for (let offset = 0; ; offset += PAGE_SIZE) {
      const { data, error } = await service
        .from('orders')
        .select('id, title, status, payment_status, quote_amount, paid_amount, created_at, clients!client_id(name, email)')
        .order('created_at', { ascending: false })
        .range(offset, offset + PAGE_SIZE - 1)

      if (error) throw error
      const rows = data || []
      orders.push(...(rows as typeof orders))
      if (rows.length < PAGE_SIZE) break
    }

    const totals = orders.reduce(
      (result, order) => {
        const quoted = Number(order.quote_amount || 0)
        const paid = Number(order.paid_amount || 0)
        result.quoted += Number.isFinite(quoted) ? quoted : 0
        result.collected += Number.isFinite(paid) ? paid : 0
        result.outstanding += Math.max(0, (Number.isFinite(quoted) ? quoted : 0) - (Number.isFinite(paid) ? paid : 0))
        return result
      },
      { quoted: 0, collected: 0, outstanding: 0 }
    )

    return NextResponse.json({ totals, orders })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load order payments'
    console.error('[admin/finance]', message)
    return NextResponse.json({ error: 'Failed to load order payments' }, { status: 500 })
  }
}
