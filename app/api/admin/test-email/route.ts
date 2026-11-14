import { isAdminUser } from '@/lib/auth/admin'
import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { getAdminEmail, getFromEmail, isSmtpConfigured } from '@/lib/email/config'
import { sendAppEmail } from '@/lib/email/send'

export async function POST() {
  try {
    const supabase = await createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user || !isAdminUser(user)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (!isSmtpConfigured()) {
      return NextResponse.json(
        {
          error:
            'Email not configured. Set BREVO_API_KEY and BREVO_SENDER_EMAIL (must be verified in Brevo).',
        },
        { status: 400 }
      )
    }

    const to = getAdminEmail() || user.email
    if (!to) {
      return NextResponse.json(
        { error: 'No recipient. Set ADMIN_EMAIL or use an admin account with email.' },
        { status: 400 }
      )
    }

    const fromEmail = getFromEmail()
    const result = await sendAppEmail({
      kind: 'admin_test_email',
      to,
      subject: 'Grace Tutors — Brevo test email',
      html: `<p>This is a test email from your admin panel.</p><p>Sender: ${fromEmail}</p><p>If you received this, Brevo credentials are working.</p>`,
      text: `Test email from Grace Tutors admin panel. Sender: ${fromEmail}`,
    })

    return NextResponse.json({
      ok: true,
      to,
      fromEmail,
      provider: result.provider,
      skipped: result.skipped,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Send failed'
    console.error('[admin/test-email]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
