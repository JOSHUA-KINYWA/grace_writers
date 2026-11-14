import { isAdminUser } from '@/lib/auth/admin'
import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { isUserOnline } from '@/lib/presence'

/** Admin: is the client in this chat room online? */
export async function GET(req: Request) {
  try {
    const supabase = await createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user || !isAdminUser(user)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const chatRoomId = new URL(req.url).searchParams.get('chatRoomId')
    if (!chatRoomId) {
      return NextResponse.json({ error: 'Missing chatRoomId' }, { status: 400 })
    }

    const service = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: room } = await service
      .from('chat_rooms')
      .select('client_id')
      .eq('id', chatRoomId)
      .maybeSingle()

    if (!room?.client_id) {
      return NextResponse.json({ isOnline: false, is_online: false, label: 'Client' })
    }

    const { data: client } = await service
      .from('clients')
      .select('auth_user_id, name')
      .eq('id', room.client_id)
      .maybeSingle()

    const authUserId = client?.auth_user_id
    if (!authUserId) {
      return NextResponse.json({ isOnline: false, is_online: false, label: client?.name || 'Client' })
    }

    const { data: status } = await service
      .from('user_status')
      .select('is_online, last_seen')
      .eq('user_id', authUserId)
      .maybeSingle()

    const online = status ? isUserOnline(status.is_online, status.last_seen) : false
    const label = client?.name || 'Client'

    return NextResponse.json({ isOnline: online, is_online: online, label })
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err))
    return NextResponse.json(
      { isOnline: false, is_online: false, error: error.message },
      { status: 500 }
    )
  }
}
