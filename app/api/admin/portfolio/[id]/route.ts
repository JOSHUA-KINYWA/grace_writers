import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'

async function requireAdmin(supabase: Awaited<ReturnType<typeof createServerClient>>) {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false as const, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  if (user.user_metadata?.role !== 'admin') {
    return { ok: false as const, response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }
  return { ok: true as const }
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createServerClient()
    const auth = await requireAdmin(supabase)
    if (!auth.ok) return auth.response

    const { data, error } = await supabase
      .from('portfolio_items')
      .select('*, services:service_id(id, title, category)')
      .eq('id', id)
      .maybeSingle()

    if (error) throw error
    if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    return NextResponse.json({ item: data })
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err))
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createServerClient()
    const auth = await requireAdmin(supabase)
    if (!auth.ok) return auth.response

    const body = await req.json()
    const {
      title,
      description,
      client_name,
      service_id,
      technologies,
      results,
      featured,
      images,
    } = body || {}

    if (!title) return NextResponse.json({ error: 'Missing title' }, { status: 400 })

    const updatePayload: Record<string, unknown> = {
      title: String(title),
      description: description ? String(description) : null,
      client_name: client_name ? String(client_name) : null,
      service_id: service_id || null,
      technologies: Array.isArray(technologies)
        ? technologies
        : technologies
          ? String(technologies).split(',').map((s: string) => s.trim())
          : [],
      results: results || null,
      featured: Boolean(featured),
    }

    if (Array.isArray(images)) {
      updatePayload.images = images
    }

    const { data, error } = await supabase
      .from('portfolio_items')
      .update(updatePayload)
      .eq('id', id)
      .select('*, services:service_id(id, title, category)')
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, item: data })
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err))
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createServerClient()
    const auth = await requireAdmin(supabase)
    if (!auth.ok) return auth.response

    const { error } = await supabase.from('portfolio_items').delete().eq('id', id)
    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err))
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
