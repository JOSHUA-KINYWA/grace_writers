import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { orderId, messageIds } = body

    if (!orderId || !messageIds || !Array.isArray(messageIds)) {
      return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 })
    }

    // Get current user
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Mark messages as read
    const { error } = await (supabase as any)
      .from('order_messages')
      .update({
        read_status: 'read',
        read_at: new Date().toISOString()
      })
      .eq('order_id', orderId)
      .in('id', messageIds)
      .eq('read_status', 'unread')

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err))
    console.error('Mark read error:', error)
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 })
  }
}
