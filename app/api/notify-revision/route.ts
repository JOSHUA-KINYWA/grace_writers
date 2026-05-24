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

    // Get the first admin user from profiles, falling back to auth user lookup
    let adminUserId: string | null = null

    const { data: adminProfiles, error: profileError } = await service
      .from('profiles')
      .select('id')
      .eq('account_type', 'admin')
      .limit(1)

    if (profileError) {
      console.error('Error fetching admin profile:', profileError)
    } else if (adminProfiles && adminProfiles.length > 0) {
      adminUserId = adminProfiles[0].id
    }

    if (!adminUserId) {
      const { data: adminUsers, error: userError } = await service
        .from('users')
        .select('id, user_metadata')
        .or('user_metadata->>role.eq.admin,email.ilike.%admin%')
        .limit(1)

      if (userError) {
        console.error('Error fetching admin user:', userError)
      } else if (adminUsers && adminUsers.length > 0) {
        adminUserId = adminUsers[0].id
      }
    }

    if (!adminUserId) {
      console.error('No admin user found for revision notification')
      return NextResponse.json({ error: 'Failed to find admin' }, { status: 500 })
    }

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
