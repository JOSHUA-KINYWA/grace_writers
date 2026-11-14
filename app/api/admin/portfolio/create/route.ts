import { isAdminUser } from '@/lib/auth/admin'
import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'

async function requireAdmin(supabase: any) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false as const, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  if (!isAdminUser(user)) {
    return { ok: false as const, response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }
  return { ok: true as const }
}

function slugify(text: string) {
  return text
    .toString()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9\-]/g, '')
    .replace(/\-+/g, '-')
    .replace(/^\-|\-$/g, '')
}

export async function POST(req: Request) {
  try {
    const supabase = await createServerClient()
    const auth = await requireAdmin(supabase)
    if (!auth.ok) return auth.response

    const body = await req.json()
    const {
      title,
      slug: rawSlug,
      description,
      client_name,
      service_id,
      technologies,
      results,
      featured,
      images
    } = body || {}

    if (!title) return NextResponse.json({ error: 'Missing title' }, { status: 400 })

    const baseSlug = rawSlug ? String(rawSlug) : slugify(String(title))
    let finalSlug = baseSlug

    // Ensure uniqueness
    const { data: existing } = await supabase
      .from('portfolio_items')
      .select('id')
      .eq('slug', finalSlug)
      .limit(1)

    if (existing && existing.length > 0) {
      finalSlug = `${baseSlug}-${Date.now()}`
    }

    const insertPayload: any = {
      title: String(title),
      slug: finalSlug,
      description: description ? String(description) : null,
      client_name: client_name ? String(client_name) : null,
      service_id: service_id || null,
      technologies: Array.isArray(technologies) ? technologies : (technologies ? String(technologies).split(',').map((s: string) => s.trim()) : []),
      results: results || null,
      featured: Boolean(featured || false),
      images: Array.isArray(images) ? images : (images ? [images] : []),
      display_order: 0
    }

    const { data: inserted, error: insertErr } = await supabase
      .from('portfolio_items')
      .insert(insertPayload)
      .select()
      .single()

    if (insertErr) {
      console.error('Failed to insert portfolio item:', insertErr)
      return NextResponse.json({ error: insertErr.message || 'Insert failed' }, { status: 500 })
    }

    return NextResponse.json({ success: true, item: inserted })
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err))
    console.error('Portfolio create error:', error)
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 })
  }
}
