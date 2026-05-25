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
    const email = String(body.email || '').trim().toLowerCase()

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Valid email required' }, { status: 400 })
    }

    if (!isSmtpConfigured()) {
      return NextResponse.json(
        { error: 'Email not configured on server.', fallback: true },
        { status: 503 }
      )
    }

    const service = createSupabaseService(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const appUrl = getAppUrl()
    const { data, error } = await service.auth.admin.generateLink({
      type: 'magiclink',
      email,
      options: {
        redirectTo: `${appUrl}/auth/callback?next=${encodeURIComponent('/dashboard')}`,
      },
    })

    if (error) {
      console.error('[resend-confirmation] generateLink:', error.message)
      return NextResponse.json({
        success: true,
        message: 'If that email is registered, a confirmation link was sent.',
      })
    }

    const tokenHash = data?.properties?.hashed_token
    if (!tokenHash) {
      return NextResponse.json({ error: 'Could not generate confirmation link' }, { status: 500 })
    }

    const confirmLink = buildDirectAuthCallbackLink({
      tokenHash,
      verificationType: data.properties?.verification_type || 'magiclink',
      nextPath: '/dashboard',
    })

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
      appUrl,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to send confirmation'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
