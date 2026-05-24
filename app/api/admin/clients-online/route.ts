import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient as createSupabaseService } from '@supabase/supabase-js'
import { isUserOnline } from '@/lib/presence'

export async function GET() {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || user.user_metadata?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const service = createSupabaseService(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: clients, error: clientsError } = await service
      .from('clients')
      .select('id, auth_user_id, email, name')

    if (clientsError) throw clientsError

    const emailToAuthId = new Map<string, string>()
    const needsLookup = (clients || []).some((c) => !c.auth_user_id && c.email)
    if (needsLookup) {
      const { data: authData } = await service.auth.admin.listUsers({ perPage: 1000 })
      for (const authUser of authData?.users || []) {
        if (authUser.email) {
          emailToAuthId.set(authUser.email.toLowerCase(), authUser.id)
        }
      }
    }

    const authUserIds: string[] = []
    const clientAuthMap = new Map<string, string>()

    for (const client of clients || []) {
      let authUserId = client.auth_user_id as string | null
      if (!authUserId && client.email) {
        authUserId = emailToAuthId.get(client.email.toLowerCase()) || null
        if (authUserId) {
          await service
            .from('clients')
            .update({ auth_user_id: authUserId })
            .eq('id', client.id)
        }
      }
      if (authUserId) {
        clientAuthMap.set(client.id, authUserId)
        authUserIds.push(authUserId)
      }
    }

    const onlineByClientId: Record<string, boolean> = {}
    const onlineClients: Array<{ id: string; name: string }> = []

    if (authUserIds.length === 0) {
      return NextResponse.json({ onlineByClientId, onlineClients })
    }

    const uniqueAuthIds = [...new Set(authUserIds)]
    const { data: statuses, error: statusError } = await service
      .from('user_status')
      .select('user_id, is_online, last_seen')
      .in('user_id', uniqueAuthIds)

    if (statusError) throw statusError

    const statusByUserId = new Map(
      (statuses || []).map((row) => [row.user_id, row])
    )

    for (const client of clients || []) {
      const authUserId = clientAuthMap.get(client.id)
      if (!authUserId) {
        onlineByClientId[client.id] = false
        continue
      }
      const status = statusByUserId.get(authUserId)
      const online = isUserOnline(status?.is_online, status?.last_seen)
      onlineByClientId[client.id] = online
      if (online) {
        onlineClients.push({ id: client.id, name: client.name || 'Client' })
      }
    }

    return NextResponse.json({ onlineByClientId, onlineClients })
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err))
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
