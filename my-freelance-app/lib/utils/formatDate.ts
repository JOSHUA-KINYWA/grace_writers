export function formatDate(input: string | Date | undefined | null) {
  if (!input) return ''
  const date = typeof input === 'string' ? new Date(input) : input
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function formatTime(input: string | Date | undefined | null) {
  if (!input) return ''
  const date = typeof input === 'string' ? new Date(input) : input
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
}

export function formatDateTime(input: string | Date | undefined | null) {
  const d = formatDate(input)
  const t = formatTime(input)
  if (!d && !t) return ''
  return t ? `${d} at ${t}` : d
}
