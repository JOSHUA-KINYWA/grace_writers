import { createClient as createSupabaseService } from '@supabase/supabase-js'
import { getAdminAuthUserIds } from '@/lib/email/admin-users'

export type AppNotificationType =
  | 'new_order'
  | 'order_update'
  | 'file_upload'
  | 'new_message'
  | 'revision_requested'
  | 'revision_uploaded'
  | 'revision_complete'
  | 'live_chat_message'
  | 'password_changed'
  | 'admin_new_signup'
  | 'contact_inquiry'

function getService() {
  return createSupabaseService(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function insertAppNotification(input: {
  userId: string
  orderId?: string | null
  type: AppNotificationType
  title: string
  message: string
}) {
  const service = getService()
  const { error } = await service.from('notifications').insert({
    user_id: input.userId,
    order_id: input.orderId ?? null,
    type: input.type,
    title: input.title,
    message: input.message,
    read: false,
  })
  if (error) {
    console.error(`[notification] insert failed (${input.type}):`, error)
    throw error
  }
}

export async function notifyAllAdmins(input: {
  orderId?: string | null
  type: AppNotificationType
  title: string
  message: string
}) {
  const adminIds = await getAdminAuthUserIds()
  if (!adminIds.length) {
    console.error(
      '[notification] No admin users found. Set user_metadata.role=admin on your account, or set ADMIN_EMAIL to your login email.'
    )
    return { notified: 0 }
  }
  await Promise.all(
    adminIds.map((userId) =>
      insertAppNotification({
        userId,
        orderId: input.orderId,
        type: input.type,
        title: input.title,
        message: input.message,
      }).catch(() => {})
    )
  )
  return { notified: adminIds.length }
}

export async function resolveClientNotifyTarget(
  service: ReturnType<typeof getService>,
  clientId: string
) {
  const { data } = await service
    .from('clients')
    .select('id, auth_user_id, email, name')
    .eq('id', clientId)
    .maybeSingle()

  if (!data) return null
  const notifyUserId = data.auth_user_id || data.id
  return {
    userId: notifyUserId,
    email: data.email as string | null,
    name: (data.name as string) || 'Valued Client',
  }
}
