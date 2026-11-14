import { isAdminUser } from '@/lib/auth/admin'
import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient as createSupabaseService } from '@supabase/supabase-js'

export async function GET() {
  try {
    const supabase = await createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user || !isAdminUser(user)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const service = createSupabaseService(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: unreadMsgs } = await service
      .from('order_messages')
      .select('order_id')
      .eq('read_status', 'unread')
      .eq('is_admin', false)

    const unreadByOrder: Record<string, number> = {}
    ;(unreadMsgs || []).forEach((m: { order_id: string }) => {
      unreadByOrder[m.order_id] = (unreadByOrder[m.order_id] || 0) + 1
    })
    const unreadMessages = Object.values(unreadByOrder).reduce((s, n) => s + n, 0)

    let unreadLiveChat = 0
    const { data: rooms } = await service
      .from('chat_rooms')
      .select('id, client_id')
      .not('client_id', 'is', null)

    const roomIds = (rooms || []).map((r) => r.id)
    if (roomIds.length) {
      const clientIds = [...new Set((rooms || []).map((r) => r.client_id).filter(Boolean))]
      const { data: clients } = await service
        .from('clients')
        .select('id, auth_user_id')
        .in('id', clientIds as string[])

      const authByClient = new Map(
        (clients || []).map((c) => [c.id, c.auth_user_id as string | null])
      )

      const { data: liveMsgs } = await service
        .from('messages')
        .select('chat_room_id, user_id')
        .in('chat_room_id', roomIds)
        .eq('replied', false)
        .limit(300)

      for (const msg of liveMsgs || []) {
        const room = rooms?.find((r) => r.id === msg.chat_room_id)
        const clientAuth = room?.client_id ? authByClient.get(room.client_id) : null
        if (clientAuth && msg.user_id === clientAuth) unreadLiveChat++
      }
    }

    const { data: recentNotifications } = await service
      .from('notifications')
      .select('id, order_id, title, message, type, created_at, read')
      .eq('user_id', user.id)
      .or('read.eq.false,read.is.null')
      .order('created_at', { ascending: false })
      .limit(12)

    return NextResponse.json({
      unreadMessages,
      unreadByOrder,
      unreadLiveChat,
      recentNotifications: recentNotifications || [],
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
