import { NextResponse } from 'next/server'
import { createClient as createSupabaseService } from '@supabase/supabase-js'
import { buildDirectAuthCallbackLink } from '@/lib/auth-link'
import { getAppUrl } from '@/lib/app-url'
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
            'App email is not configured. Set BREVO_API_KEY and BREVO_SENDER_EMAIL on Vercel.',
          fallback: true,
        },
        { status: 503 }
      )
    }

    const service = createSupabaseService(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const appUrl = getAppUrl()
    const { data, error } = await service.auth.admin.generateLink({
      type: 'recovery',
      email,
      options: {
        redirectTo: `${appUrl}/auth/callback?next=${encodeURIComponent('/account/change-password')}&flow=recovery`,
      },
    })

    if (error) {
      console.error('[request-password-reset] generateLink:', error.message)
      return NextResponse.json({
        success: true,
        message:
          'If an account exists for that email, a reset link has been sent. Check your inbox and spam folder.',
      })
    }

    const tokenHash = data?.properties?.hashed_token
    if (!tokenHash) {
      return NextResponse.json(
        { error: 'Could not generate reset link. Check Supabase service role key.' },
        { status: 500 }
      )
    }

    const resetLink = buildDirectAuthCallbackLink({
      tokenHash,
      verificationType: data.properties?.verification_type || 'recovery',
      nextPath: '/account/change-password',
      flow: 'recovery',
    })

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
      appUrl,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to send reset email'
    console.error('[request-password-reset]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
