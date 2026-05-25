import { getAdminEmail, isSmtpConfigured } from '@/lib/email/config'
import { sendAppEmail, type SendAppEmailInput } from '@/lib/email/send'
import { createClient as createServiceClient } from '@supabase/supabase-js'

function getService() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

/** All addresses that should receive admin alert emails. */
export async function getAllAdminEmails(): Promise<string[]> {
  const emails = new Set<string>()
  const configured = getAdminEmail()
  if (configured) emails.add(configured.trim().toLowerCase())

  const service = getService()
  const { data } = await service.auth.admin.listUsers({ perPage: 1000 })
  for (const user of data?.users || []) {
    if (user.user_metadata?.role === 'admin' && user.email) {
      emails.add(user.email.trim().toLowerCase())
    }
  }

  return [...emails]
}

/** Send the same admin alert to every admin inbox (Brevo). */
export async function sendEmailToAllAdmins(
  input: Omit<SendAppEmailInput, 'to'>
): Promise<{ sent: number; skipped: boolean; errors: string[] }> {
  if (!isSmtpConfigured()) {
    return { sent: 0, skipped: true, errors: ['Email not configured'] }
  }

  const recipients = await getAllAdminEmails()
  if (!recipients.length) {
    return {
      sent: 0,
      skipped: true,
      errors: ['No admin email — set ADMIN_EMAIL or add email to admin users'],
    }
  }

  const errors: string[] = []
  let sent = 0

  await Promise.all(
    recipients.map(async (to) => {
      try {
        await sendAppEmail({ ...input, to })
        sent++
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        errors.push(`${to}: ${msg}`)
        console.error(`[admin-email] failed for ${to}:`, err)
      }
    })
  )

  return { sent, skipped: false, errors }
}
