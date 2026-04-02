import { NextResponse } from 'next/server'
import { createClient as createSupabaseService } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'

export async function DELETE(req: Request) {
  try {
    const body = await req.json()
    const { filePath } = body || {}
    if (!filePath) return NextResponse.json({ error: 'Missing filePath' }, { status: 400 })

    // Check current user from cookies (must be admin)
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || user.user_metadata?.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Ensure service role key and URL exist
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.NEXT_PUBLIC_SUPABASE_URL) {
      console.error('Missing SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_URL in environment')
      return NextResponse.json({ error: 'Server misconfiguration: missing Supabase service key' }, { status: 500 })
    }

    // Use service role to delete file from storage
    const service = createSupabaseService(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    const { error } = await service.storage
      .from('order-files')
      .remove([filePath])

    if (error) {
      console.error('Delete file error:', error)
      return NextResponse.json({ error: error.message || 'Failed to delete file' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('Delete file exception:', err)
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 })
  }
}
