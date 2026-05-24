import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient as createSupabaseService } from '@supabase/supabase-js'

export async function GET(req: Request) {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const category = searchParams.get('category')

    const service = createSupabaseService(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    let serviceIdsForCategory: string[] | null = null
    if (category && category !== 'all') {
      const { data: servicesInCategory, error: servicesError } = await service
        .from('services')
        .select('id')
        .eq('category', category)
      if (servicesError) throw servicesError
      serviceIdsForCategory = (servicesInCategory || []).map((row) => row.id)
      if (serviceIdsForCategory.length === 0) {
        return NextResponse.json({ items: [], categories: [] })
      }
    }

    let query = service
      .from('portfolio_items')
      .select('id, title, slug, description, client_name, technologies, results, images, featured, display_order, created_at, service_id, services:service_id(id, title, category)')
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: false })

    if (serviceIdsForCategory) {
      query = query.in('service_id', serviceIdsForCategory)
    }

    const { data, error } = await query
    if (error) throw error

    const items = await Promise.all(
      (data || []).map(async (item: any) => {
        if (!item.images?.length) return item
        const resolved: string[] = []
        for (const img of item.images) {
          if (!img) continue
          if (typeof img === 'string' && (img.startsWith('http://') || img.startsWith('https://'))) {
            resolved.push(img)
            continue
          }
          try {
            const { data: signed } = await service.storage
              .from('order-files')
              .createSignedUrl(img, 60 * 60)
            resolved.push(signed?.signedUrl || img)
          } catch {
            resolved.push(img)
          }
        }
        return { ...item, images: resolved, storagePaths: item.images || [] }
      })
    )

    const categories = Array.from(
      new Set(
        items
          .map((item: any) => item.services?.category)
          .filter((value: string | undefined): value is string => Boolean(value))
      )
    ).sort()

    return NextResponse.json({ items, categories })
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err))
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
