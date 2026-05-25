import type { SupabaseClient } from '@supabase/supabase-js'
import { buildDirectAuthCallbackLink } from '@/lib/auth-link'
import { getAppUrl } from '@/lib/app-url'
import { isSmtpConfigured } from '@/lib/email/config'
import { sendAppEmail } from '@/lib/email/send'
import { emailTemplates } from '@/lib/email-templates'

/**
 * Send a single Brevo confirmation email with a direct production callback link
 * (no Supabase Site URL / localhost redirect).
 */
export async function sendSignupConfirmationEmail(
  service: SupabaseClient,
  email: string,
  password?: string
): Promise<{ sent: boolean; error?: string }> {
  if (!isSmtpConfigured()) {
    return { sent: false, error: 'Email not configured on server' }
  }

  const appUrl = getAppUrl()
  const redirectTo = `${appUrl}/auth/callback?next=${encodeURIComponent('/dashboard')}`

  let data: Awaited<ReturnType<typeof service.auth.admin.generateLink>>['data'] | null =
    null
  let error: Awaited<ReturnType<typeof service.auth.admin.generateLink>>['error'] | null =
    null

  if (password) {
    const signup = await service.auth.admin.generateLink({
      type: 'signup',
      email,
      password,
      options: { redirectTo },
    })
    data = signup.data
    error = signup.error
  }

  if (!data?.properties?.hashed_token) {
    const magic = await service.auth.admin.generateLink({
      type: 'magiclink',
      email,
      options: { redirectTo },
    })
    data = magic.data
    error = magic.error
  }

  if (error) {
    console.error('[send-confirmation] generateLink:', error.message)
    return { sent: false, error: error.message }
  }

  const tokenHash = data?.properties?.hashed_token
  if (!tokenHash) {
    return { sent: false, error: 'Could not generate confirmation link' }
  }

  const confirmLink = buildDirectAuthCallbackLink({
    tokenHash,
    verificationType: data.properties?.verification_type || 'signup',
    nextPath: '/dashboard',
  })

  await sendAppEmail({
    kind: 'auth_email_confirm',
    to: email,
    subject: 'Confirm your Grace Tutors account',
    html: emailTemplates.emailVerification(confirmLink),
    text: `Confirm your account: ${confirmLink}`,
  })

  return { sent: true }
}
