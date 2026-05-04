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

    // Resolve client id (prefer auth metadata; fallback to clients table best-effort)
    const metaClientId = user.user_metadata?.client_id as string | undefined
    let clientId: string | null = metaClientId || null

    if (!clientId) {
      let clientQuery = supabase.from('clients').select('id')
      if (user.email) {
        clientQuery = clientQuery.or(`auth_user_id.eq.${user.id},email.eq.${user.email}`)
      } else {
        clientQuery = clientQuery.eq('auth_user_id', user.id)
      }

      const { data: clientData, error: clientError } = await clientQuery.limit(1)
      if (clientError) {
        console.warn('unread-message-count: unable to resolve client via clients table', clientError)
        return NextResponse.json({ unreadByOrder: {} }, { status: 200 })
      }
      const client = Array.isArray(clientData) ? clientData[0] : clientData
      clientId = client?.id || null
    }

    if (!clientId) {
      return NextResponse.json({ unreadByOrder: {} }, { status: 200 })
    }

    // Get unread message count per order for THIS client only.
    // Without this join, we'd count unread messages belonging to other clients too.
    const { data, error } = await supabase
      .from('order_messages')
      .select('order_id, id, sender_id, orders!inner(client_id)')
      .eq('read_status', 'unread')
      .eq('orders.client_id', clientId)

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
