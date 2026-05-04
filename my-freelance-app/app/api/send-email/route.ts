import { NextResponse } from 'next/server'
import { createSmtpTransport } from '@/lib/smtp'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { to, subject, text, html } = body || {}

    if (!to || !subject || (!text && !html)) {
      return NextResponse.json({ error: 'Missing to/subject/text/html' }, { status: 400 })
    }

    const transporter = createSmtpTransport()
    const fromEmail = process.env.SMTP_USER || process.env.GMAIL_USER || 'noreply@gracewriters.com'

    const info = await transporter.sendMail({
      from: `Grace Writers <${fromEmail}>`,
      to,
      subject,
      text,
      html,
    })

    return NextResponse.json({ success: true, messageId: info.messageId })
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err))
    console.error('Send email exception:', error)
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 })
  }
}
