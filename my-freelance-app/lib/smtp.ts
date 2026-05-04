import nodemailer from 'nodemailer'

export function createSmtpTransport() {
  const host = process.env.SMTP_HOST || 'smtp.gmail.com'
  const port = Number(process.env.SMTP_PORT || (process.env.SMTP_SECURE === 'false' ? 587 : 465))
  const secure = process.env.SMTP_SECURE ? process.env.SMTP_SECURE === 'true' : port === 465
  const user = process.env.SMTP_USER || process.env.GMAIL_USER
  const pass = process.env.SMTP_PASS || process.env.GMAIL_PASS

  if (!user || !pass) {
    throw new Error('SMTP_USER/SMTP_PASS or GMAIL_USER/GMAIL_PASS must be set')
  }

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  })
}
