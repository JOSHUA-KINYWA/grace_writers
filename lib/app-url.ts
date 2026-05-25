/**
 * Canonical app URL for emails and server redirects.
 * On Vercel, set NEXT_PUBLIC_APP_URL in project env (recommended).
 * VERCEL_URL is filled automatically if NEXT_PUBLIC_APP_URL is missing.
 */
export function getAppUrl(): string {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '')
  }
  const vercel = process.env.VERCEL_URL
  if (vercel) {
    const host = vercel.replace(/^https?:\/\//, '')
    return `https://${host}`
  }
  return 'http://localhost:3000'
}

/** Auth email links (reset, confirm) should land here — add this URL in Supabase Auth redirect URLs. */
export function getAuthCallbackUrl(nextPath = '/dashboard'): string {
  const base = getAppUrl()
  const next = nextPath.startsWith('/') ? nextPath : `/${nextPath}`
  return `${base}/auth/callback?next=${encodeURIComponent(next)}`
}

export function getPasswordResetRedirectUrl(): string {
  return `${getAuthCallbackUrl('/account/change-password')}&flow=recovery`
}

export function getSignupConfirmRedirectUrl(): string {
  return getAuthCallbackUrl('/dashboard')
}
