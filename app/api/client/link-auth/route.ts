import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient as createSupabaseService } from '@supabase/supabase-js'

/** Links the logged-in auth user to their clients row (required for online status). */
export async function POST() {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (user.user_metadata?.role === 'admin') {
      return NextResponse.json({ success: true, skipped: true })
    }

    const service = createSupabaseService(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const email = user.email || ''
    let clientId: string | null = null

    const { data: byAuth } = await service
      .from('clients')
      .select('id, auth_user_id')
      .eq('auth_user_id', user.id)
      .maybeSingle()

    if (byAuth?.id) {
      return NextResponse.json({ success: true, clientId: byAuth.id })
    }

    if (email) {
      const { data: byEmail } = await service
        .from('clients')
        .select('id, auth_user_id')
        .eq('email', email)
        .maybeSingle()

      if (byEmail?.id) {
        clientId = byEmail.id
        await service
          .from('clients')
          .update({ auth_user_id: user.id })
          .eq('id', clientId)
      }
    }

    if (!clientId && email) {
      const { data: created } = await service
        .from('clients')
        .insert({
          name: user.user_metadata?.name || email.split('@')[0] || 'Client',
          email,
          auth_user_id: user.id,
          date_registered: new Date().toISOString(),
        })
        .select('id')
        .single()
      clientId = created?.id || null
    }

    await supabase.auth.updateUser({
      data: { client_id: clientId },
    })

    return NextResponse.json({ success: true, clientId })
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err))
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
