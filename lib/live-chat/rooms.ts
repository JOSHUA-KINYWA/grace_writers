/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  closedRoomName,
  hasChatRoomStatusColumn,
  invalidateStatusColumnCache,
  isRoomNameClosed,
  isStatusSchemaError,
  roomStatusFromRow,
} from '@/lib/live-chat/room-status'

export type ChatRoomRow = {
  id: string
  room_name: string
  client_id: string
  status?: string | null
}

export { roomStatusFromRow }

export async function getOpenRoomForClient(
  service: any,
  clientId: string
): Promise<ChatRoomRow | null> {
  const hasStatus = await hasChatRoomStatusColumn(service)

  if (hasStatus) {
    const { data, error } = await service
      .from('chat_rooms')
      .select('id, room_name, client_id, status')
      .eq('client_id', clientId)
      .eq('status', 'open')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (!error && data) return data
  }

  const { data: legacy } = await service
    .from('chat_rooms')
    .select('id, room_name, client_id')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })

  const open = (legacy || []).find((r: { room_name: string }) => !isRoomNameClosed(r.room_name))
  return open || null
}

export async function createRoomForClient(
  service: any,
  clientId: string
): Promise<{ room: ChatRoomRow | null; error: string | null }> {
  const hasStatus = await hasChatRoomStatusColumn(service)
  const roomName = `chat-${clientId}-${Date.now()}`

  const payload: Record<string, unknown> = {
    client_id: clientId,
    room_name: roomName,
    last_message_at: new Date().toISOString(),
  }
  if (hasStatus) payload.status = 'open'

  const { data: created, error } = await service
    .from('chat_rooms')
    .insert(payload)
    .select(hasStatus ? 'id, room_name, client_id, status' : 'id, room_name, client_id')
    .single()

  if (error) {
    if (hasStatus && isStatusSchemaError(error.message)) {
      invalidateStatusColumnCache()
      return createRoomForClient(service, clientId)
    }
    return { error: error.message, room: null }
  }

  return {
    error: null,
    room: { ...created, status: created.status || 'open' },
  }
}

export async function getOrCreateOpenRoomForClient(
  service: any,
  clientId: string
): Promise<{ room: ChatRoomRow | null; error: string | null }> {
  const existing = await getOpenRoomForClient(service, clientId)
  if (existing) {
    return {
      error: null,
      room: { ...existing, status: roomStatusFromRow(existing) },
    }
  }
  return createRoomForClient(service, clientId)
}

/** Resolve which room a client may access (handles stale/closed room ids). */
export async function resolveClientChatRoomAccess(
  service: any,
  clientId: string,
  requestedRoomId?: string | null
): Promise<{ room: ChatRoomRow | null; error: string | null }> {
  if (!requestedRoomId) {
    return getOrCreateOpenRoomForClient(service, clientId)
  }

  const hasStatus = await hasChatRoomStatusColumn(service)
  const { data: requested } = await service
    .from('chat_rooms')
    .select(hasStatus ? 'id, room_name, client_id, status' : 'id, room_name, client_id')
    .eq('id', requestedRoomId)
    .maybeSingle()

  if (!requested || requested.client_id !== clientId) {
    return { room: null, error: 'Forbidden' }
  }

  if (roomStatusFromRow(requested) === 'open') {
    return {
      room: { ...requested, status: roomStatusFromRow(requested) },
      error: null,
    }
  }

  return getOrCreateOpenRoomForClient(service, clientId)
}

export async function closeRoom(service: any, roomId: string) {
  const hasStatus = await hasChatRoomStatusColumn(service)

  const { data: room } = await service
    .from('chat_rooms')
    .select('room_name')
    .eq('id', roomId)
    .maybeSingle()

  if (!room) return

  if (hasStatus) {
    const { error } = await service
      .from('chat_rooms')
      .update({
        status: 'closed',
        closed_at: new Date().toISOString(),
      })
      .eq('id', roomId)

    if (!error) return
    if (!isStatusSchemaError(error.message)) throw error
  }

  await service
    .from('chat_rooms')
    .update({
      room_name: closedRoomName(room.room_name),
      last_message_at: new Date().toISOString(),
    })
    .eq('id', roomId)
}

export async function startNewRoomForClient(
  service: any,
  clientId: string
): Promise<{ room: ChatRoomRow | null; error: string | null }> {
  const open = await getOpenRoomForClient(service, clientId)
  if (open) {
    await closeRoom(service, open.id)
  }

  const hasStatus = await hasChatRoomStatusColumn(service)
  if (hasStatus) {
    const { data: openRooms } = await service
      .from('chat_rooms')
      .select('id')
      .eq('client_id', clientId)
      .eq('status', 'open')

    for (const room of openRooms || []) {
      await closeRoom(service, room.id)
    }
  }

  return createRoomForClient(service, clientId)
}

export async function resolveClientIdForUser(
  service: any,
  user: { id: string; email?: string | null; user_metadata?: Record<string, unknown> }
): Promise<string | null> {
  const { data: byAuth } = await service
    .from('clients')
    .select('id')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  if (byAuth?.id) return byAuth.id

  if (!user.email) return null

  const { data: byEmail } = await service
    .from('clients')
    .select('id')
    .eq('email', user.email)
    .maybeSingle()

  if (byEmail?.id) {
    await service.from('clients').update({ auth_user_id: user.id }).eq('id', byEmail.id)
    return byEmail.id
  }

  const { data: created } = await service
    .from('clients')
    .insert({
      email: user.email,
      name: (user.user_metadata?.name as string) || user.email.split('@')[0],
      auth_user_id: user.id,
      date_registered: new Date().toISOString(),
    })
    .select('id')
    .single()

  return created?.id || null
}
