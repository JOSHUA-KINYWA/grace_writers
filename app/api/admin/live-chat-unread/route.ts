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

    const { data: rooms, error: roomsError } = await service
      .from('chat_rooms')
      .select('id, client_id')
      .not('client_id', 'is', null)

    if (roomsError) {
      console.error('[live-chat-unread] rooms:', roomsError)
      return NextResponse.json({ total: 0, byRoom: {} })
    }

    const roomIds = (rooms || []).map((r) => r.id)
    if (!roomIds.length) {
      return NextResponse.json({ total: 0, byRoom: {} })
    }

    const { data: messages, error: msgError } = await service
      .from('messages')
      .select('id, chat_room_id, user_id, replied')
      .in('chat_room_id', roomIds)
      .eq('replied', false)
      .order('inserted_at', { ascending: false })
      .limit(500)

    if (msgError) {
      console.error('[live-chat-unread] messages:', msgError)
      return NextResponse.json({ total: 0, byRoom: {} })
    }

    const clientIds = new Set(
      (rooms || []).map((r) => r.client_id).filter(Boolean) as string[]
    )
    const { data: clients } = await service
      .from('clients')
      .select('id, auth_user_id')
      .in('id', [...clientIds])

    const clientAuthById = new Map(
      (clients || []).map((c) => [c.id, c.auth_user_id as string | null])
    )

    const byRoom: Record<string, number> = {}
    for (const msg of messages || []) {
      const room = rooms?.find((r) => r.id === msg.chat_room_id)
      const clientAuth = room?.client_id
        ? clientAuthById.get(room.client_id)
        : null
      if (clientAuth && msg.user_id === clientAuth) {
        byRoom[msg.chat_room_id] = (byRoom[msg.chat_room_id] || 0) + 1
      }
    }

    const total = Object.values(byRoom).reduce((s, n) => s + n, 0)
    return NextResponse.json({ total, byRoom })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
