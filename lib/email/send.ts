import { createSmtpTransport } from '@/lib/smtp'
import { getFromEmail, getSenderName, isSmtpConfigured } from '@/lib/email/config'
import { canSendEmail, type AppEmailKind } from '@/lib/email/policy'

export type SendAppEmailInput = {
  kind: AppEmailKind
  to: string | string[]
  subject: string
  text?: string
  html?: string
  fromName?: string
}

export type SendAppEmailResult = {
  success: true
  provider: 'brevo' | 'smtp' | 'skipped'
  messageId?: string
  skipped?: boolean
}

/** App emails: policy gate → Brevo API OR Brevo SMTP (never both). */
export async function sendAppEmail(
  input: SendAppEmailInput
): Promise<SendAppEmailResult> {
  const { kind, to, subject, text, html, fromName } = input

  if (!canSendEmail(kind)) {
    console.info(`[email] skipped disabled kind: ${kind}`)
    return { success: true, provider: 'skipped', skipped: true }
  }

  if (!to || !subject || (!text && !html)) {
    throw new Error('Missing to, subject, or body')
  }
  if (!isSmtpConfigured()) {
    throw new Error('SMTP not configured: Set BREVO_API_KEY or SMTP/Gmail credentials in environment variables')
  }

  const fromEmail = getFromEmail()
  if (!fromEmail) {
    throw new Error('BREVO_SENDER_EMAIL, SMTP_USER, or GMAIL_USER must be set in environment variables')
  }

  const senderName = fromName || getSenderName()
  const brevoKey = process.env.BREVO_API_KEY

  if (brevoKey) {
    const payload = {
      sender: { name: senderName, email: fromEmail },
      to: (Array.isArray(to) ? to : [to]).map((email) => ({ email })),
      subject,
      textContent: text || undefined,
      htmlContent: html || undefined,
    }

    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': brevoKey,
      },
      body: JSON.stringify(payload),
    })

    const resText = await res.text()
    if (!res.ok) {
      let errorDetail = resText
      try {
        const parsed = JSON.parse(resText) as { message?: string; detail?: string }
        errorDetail = parsed.message || parsed.detail || resText
      } catch {
        /* use resText as is */
      }
      console.error(`[email] Brevo API error (${kind}):`, res.status, errorDetail)
      throw new Error(`Brevo API ${res.status}: ${errorDetail}. Verify ${fromEmail} is a confirmed Brevo sender.`)
    }

    let messageId: string | undefined
    try {
      const parsed = JSON.parse(resText) as { messageId?: string }
      messageId = parsed.messageId
    } catch {
      /* ignore */
    }

    return { success: true, provider: 'brevo', messageId }
  }

  const transporter = createSmtpTransport()
  const info = await transporter.sendMail({
    from: `${senderName} <${fromEmail}>`,
    to,
    subject,
    text,
    html,
  })

  return { success: true, provider: 'smtp', messageId: info.messageId }
}
