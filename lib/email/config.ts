export function getAppUrl() {
  return process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
}

export function getSenderName() {
  return process.env.EMAIL_SENDER_NAME || 'Grace Tutors'
}

const DEFAULT_BREVO_SENDER = 'joshuakinywa42@gmail.com'

/** Verified sender in Brevo (must match Supabase custom SMTP sender when using Brevo). */
export function getFromEmail() {
  return (
    process.env.BREVO_SENDER_EMAIL ||
    process.env.SMTP_USER ||
    process.env.GMAIL_USER ||
    process.env.BREVO_SMTP_USER ||
    DEFAULT_BREVO_SENDER
  )
}

export function getAdminEmail() {
  return (
    process.env.ADMIN_EMAIL ||
    process.env.BREVO_SENDER_EMAIL ||
    process.env.SMTP_USER ||
    process.env.GMAIL_USER ||
    ''
  )
}

export function isSmtpConfigured() {
  if (process.env.BREVO_API_KEY && getFromEmail()) return true
  if (process.env.BREVO_SMTP_HOST && process.env.BREVO_SMTP_USER) {
    const pass = process.env.BREVO_SMTP_PASS || process.env.BREVO_API_KEY
    return Boolean(pass)
  }
  const from = getFromEmail()
  const pass = process.env.SMTP_PASS || process.env.GMAIL_PASS
  return Boolean(from && pass)
}
