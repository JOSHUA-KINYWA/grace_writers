type AdminUser = {
  email?: string | null
  app_metadata?: Record<string, unknown> | null
} | null | undefined

/** Admin status comes from server-managed app metadata or a server-side email allowlist. */
export function isAdminUser(user: AdminUser): boolean {
  if (!user) return false
  if (user.app_metadata?.role === 'admin') return true

  const allowlist = [process.env.ADMIN_EMAILS, process.env.ADMIN_EMAIL, process.env.BREVO_SENDER_EMAIL]
    .filter(Boolean)
    .flatMap((value) => String(value).split(/[;,\s]+/))
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean)

  const email = user.email?.trim().toLowerCase()
  return Boolean(email && allowlist.includes(email))
}
