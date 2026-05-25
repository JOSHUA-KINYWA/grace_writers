import { getAppUrl, getPasswordResetRedirectUrl, getSignupConfirmRedirectUrl } from '@/lib/app-url'

/** Map Supabase verification_type to verifyOtp type */
function normalizeOtpType(type: string): string {
  if (type === 'magiclink') return 'email'
  if (type === 'signup') return 'signup'
  if (type === 'recovery') return 'recovery'
  return type
}

/**
 * Link that opens our app directly (no Supabase Site URL / localhost redirect).
 * Use hashed_token from auth.admin.generateLink().
 */
export function buildDirectAuthCallbackLink(opts: {
  tokenHash: string
  verificationType: string
  nextPath?: string
  flow?: string
}): string {
  const base = getAppUrl()
  const next = opts.nextPath?.startsWith('/') ? opts.nextPath : '/dashboard'
  const type = normalizeOtpType(opts.verificationType)
  let url = `${base}/auth/callback?token_hash=${encodeURIComponent(opts.tokenHash)}&type=${encodeURIComponent(type)}&next=${encodeURIComponent(next)}`
  if (opts.flow) url += `&flow=${encodeURIComponent(opts.flow)}`
  return url
}

/** Legacy: rewrite redirect_to on Supabase verify URLs (fallback) */
export function rewriteSupabaseAuthLink(link: string, flow: 'recovery' | 'signup' | 'magiclink' = 'recovery'): string {
  try {
    const url = new URL(link)
    const redirectTo =
      flow === 'recovery' ? getPasswordResetRedirectUrl() : getSignupConfirmRedirectUrl()
    if (url.searchParams.has('redirect_to')) {
      url.searchParams.set('redirect_to', redirectTo)
    }
    return url.toString()
  } catch {
    return link
  }
}

export function getProductionAppUrl(): string {
  return getAppUrl()
}
