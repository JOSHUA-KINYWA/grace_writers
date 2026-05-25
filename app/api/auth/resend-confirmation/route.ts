import { NextResponse } from 'next/server'
import { createClient as createSupabaseService } from '@supabase/supabase-js'
import { getSignupConfirmRedirectUrl } from '@/lib/app-url'
import { isSmtpConfigured } from '@/lib/email/config'
import { sendAppEmail } from '@/lib/email/send'
import { emailTemplates } from '@/lib/email-templates'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const email = String(body.email || '').trim().toLowerCase()

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Valid email required' }, { status: 400 })
    }

    if (!isSmtpConfigured()) {
      return NextResponse.json(
        {
          error: 'Email not configured on server.',
          fallback: true,
        },
        { status: 503 }
      )
    }

    const service = createSupabaseService(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const redirectTo = getSignupConfirmRedirectUrl()
    const { data, error } = await service.auth.admin.generateLink({
      type: 'magiclink',
      email,
      options: { redirectTo },
    })

    if (error) {
      console.error('[resend-confirmation] generateLink:', error.message)
      return NextResponse.json({
        success: true,
        message: 'If that email is registered and unverified, a confirmation link was sent.',
      })
    }

    const confirmLink =
      data?.properties?.action_link ||
      (data as { action_link?: string })?.action_link

    if (!confirmLink) {
      return NextResponse.json({ error: 'Could not generate confirmation link' }, { status: 500 })
    }

    await sendAppEmail({
      kind: 'auth_email_confirm',
      to: email,
      subject: 'Confirm your Grace Tutors account',
      html: emailTemplates.emailVerification(confirmLink),
      text: `Confirm your account: ${confirmLink}`,
    })

    return NextResponse.json({
      success: true,
      message: 'Confirmation email sent. Check your inbox and spam folder.',
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to send confirmation'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
