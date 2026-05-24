import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient as createSupabaseService } from '@supabase/supabase-js'
import {
  closeRoom,
  resolveClientIdForUser,
  roomStatusFromRow,
  startNewRoomForClient,
} from '@/lib/live-chat/rooms'
import { hasChatRoomStatusColumn } from '@/lib/live-chat/room-status'
import { LIVE_CHAT_STARTERS } from '@/lib/live-chat/starters'

function serviceClient() {
  return createSupabaseService(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  ) as any
}

export async function GET() {
  try {
    const supabase = await createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user || user.user_metadata?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const service = serviceClient()
    const hasStatus = await hasChatRoomStatusColumn(service)
    const selectFields = hasStatus
      ? `id, room_name, client_id, status, closed_at, last_message_at, created_at, clients:client_id (id, name, email, phone)`
      : `id, room_name, client_id, last_message_at, created_at, clients:client_id (id, name, email, phone)`

    const { data: rooms, error } = await service
      .from('chat_rooms')
      .select(selectFields)
      .order('last_message_at', { ascending: false, nullsFirst: false })

    if (error) throw error

    const withCounts = await Promise.all(
      (rooms || []).map(async (room: { id: string }) => {
        const { count } = await service
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('chat_room_id', room.id)
          .eq('replied', false)
        return {
          ...room,
          status: roomStatusFromRow(room as { status?: string; room_name?: string }),
          unread_count: count || 0,
        }
      })
    )

    return NextResponse.json({ rooms: withCounts, starters: LIVE_CHAT_STARTERS })
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err))
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const action = body.action as 'close' | 'new'
    const chatRoomId = body.chatRoomId as string | undefined
    const clientId = body.clientId as string | undefined

    const service = serviceClient()
    const isAdmin = user.user_metadata?.role === 'admin'

    if (action === 'close') {
      if (!chatRoomId) {
        return NextResponse.json({ error: 'chatRoomId required' }, { status: 400 })
      }

      const hasStatusCol = await hasChatRoomStatusColumn(service)
      const { data: room } = await service
        .from('chat_rooms')
        .select(hasStatusCol ? 'id, client_id, status, room_name' : 'id, client_id, room_name')
        .eq('id', chatRoomId)
        .maybeSingle()

      if (!room) {
        return NextResponse.json({ error: 'Room not found' }, { status: 404 })
      }

      if (!isAdmin) {
        const ownClientId = await resolveClientIdForUser(service, user)
        if (!ownClientId || ownClientId !== room.client_id) {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }
      }

      await closeRoom(service, chatRoomId)
      return NextResponse.json({ ok: true, chatRoomId, status: 'closed' })
    }

    if (action === 'new') {
      let targetClientId = clientId

      if (!isAdmin) {
        targetClientId = (await resolveClientIdForUser(service, user)) || undefined
      }

      if (!targetClientId) {
        return NextResponse.json({ error: 'clientId required' }, { status: 400 })
      }

      if (!isAdmin && chatRoomId) {
        const { data: room } = await service
          .from('chat_rooms')
          .select('client_id')
          .eq('id', chatRoomId)
          .maybeSingle()
        if (room && room.client_id !== targetClientId) {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }
      }

      const { room, error } = await startNewRoomForClient(service, targetClientId)
      if (error || !room) {
        return NextResponse.json({ error: error || 'Failed to create room' }, { status: 500 })
      }

      return NextResponse.json({
        chatRoomId: room.id,
        roomName: room.room_name,
        status: 'open',
        starters: LIVE_CHAT_STARTERS,
        messages: [],
      })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err))
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
