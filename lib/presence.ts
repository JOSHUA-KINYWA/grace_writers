const ONLINE_WINDOW_MS = 10 * 60 * 1000

export function isUserOnline(
  isOnline: boolean | null | undefined,
  lastSeen: string | null | undefined,
  now = Date.now()
): boolean {
  if (!isOnline) return false
  if (!lastSeen) return false
  const lastSeenMs = new Date(lastSeen).getTime()
  if (Number.isNaN(lastSeenMs)) return false
  return now - lastSeenMs <= ONLINE_WINDOW_MS
}
