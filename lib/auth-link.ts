import { getAppUrl, getPasswordResetRedirectUrl, getSignupConfirmRedirectUrl } from '@/lib/app-url'

/**
 * Supabase action links often embed redirect_to from Site URL (e.g. localhost).
 * Rewrite redirect_to to the canonical production app URL before emailing.
 */
export function rewriteSupabaseAuthLink(link: string, flow: 'recovery' | 'signup' | 'magiclink' = 'recovery'): string {
  try {
    const url = new URL(link)
    const redirectTo =
      flow === 'recovery'
        ? getPasswordResetRedirectUrl()
        : getSignupConfirmRedirectUrl()

    if (url.searchParams.has('redirect_to')) {
      url.searchParams.set('redirect_to', redirectTo)
    }

    // Some links use redirect_to in hash — handle verify endpoint
    return url.toString()
  } catch {
    return link
  }
}

/** After Supabase verify, user may land on Site URL root with #access_token — build callback URL. */
export function buildCallbackFromHash(hash: string, search = ''): string {
  const base = getAppUrl()
  const params = new URLSearchParams(search)
  const flow = params.get('flow')
  const next = params.get('next') || '/dashboard'
  let path = `${base}/auth/callback?next=${encodeURIComponent(next)}`
  if (flow) path += `&flow=${encodeURIComponent(flow)}`
  if (hash) path += hash.startsWith('#') ? hash : `#${hash}`
  return path
}
