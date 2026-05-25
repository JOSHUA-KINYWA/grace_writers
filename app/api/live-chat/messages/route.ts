import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient as createSupabaseService } from '@supabase/supabase-js'
import { resolveSenderNames } from '@/lib/live-chat/resolve-senders'
import {
  resolveClientChatRoomAccess,
  resolveClientIdForUser,
  roomStatusFromRow,
} from '@/lib/live-chat/rooms'
import { hasChatRoomStatusColumn } from '@/lib/live-chat/room-status'
import { LIVE_CHAT_STARTERS } from '@/lib/live-chat/starters'
import { getAppUrl } from '@/lib/email/config'
import { emailTemplates } from '@/lib/email-templates'
import { sendAppEmail } from '@/lib/email/send'
import {
  insertAppNotification,
  notifyAllAdmins,
  resolveClientNotifyTarget,
} from '@/lib/notifications/service'

async function getOrCreateRoomForUser(
  service: ReturnType<typeof createSupabaseService> & { from: (t: string) => any },
  user: { id: string; email?: string | null; user_metadata?: Record<string, unknown> }
) {
  const isAdmin = user.user_metadata?.role === 'admin'

  if (isAdmin) {
    return { error: 'Admins must specify chatRoomId', room: null as null }
  }

  const clientId = await resolveClientIdForUser(service, user)
  if (!clientId) {
    return { error: 'Client profile not found', room: null as null }
  }

  const { room, error } = await resolveClientChatRoomAccess(service, clientId, null)
  if (error || !room) {
    return { error: error || 'No chat room', room: null as null }
  }

  return { error: null, room }
}

export async function GET(req: Request) {
  try {
    const supabase = await createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const chatRoomId = new URL(req.url).searchParams.get('chatRoomId')
    const service = createSupabaseService(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    ) as any

    let roomId = chatRoomId
    let roomStatus = 'open'

    if (user.user_metadata?.role !== 'admin') {
      const clientId = await resolveClientIdForUser(service, user)
      if (!clientId) {
        return NextResponse.json({ error: 'Client profile not found' }, { status: 404 })
      }

      const { room, error: accessError } = await resolveClientChatRoomAccess(
        service,
        clientId,
        roomId
      )
      if (accessError === 'Forbidden') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
      if (!room) {
        return NextResponse.json({ error: accessError || 'No chat room' }, { status: 404 })
      }
      roomId = room.id
      roomStatus = roomStatusFromRow(room)
    } else if (!roomId) {
      return NextResponse.json({ error: 'Missing chatRoomId' }, { status: 400 })
    } else {
      const hasStatus = await hasChatRoomStatusColumn(service)
      const { data: room } = await service
        .from('chat_rooms')
        .select(hasStatus ? 'status, room_name' : 'room_name')
        .eq('id', roomId)
        .maybeSingle()
      roomStatus = room ? roomStatusFromRow(room) : 'open'
    }

    const { data, error } = await service
      .from('messages')
      .select('*')
      .eq('chat_room_id', roomId)
      .order('inserted_at', { ascending: true })
      .limit(100)

    if (error) throw error

    const userIds = [
      ...new Set((data || []).map((m: { user_id: string }) => m.user_id)),
    ] as string[]
    const nameMap = await resolveSenderNames(service, userIds)

    const messages = (data || []).map((msg) => ({
      id: String(msg.id),
      content: msg.message || '',
      user: {
        id: msg.user_id,
        name: nameMap[msg.user_id] || 'User',
      },
      createdAt: msg.inserted_at,
      replied: Boolean(msg.replied),
    }))

    return NextResponse.json({
      chatRoomId: roomId,
      roomStatus,
      messages,
      starters: LIVE_CHAT_STARTERS,
    })
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err))
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PATCH(req: Request) {
  try {
    const supabase = await createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user || user.user_metadata?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const messageId = body.messageId as string | undefined
    const chatRoomId = body.chatRoomId as string | undefined

    if (!messageId || !chatRoomId) {
      return NextResponse.json({ error: 'messageId and chatRoomId required' }, { status: 400 })
    }

    const service = createSupabaseService(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    ) as any

    const { error } = await service
      .from('messages')
      .update({ replied: true, replied_at: new Date().toISOString() })
      .eq('id', messageId)
      .eq('chat_room_id', chatRoomId)

    if (error) throw error

    return NextResponse.json({ ok: true })
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
    const content = String(body.content || '').trim()
    let chatRoomId = body.chatRoomId as string | undefined

    if (!content) {
      return NextResponse.json({ error: 'Message cannot be empty' }, { status: 400 })
    }

    const service = createSupabaseService(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    ) as any

    if (!chatRoomId && user.user_metadata?.role !== 'admin') {
      const { error, room } = await getOrCreateRoomForUser(service, user)
      if (error || !room) {
        return NextResponse.json({ error: error || 'No chat room' }, { status: 400 })
      }
      chatRoomId = room.id
    }

    if (!chatRoomId) {
      return NextResponse.json({ error: 'Missing chatRoomId' }, { status: 400 })
    }

    const isAdmin = user.user_metadata?.role === 'admin'

    if (!isAdmin) {
      const clientId = await resolveClientIdForUser(service, user)
      if (!clientId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }

      const { room: accessRoom, error: accessError } = await resolveClientChatRoomAccess(
        service,
        clientId,
        chatRoomId
      )
      if (accessError === 'Forbidden') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
      if (!accessRoom) {
        return NextResponse.json({ error: accessError || 'No chat room' }, { status: 400 })
      }
      chatRoomId = accessRoom.id
      if (roomStatusFromRow(accessRoom) === 'closed') {
        return NextResponse.json(
          { error: 'This conversation is closed. Start a new chat.' },
          { status: 400 }
        )
      }
    }

    const hasStatus = await hasChatRoomStatusColumn(service)
    const { data: room } = await service
      .from('chat_rooms')
      .select(hasStatus ? 'id, room_name, status, client_id' : 'id, room_name, client_id')
      .eq('id', chatRoomId)
      .maybeSingle()

    if (!room) {
      return NextResponse.json({ error: 'Chat room not found' }, { status: 404 })
    }

    if (roomStatusFromRow(room) === 'closed') {
      return NextResponse.json({ error: 'Conversation is closed' }, { status: 400 })
    }

    let { data: channelData } = await service
      .from('channels')
      .select('id')
      .eq('slug', room.room_name)
      .maybeSingle()

    if (!channelData) {
      const { data: created } = await service
        .from('channels')
        .insert({ slug: room.room_name })
        .select('id')
        .single()
      channelData = created
    }

    if (!channelData) {
      return NextResponse.json({ error: 'Failed to resolve channel' }, { status: 500 })
    }

    const { data: inserted, error: insertError } = await service
      .from('messages')
      .insert({
        message: content,
        channel_id: channelData.id,
        user_id: user.id,
        chat_room_id: chatRoomId,
        replied: false,
      })
      .select('*')
      .single()

    if (insertError) throw insertError

    if (isAdmin) {
      await service
        .from('messages')
        .update({ replied: true, replied_at: new Date().toISOString() })
        .eq('chat_room_id', chatRoomId)
        .eq('replied', false)
        .neq('user_id', user.id)
    }

    await service
      .from('chat_rooms')
      .update({ last_message_at: new Date().toISOString() })
      .eq('id', chatRoomId)

    if (!isAdmin) {
      const preview = content.slice(0, 120)
      const { data: clientRow } = room.client_id
        ? await service
            .from('clients')
            .select('name, email')
            .eq('id', room.client_id)
            .maybeSingle()
        : { data: null }
      const clientLabel = clientRow?.name || clientRow?.email || 'A client'
      void notifyAllAdmins({
        orderId: null,
        type: 'live_chat_message',
        title: 'New live chat message',
        message: `${clientLabel}: ${preview}`,
      }).catch((err) => console.error('Live chat admin notify failed:', err))
    }

    if (isAdmin && room.client_id) {
      const preview = content.slice(0, 120)
      const target = await resolveClientNotifyTarget(service, room.client_id)
      if (target?.userId) {
        void insertAppNotification({
          userId: target.userId,
          orderId: null,
          type: 'live_chat_message',
          title: 'Support replied in live chat',
          message: preview,
        }).catch((err) => console.error('Live chat in-app notify failed:', err))

        if (target.email) {
          const appUrl = getAppUrl()
          void sendAppEmail({
            kind: 'live_chat_message',
            to: target.email,
            subject: 'New message from Grace Tutors support',
            html: emailTemplates.liveChatMessageClient(target.name, preview, appUrl),
          }).catch((err) => console.error('Live chat email failed:', err))
        }
      }
    }

    const nameMap = await resolveSenderNames(service, [user.id])

    return NextResponse.json({
      message: {
        id: String(inserted.id),
        content: inserted.message || '',
        user: {
          id: user.id,
          name: nameMap[user.id] || (isAdmin ? 'Support' : 'You'),
        },
        createdAt: inserted.inserted_at,
        replied: Boolean(inserted.replied),
      },
      chatRoomId,
    })
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err))
    console.error('live-chat POST error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
