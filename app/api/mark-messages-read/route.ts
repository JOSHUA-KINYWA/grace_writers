import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient as createSupabaseService } from '@supabase/supabase-js'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { orderId, messageIds } = body

    if (!orderId || !messageIds || !Array.isArray(messageIds) || messageIds.length === 0) {
      return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 })
    }

    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const isAdmin = user.user_metadata?.role === 'admin'

    if (!isAdmin) {
      const { data: order } = await supabase
        .from('orders')
        .select('client_id')
        .eq('id', orderId)
        .maybeSingle()

      if (!order) {
        return NextResponse.json({ error: 'Order not found' }, { status: 404 })
      }

      const { data: client } = await supabase
        .from('clients')
        .select('auth_user_id, email')
        .eq('id', order.client_id)
        .maybeSingle()

      const ownsOrder =
        client?.auth_user_id === user.id ||
        (client?.email && user.email && client.email.toLowerCase() === user.email.toLowerCase())

      if (!ownsOrder) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    const service = createSupabaseService(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: updated, error } = await service
      .from('order_messages')
      .update({
        read_status: 'read',
        read_at: new Date().toISOString(),
      })
      .eq('order_id', orderId)
      .in('id', messageIds)
      .eq('read_status', 'unread')
      .select('id')

    if (error) throw error

    return NextResponse.json({
      success: true,
      marked: updated?.length ?? 0,
    })
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err))
    console.error('Mark read error:', error)
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 })
  }
}
