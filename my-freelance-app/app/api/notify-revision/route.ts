import { NextResponse } from 'next/server'
import { createClient as createSupabaseService } from '@supabase/supabase-js'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { order_id, order_title, client_name, reason } = body || {}

    if (!order_id) {
      return NextResponse.json({ error: 'Missing order_id' }, { status: 400 })
    }

    // Ensure service role key and URL exist
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.NEXT_PUBLIC_SUPABASE_URL) {
      console.error('Missing SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_URL in environment')
      return NextResponse.json({ error: 'Server misconfiguration: missing Supabase service key' }, { status: 500 })
    }

    // Use service role to create notification for admin
    const service = createSupabaseService(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    // Get the first admin user (try auth_user_id first, then fallback to id)
    const { data: admins, error: adminError } = await service
      .from('clients')
      .select('id, auth_user_id')
      .or('email.ilike.%admin%,user_metadata.role.eq.admin')
      .limit(1)

    if (adminError) {
      console.error('Error fetching admin:', adminError)
      return NextResponse.json({ error: 'Failed to find admin' }, { status: 500 })
    }

    const adminUserId = admins && admins.length > 0 ? (admins[0].auth_user_id || admins[0].id) : null

    if (adminUserId) {
      const { error: notifyError } = await service
        .from('notifications')
        .insert({
          user_id: adminUserId,
          order_id,
          type: 'revision',
          title: 'Revision Requested',
          message: `${client_name} requested revision for "${order_title}": ${reason}`
        })

      if (notifyError) {
        console.error('Notification insert error:', notifyError)
      }
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err))
    console.error('Notify revision exception:', error)
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 })
  }
}
