import { isAdminUser } from '@/lib/auth/admin'
import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { isSmtpConfigured, getFromEmail, getSenderName } from '@/lib/email/config'
import { createSmtpTransport } from '@/lib/smtp'

export async function GET(req: Request) {
  try {
    // Check admin authorization
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || !isAdminUser(user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const diagnostics: Record<string, any> = {}

    // Check SMTP configuration
    diagnostics.smtpConfigured = isSmtpConfigured()
    diagnostics.fromEmail = getFromEmail()
    diagnostics.senderName = getSenderName()

    // Check environment variables
    diagnostics.envVars = {
      brevoApiKey: !!process.env.BREVO_API_KEY ? '✓ set' : '✗ missing',
      brevoSmtpHost: !!process.env.BREVO_SMTP_HOST ? '✓ set' : '✗ missing',
      brevoSmtpUser: !!process.env.BREVO_SMTP_USER ? '✓ set' : '✗ missing',
      brevoSmtpPass: !!process.env.BREVO_SMTP_PASS ? '✓ set (BREVO_SMTP_PASS)' : 
                     !!process.env.BREVO_API_KEY ? '✓ will use BREVO_API_KEY' : '✗ missing',
      gmailUser: !!process.env.GMAIL_USER ? '✓ set' : '✗ missing',
      gmailPass: !!process.env.GMAIL_PASS ? '✓ set' : '✗ missing',
      smtpHost: process.env.SMTP_HOST || '(using default smtp.gmail.com)',
      smtpPort: process.env.SMTP_PORT || '(using default 465)',
    }

    // Test SMTP connection
    diagnostics.smtpConnection = 'testing...'
    try {
      const transporter = createSmtpTransport()
      await transporter.verify()
      diagnostics.smtpConnection = '✓ successful'
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err)
      diagnostics.smtpConnection = `✗ failed: ${errMsg}`
    }

    return NextResponse.json({
      status: 'ok',
      diagnostics,
      message: diagnostics.smtpConfigured ? 'Email is properly configured' : 'Email not configured'
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Diagnostic failed'
    console.error('[email-diagnostics]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
