import { createClient as createServerClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { createClient as createSupabaseService } from '@supabase/supabase-js'
import { isUserOnline } from '@/lib/presence'

// POST - Update user online status (service role so upsert always works)
export async function POST(req: Request) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { is_online = true } = body

    const service = createSupabaseService(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { error } = await service.from('user_status').upsert(
      {
        user_id: user.id,
        is_online: Boolean(is_online),
        last_seen: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    )

    if (error) throw error

    return NextResponse.json({
      success: true,
      is_online: Boolean(is_online),
      timestamp: new Date().toISOString(),
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update status'
    console.error('user-status POST error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// GET - Check if a user is online
export async function GET(req: Request) {
  const supabase = await createServerClient()
  const { searchParams } = new URL(req.url)
  const userId = searchParams.get('user_id')

  try {
    if (!userId) {
      return NextResponse.json({ error: 'Missing user_id parameter' }, { status: 400 })
    }

    const service = createSupabaseService(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data, error } = await service
      .from('user_status')
      .select('user_id, is_online, last_seen')
      .eq('user_id', userId)
      .maybeSingle()

    if (error) throw error

    if (!data) {
      return NextResponse.json({
        user_id: userId,
        is_online: false,
        last_seen: null,
      })
    }

    return NextResponse.json({
      ...data,
      is_online: isUserOnline(data.is_online, data.last_seen),
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch status'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
