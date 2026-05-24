import { NextResponse } from 'next/server'
import { createClient as createSupabaseService } from '@supabase/supabase-js'

export async function GET() {
  try {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.NEXT_PUBLIC_SUPABASE_URL) {
      return NextResponse.json({ ok: false, error: 'Missing SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_URL' }, { status: 500 })
    }

    const service = createSupabaseService(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

    // Try to list objects in the `order-files` bucket (limit to 1) to verify existence
    const { data, error } = await service.storage.from('order-files').list('', { limit: 1 })

    if (error) {
      // Bucket not found returns error
      return NextResponse.json({ ok: false, error: error.message }, { status: 404 })
    }

    return NextResponse.json({ ok: true, message: 'Bucket exists (order-files)', sample: data?.length ? data[0] : null })
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err))
    console.error('Supabase health exception:', error)
    return NextResponse.json({ ok: false, error: error.message || 'Server error' }, { status: 500 })
  }
}
