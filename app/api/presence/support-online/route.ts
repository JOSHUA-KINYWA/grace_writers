import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { isUserOnline } from '@/lib/presence'

/** Whether any admin is currently online (for client live chat / support indicator). */
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

    const { data: authData } = await service.auth.admin.listUsers({ perPage: 1000 })
    const adminIds = (authData?.users || [])
      .filter((u) => u.user_metadata?.role === 'admin')
      .map((u) => u.id)

    if (adminIds.length === 0) {
      return NextResponse.json({ isOnline: false, is_online: false, label: 'Support' })
    }

    const { data: statuses } = await service
      .from('user_status')
      .select('user_id, is_online, last_seen')
      .in('user_id', adminIds)

    const online = (statuses || []).some((row) =>
      isUserOnline(row.is_online, row.last_seen)
    )

    return NextResponse.json({
      isOnline: online,
      is_online: online,
      label: 'Support',
    })
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err))
    return NextResponse.json(
      { isOnline: false, is_online: false, error: error.message },
      { status: 500 }
    )
  }
}
