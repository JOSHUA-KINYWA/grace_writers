import type { User } from '@supabase/supabase-js'

/**
 * Prefer local session (no network). Use on mount across the app.
 * Extensions (e.g. Urban VPN) can break fetch to Supabase and make getUser() throw.
 */
export async function getCachedAuthUser(supabase: {
  auth: {
    getSession: () => Promise<{ data: { session: { user: User } | null }; error: unknown }>
    getUser?: () => Promise<{ data: { user: User | null }; error: unknown }>
  }
}): Promise<User | null> {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.user) return session.user
  } catch {
    // ignore — fall through
  }

  if (!supabase.auth.getUser) return null

  try {
    const { data: { user } } = await supabase.auth.getUser()
    return user ?? null
  } catch {
    return null
  }
}
