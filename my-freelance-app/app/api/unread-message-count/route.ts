import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    // Get current user
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get unread message count per order
    const { data, error } = await supabase
      .from('order_messages')
      .select('order_id, id, sender_id')
      .eq('read_status', 'unread')

    if (error) {
      // If table doesn't have read_status column yet, return empty
      console.error('Query error:', error)
      return NextResponse.json({ unreadByOrder: {} })
    }

    // Count by order (only messages from other users)
    const unreadByOrder: Record<string, number> = {}
    if (data) {
      data.forEach((msg: any) => {
        // Only count messages from others to current user
        if ((msg as any).sender_id !== user.id) {
          unreadByOrder[(msg as any).order_id] = (unreadByOrder[(msg as any).order_id] || 0) + 1
        }
      })
    }

    return NextResponse.json({ unreadByOrder })
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err))
    console.error('Get unread error:', error)
    // Return empty instead of error to prevent UI breakage
    return NextResponse.json({ unreadByOrder: {} }, { status: 200 })
  }
}
