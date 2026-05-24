/** Normalize stored attachment value to a bucket-relative path (order-files/...). */
export function storagePathFromAttachment(value: string): string {
  if (!value) return ''
  const trimmed = value.trim()

  if (!trimmed.startsWith('http')) {
    return trimmed.replace(/^\/+/, '')
  }

  try {
    const url = new URL(trimmed)
    const decodedPath = decodeURIComponent(url.pathname)

    const objectMatch = decodedPath.match(
      /\/storage\/v1\/object\/(?:public|sign|authenticated)\/order-files\/(.+)$/i
    )
    if (objectMatch?.[1]) return objectMatch[1]

    const publicMatch = trimmed.match(/\/order-files\/(.+?)(?:\?|$)/)
    if (publicMatch?.[1]) return decodeURIComponent(publicMatch[1])
  } catch {
    // fall through
  }

  return trimmed
}

export function attachmentDownloadHref(storagePath: string): string {
  const path = storagePathFromAttachment(storagePath)
  if (!path) return '#'
  return `/api/signed-url?filePath=${encodeURIComponent(path)}`
}

export function attachmentDisplayName(storagePath: string, idx: number): string {
  const path = storagePathFromAttachment(storagePath)
  const name = path.split('/').pop() || `file-${idx + 1}`
  const cleaned = name.includes('_') ? name.split('_').slice(2).join('_') : name
  try {
    return decodeURIComponent(cleaned) || `file-${idx + 1}`
  } catch {
    return cleaned || `file-${idx + 1}`
  }
}
