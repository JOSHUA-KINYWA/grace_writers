import nodemailer from 'nodemailer'
import type { TransportOptions } from 'nodemailer'

export function createSmtpTransport() {
  const useBrevoRelay = Boolean(process.env.BREVO_SMTP_HOST)

  const host = useBrevoRelay
    ? process.env.BREVO_SMTP_HOST!
    : process.env.SMTP_HOST || 'smtp.gmail.com'

  const port = useBrevoRelay
    ? Number(process.env.BREVO_SMTP_PORT || 587)
    : Number(process.env.SMTP_PORT || (process.env.SMTP_SECURE === 'false' ? 587 : 465))

  const secure = useBrevoRelay
    ? process.env.BREVO_SMTP_SECURE === 'true'
    : process.env.SMTP_SECURE
      ? process.env.SMTP_SECURE === 'true'
      : port === 465

  const user = useBrevoRelay
    ? process.env.BREVO_SMTP_USER
    : process.env.SMTP_USER || process.env.GMAIL_USER

  const pass = useBrevoRelay
    ? process.env.BREVO_SMTP_PASS || process.env.BREVO_API_KEY
    : process.env.SMTP_PASS || process.env.GMAIL_PASS

  const transportOptions: TransportOptions & {
    host: string
    port: number
    secure: boolean
    auth?: { user: string; pass: string }
  } = { host, port, secure }

  if (user && pass) {
    transportOptions.auth = { user, pass }
  }

  return nodemailer.createTransport(transportOptions)
}
