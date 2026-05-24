import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { resolveStorageImageUrl } from '@/lib/avatar'

export async function GET() {
  try {
    const supabase = await createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const service = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    let name =
      (user.user_metadata?.name as string) ||
      user.email?.split('@')[0] ||
      'User'
    let avatarPath =
      (user.user_metadata?.avatar_url as string) ||
      (user.user_metadata?.avatar as string) ||
      null

    const { data: clientRow } = await service
      .from('clients')
      .select('name, avatar_url')
      .eq('auth_user_id', user.id)
      .maybeSingle()

    if (clientRow?.name) name = clientRow.name
    if (clientRow?.avatar_url) avatarPath = clientRow.avatar_url

    const url = await resolveStorageImageUrl(service, avatarPath)

    return NextResponse.json({ name, url, avatarPath })
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err))
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
