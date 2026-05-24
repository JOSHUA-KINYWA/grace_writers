export function formatOrderId(id: string, digits = 9) {
  if (!id) return ''.padStart(digits, '0')

  let hash = 0
  for (let i = 0; i < id.length; i += 1) {
    hash = (hash * 31 + id.charCodeAt(i)) % 1000000000
  }

  return hash.toString().padStart(digits, '0')
}
