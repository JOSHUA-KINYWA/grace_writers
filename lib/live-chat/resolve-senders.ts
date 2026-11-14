import { isAdminUser } from '@/lib/auth/admin'
import { nameFromUserMetadata } from '@/lib/utils/display-name'

export async function resolveSenderNames(
  service: any,
  userIds: string[]
): Promise<Record<string, string>> {
  const map: Record<string, string> = {}
  const unique = [...new Set(userIds.filter(Boolean))]
  if (unique.length === 0) return map

  const { data: clients } = await service
    .from('clients')
    .select('id, auth_user_id, name, email')
    .in('auth_user_id', unique)

  for (const client of clients || []) {
    if (client.auth_user_id) {
      map[client.auth_user_id] = client.name || client.email?.split('@')[0] || 'Client'
    }
  }

  const { data: authData } = await service.auth.admin.listUsers({ perPage: 1000 })
  for (const uid of unique) {
    if (map[uid]) continue
    const authUser = authData?.users?.find((u: { id: string }) => u.id === uid)
    if (isAdminUser(authUser)) {
      map[uid] = 'Support'
    } else {
      map[uid] =
        nameFromUserMetadata(authUser?.user_metadata as Record<string, unknown>) ||
        'User'
    }
  }

  return map
}
