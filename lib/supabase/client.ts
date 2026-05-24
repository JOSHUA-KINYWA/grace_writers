import { createBrowserClient } from '@supabase/ssr'
import { Database } from '../types/database'

function createNoopClient() {
  const emptyResult = { data: null, error: null, count: 0 }
  const queryBuilder = {
    select: async () => emptyResult,
    insert: async () => emptyResult,
    update: async () => emptyResult,
    delete: async () => emptyResult,
    eq: () => queryBuilder,
    neq: () => queryBuilder,
    in: () => queryBuilder,
    ilike: () => queryBuilder,
    or: () => queryBuilder,
    order: () => queryBuilder,
    limit: () => queryBuilder,
    single: async () => emptyResult,
    maybeSingle: async () => emptyResult,
  }

  return {
    auth: {
      getUser: async () => ({ data: { user: null }, error: null }),
      getSession: async () => ({ data: { session: null }, error: null }),
      onAuthStateChange: () => ({
        data: {
          subscription: {
            unsubscribe: () => {},
          },
        },
      }),
      signInWithPassword: async () => ({
        data: { user: null, session: null },
        error: {
          message: "Supabase client not initialized. Verify NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY are set.",
          status: 500,
        },
      }),
      signOut: async () => ({ error: null }),
      updateUser: async () => ({ data: { user: null }, error: null }),
    },
    from: () => queryBuilder,
    channel: () => ({
      on() {
        return this
      },
      subscribe() {
        return this
      },
      send: async () => ({ error: null }),
      unsubscribe: async () => ({ error: null }),
    }),
    removeChannel: () => {},
  }
}

export function createClient(): any {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

  if (!url || !anonKey) {
    // Avoid crashing SSR/prerender paths (e.g. /_not-found) when env vars are absent at build time.
    // Runtime functionality still requires proper env vars in deployment settings.
    return createNoopClient()
  }

  return createBrowserClient<Database>(
    url,
    anonKey
  ) as any
}
