import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// POST - Update user online status
export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  try {
    const body = await req.json()
    const { is_online = true } = body

    // Update or create user status
    const { error } = await supabase
      .from('user_status')
      .upsert({
        user_id: user.id,
        is_online,
        last_seen: new Date().toISOString()
      })

    if (error) throw error

    return NextResponse.json({ success: true, is_online, timestamp: new Date().toISOString() })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to update status' },
      { status: 500 }
    )
  }
}

// GET - Check if user/client is online
export async function GET(req: Request) {
  const supabase = await createClient()
  const { searchParams } = new URL(req.url)
  const userId = searchParams.get('user_id')

  try {
    if (!userId) {
      return NextResponse.json(
        { error: 'Missing user_id parameter' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('user_status')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (error && error.code === 'PGRST116') {
      // User not found in status table
      return NextResponse.json({
        user_id: userId,
        is_online: false,
        last_seen: null
      })
    }

    if (error) throw error

    // Check if user was seen in last 5 minutes
    const lastSeen = new Date(data.last_seen)
    const now = new Date()
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000)

    return NextResponse.json({
      ...data,
      is_online: data.is_online && lastSeen > fiveMinutesAgo
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch status' },
      { status: 500 }
    )
  }
}
