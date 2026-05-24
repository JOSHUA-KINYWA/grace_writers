import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || user.user_metadata?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { data, error } = await supabase
      .from('order_messages')
      .select('order_id, id, sender_id, is_admin, read_status')
      .eq('read_status', 'unread')
      .eq('is_admin', false)

    if (error) {
      console.error('Admin unread query error:', error)
      return NextResponse.json({ unreadByOrder: {} })
    }

    const unreadByOrder: Record<string, number> = {}
    ;(data || []).forEach((msg: any) => {
      unreadByOrder[msg.order_id] = (unreadByOrder[msg.order_id] || 0) + 1
    })

    return NextResponse.json({ unreadByOrder })
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err))
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
