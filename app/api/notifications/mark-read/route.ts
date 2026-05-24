import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { notificationId } = body
    if (!notificationId) {
      return NextResponse.json({ error: 'Missing notificationId' }, { status: 400 })
    }

    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', notificationId)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err))
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
