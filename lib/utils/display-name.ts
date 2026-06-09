export function nameFromUserMetadata(
  metadata: Record<string, unknown> | undefined | null
): string | null {
  if (!metadata) return null
  const keys = ['full_name', 'name', 'display_name', 'username'] as const
  for (const key of keys) {
    const value = metadata[key]
    if (typeof value === 'string' && value.trim()) return value.trim()
  }
  return null
}

/** Prefer real name over email local-part (e.g. joshuakinywa96). */
export async function resolveSenderDisplayName(
  service: any,
  user: {
    id: string
    email?: string | null
    user_metadata?: Record<string, unknown>
  },
  isAdmin: boolean
): Promise<string> {
  if (isAdmin) {
    return nameFromUserMetadata(user.user_metadata) || 'Support'
  }

  const { data: client } = await service
    .from('clients')
    .select('name, email')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  if (client?.name?.trim()) return client.name.trim()

  const fromMeta = nameFromUserMetadata(user.user_metadata)
  if (fromMeta) return fromMeta

  if (client?.email) {
    const local = client.email.split('@')[0]
    if (local && !looksLikeEmailLocal(local)) return local
  }

  return 'Client'
}

function looksLikeEmailLocal(part: string): boolean {
  return /^[a-z0-9._-]+$/i.test(part) && /\d/.test(part) && part.length > 12
}
