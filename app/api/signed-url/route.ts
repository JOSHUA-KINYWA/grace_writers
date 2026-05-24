import { NextResponse, NextRequest } from 'next/server'
import { createClient as createSupabaseService } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'

async function clientOwnsOrder(supabase: any, user: any, orderId: string) {
  const { data: client, error: clientError } = await supabase
    .from('clients')
    .select('id, auth_user_id')
    .or(
      user.email
        ? `auth_user_id.eq.${user.id},email.eq.${user.email}`
        : `auth_user_id.eq.${user.id}`
    )
    .limit(1)
    .maybeSingle()

  if (clientError || !client) return false

  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select('id')
    .eq('id', orderId)
    .eq('client_id', client.id)
    .maybeSingle()

  return !orderError && Boolean(order)
}

async function authorizeAndValidate(supabase: any, user: any, filePath: string) {
  if (user.user_metadata?.role === 'admin') return { ok: true }

  const pathParts = filePath.split('/').filter(Boolean)
  const firstPart = pathParts[0]

  if (firstPart === 'order-clarifications' && pathParts[1]) {
    const orderId = pathParts[1]
    const allowed = await clientOwnsOrder(supabase, user, orderId)
    return allowed
      ? { ok: true }
      : { ok: false, status: 403, message: 'Access denied to this order' }
  }

  if (firstPart?.startsWith('order-')) {
    const orderId = firstPart.replace('order-', '')
    if (!orderId) return { ok: false, status: 400, message: 'Invalid file path' }

    const allowed = await clientOwnsOrder(supabase, user, orderId)
    if (!allowed) return { ok: false, status: 403, message: 'Access denied to this order' }
    return { ok: true }
  }

  // Allow access to files stored under revision-<revisionId>/...
  if (firstPart?.startsWith('revision-')) {
    const revisionId = firstPart.replace('revision-', '')
    if (!revisionId) return { ok: false, status: 400, message: 'Invalid file path' }

    const { data: revision, error: revError } = await supabase
      .from('revisions')
      .select('id, order_id')
      .eq('id', revisionId)
      .single()

    if (revError || !revision) return { ok: false, status: 404, message: 'Revision not found' }

    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('id')
      .eq('email', user.email)
      .single()

    if (clientError || !client) return { ok: false, status: 404, message: 'Client not found' }

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id')
      .eq('id', revision.order_id)
      .eq('client_id', client.id)
      .single()

    if (orderError || !order) return { ok: false, status: 403, message: 'Access denied to this order' }

    return { ok: true }
  }

  if (firstPart === 'portfolio') {
    return { ok: true }
  }

  if (firstPart === 'avatars') {
    const ownerId = pathParts[1]
    if (ownerId === user.id || user.user_metadata?.role === 'admin') return { ok: true }
    return { ok: false, status: 403, message: 'Access denied to this file' }
  }

  if (firstPart !== user.id) return { ok: false, status: 403, message: 'Access denied to this file' }
  return { ok: true }
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const filePath = url.searchParams.get('filePath')
    if (!filePath) return NextResponse.json({ error: 'Missing filePath' }, { status: 400 })

    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const authCheck = await authorizeAndValidate(supabase, user, filePath)
    if (!authCheck.ok) return NextResponse.json({ error: authCheck.message }, { status: authCheck.status })

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.NEXT_PUBLIC_SUPABASE_URL) {
      console.error('Missing SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_URL in environment')
      return NextResponse.json({ error: 'Server misconfiguration: missing Supabase service key' }, { status: 500 })
    }

    const service = createSupabaseService(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
    const { data, error } = await service.storage.from('order-files').createSignedUrl(filePath, 60 * 60)
    if (error) {
      console.error('Signed URL error:', error)
      return NextResponse.json({ error: error.message || 'Failed to create signed URL' }, { status: 500 })
    }

    // Log for debugging: filePath and signed URL
    console.debug('[signed-url][GET] filePath=', filePath)
    console.debug('[signed-url][GET] signedUrl=', data?.signedUrl)

    // Redirect to signed URL so browser can download directly
    return NextResponse.redirect(data.signedUrl)
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err))
    console.error('Signed URL exception:', error)
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { filePath } = body || {}
    if (!filePath) return NextResponse.json({ error: 'Missing filePath' }, { status: 400 })

    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const authCheck = await authorizeAndValidate(supabase, user, filePath)
    if (!authCheck.ok) return NextResponse.json({ error: authCheck.message }, { status: authCheck.status })

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.NEXT_PUBLIC_SUPABASE_URL) {
      console.error('Missing SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_URL in environment')
      return NextResponse.json({ error: 'Server misconfiguration: missing Supabase service key' }, { status: 500 })
    }

    const service = createSupabaseService(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
    const { data, error } = await service.storage.from('order-files').createSignedUrl(filePath, 60 * 60)

    if (error) {
      console.error('Signed URL error:', error)
      return NextResponse.json({ error: error.message || 'Failed to create signed URL' }, { status: 500 })
    }

    console.debug('[signed-url][POST] filePath=', filePath)
    console.debug('[signed-url][POST] signedUrl=', data?.signedUrl)

    return NextResponse.json({ signedUrl: data.signedUrl })
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err))
    console.error('Signed URL exception (POST):', error)
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 })
  }
}
