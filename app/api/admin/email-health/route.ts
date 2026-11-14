import { isAdminUser } from '@/lib/auth/admin'
import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { getAdminEmail, getFromEmail, isSmtpConfigured } from '@/lib/email/config'
import { getAllAdminEmails } from '@/lib/email/admin-notify'

export async function GET() {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user || !isAdminUser(user)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const hasApiKey = Boolean(process.env.BREVO_API_KEY)
  const hasSmtpRelay = Boolean(
    process.env.BREVO_SMTP_HOST && process.env.BREVO_SMTP_USER
  )
  const fromEmail = getFromEmail()
  const adminEmail = getAdminEmail()
  const adminEmails = await getAllAdminEmails()

  return NextResponse.json({
    configured: isSmtpConfigured(),
    provider: hasApiKey ? 'brevo_api' : hasSmtpRelay ? 'brevo_smtp' : 'smtp',
    fromEmail: fromEmail || null,
    adminEmail: adminEmail || null,
    adminEmails,
    recipientCount: adminEmails.length,
    hasApiKey,
    hasSmtpRelay,
    hint: !isSmtpConfigured()
      ? 'Set BREVO_API_KEY and BREVO_SENDER_EMAIL (verified in Brevo) on Vercel.'
      : !adminEmail
        ? 'Set ADMIN_EMAIL to receive admin notification emails.'
        : null,
  })
}
