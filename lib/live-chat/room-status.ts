/* eslint-disable @typescript-eslint/no-explicit-any */

const CLOSED_MARKER = '-closed-'

let statusColumnAvailable: boolean | null = null

export function isStatusSchemaError(message: string | undefined) {
  if (!message) return false
  const m = message.toLowerCase()
  return m.includes('status') && (m.includes('schema cache') || m.includes('column'))
}

export async function hasChatRoomStatusColumn(service: any): Promise<boolean> {
  if (statusColumnAvailable !== null) return statusColumnAvailable
  const { error } = await service.from('chat_rooms').select('status').limit(1)
  if (error && isStatusSchemaError(error.message)) {
    statusColumnAvailable = false
    return false
  }
  statusColumnAvailable = true
  return true
}

export function isRoomNameClosed(roomName: string | null | undefined) {
  return Boolean(roomName && roomName.includes(CLOSED_MARKER))
}

export function roomStatusFromRow(row: {
  status?: string | null
  room_name?: string | null
}): 'open' | 'closed' {
  if (row.status === 'closed' || row.status === 'open') return row.status
  return isRoomNameClosed(row.room_name) ? 'closed' : 'open'
}

export function invalidateStatusColumnCache() {
  statusColumnAvailable = null
}

export function closedRoomName(roomName: string) {
  if (isRoomNameClosed(roomName)) return roomName
  return `${roomName}${CLOSED_MARKER}${Date.now()}`
}
