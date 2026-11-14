import { isAdminUser } from '@/lib/auth/admin'
import { createClient as createServiceClient } from '@supabase/supabase-js'

function getService() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function getAdminAuthUserIds(): Promise<string[]> {
  const service = getService()
  const { data } = await service.auth.admin.listUsers({ perPage: 1000 })
  const ids: string[] = []
  for (const user of data?.users || []) {
    if (isAdminUser(user)) {
      ids.push(user.id)
    }
  }

  if (ids.length === 0) {
    const adminEmail = (
      process.env.ADMIN_EMAIL ||
      process.env.BREVO_SENDER_EMAIL ||
      ''
    )
      .trim()
      .toLowerCase()
    if (adminEmail) {
      for (const user of data?.users || []) {
        if (user.email?.toLowerCase() === adminEmail) {
          ids.push(user.id)
          break
        }
      }
    }
  }

  return ids
}

export async function getPrimaryAdminEmail(): Promise<string | null> {
  const configured =
    process.env.ADMIN_EMAIL ||
    process.env.BREVO_SENDER_EMAIL ||
    process.env.GMAIL_USER ||
    process.env.SMTP_USER
  if (configured) return configured

  const service = getService()
  const { data } = await service.auth.admin.listUsers({ perPage: 1000 })
  for (const user of data?.users || []) {
    if (isAdminUser(user) && user.email) {
      return user.email
    }
  }
  return null
}
