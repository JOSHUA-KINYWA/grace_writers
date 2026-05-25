import { NextResponse } from 'next/server'
import { createClient as createSupabaseService } from '@supabase/supabase-js'
import { getPasswordResetRedirectUrl } from '@/lib/app-url'
import { isSmtpConfigured } from '@/lib/email/config'
import { sendAppEmail } from '@/lib/email/send'
import { emailTemplates } from '@/lib/email-templates'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const email = String(body.email || '')
      .trim()
      .toLowerCase()

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Valid email required' }, { status: 400 })
    }

    if (!isSmtpConfigured()) {
      return NextResponse.json(
        {
          error:
            'App email is not configured. Use Supabase Auth SMTP in the dashboard, or set BREVO_API_KEY on the server.',
          fallback: true,
        },
        { status: 503 }
      )
    }

    const service = createSupabaseService(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const redirectTo = getPasswordResetRedirectUrl()
    const { data, error } = await service.auth.admin.generateLink({
      type: 'recovery',
      email,
      options: { redirectTo },
    })

    if (error) {
      console.error('[request-password-reset] generateLink:', error.message)
      // Do not reveal whether the email exists
      return NextResponse.json({
        success: true,
        message:
          'If an account exists for that email, a reset link has been sent. Check your inbox and spam folder.',
      })
    }

    const resetLink =
      data?.properties?.action_link ||
      (data as { action_link?: string })?.action_link

    if (!resetLink) {
      return NextResponse.json(
        { error: 'Could not generate reset link. Check Supabase Auth settings.' },
        { status: 500 }
      )
    }

    await sendAppEmail({
      kind: 'auth_password_reset',
      to: email,
      subject: 'Reset your Grace Tutors password',
      html: emailTemplates.passwordReset(resetLink),
      text: `Reset your password: ${resetLink}`,
    })

    return NextResponse.json({
      success: true,
      message:
        'If an account exists for that email, a reset link has been sent. Check your inbox and spam folder.',
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to send reset email'
    console.error('[request-password-reset]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
