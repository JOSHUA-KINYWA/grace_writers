import { createClient } from '@/lib/supabase/server'
import { createClient as createSupabaseService } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

function getServiceClient() {
  return createSupabaseService(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

const RATING_TYPES = ['order', 'platform'] as const

// POST - Create or update order/platform rating
export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const isAdmin = user.user_metadata?.role === 'admin'
  const service = getServiceClient()

  try {
    const body = await req.json()
    const {
      order_id,
      rating,
      review_comment,
      rating_type = 'order',
      client_display_name,
    } = body

    if (!rating || rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'Rating must be between 1 and 5' }, { status: 400 })
    }

    const type = RATING_TYPES.includes(rating_type) ? rating_type : 'order'

    if (type === 'order' && !order_id) {
      return NextResponse.json({ error: 'order_id required for order ratings' }, { status: 400 })
    }

    let clientId: string | null = null

    if (type === 'order') {
      const { data: order, error: orderError } = await service
        .from('orders')
        .select('id, client_id')
        .eq('id', order_id)
        .single()

      if (orderError || !order) {
        return NextResponse.json({ error: 'Order not found' }, { status: 404 })
      }

      clientId = order.client_id

      if (!isAdmin) {
        const { data: clientData } = await service
          .from('clients')
          .select('auth_user_id, email, name')
          .eq('id', order.client_id)
          .single()

        if (!clientData) {
          return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
        }

        if (!clientData.auth_user_id) {
          await service
            .from('clients')
            .update({ auth_user_id: user.id })
            .eq('id', order.client_id)
        } else if (clientData.auth_user_id !== user.id) {
          return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
        }
      } else {
        clientId = order.client_id
      }
    } else {
      const { data: clientData } = await service
        .from('clients')
        .select('id, auth_user_id, name')
        .or(
          user.email
            ? `auth_user_id.eq.${user.id},email.eq.${user.email}`
            : `auth_user_id.eq.${user.id}`
        )
        .limit(1)
        .maybeSingle()

      if (!clientData && !isAdmin) {
        return NextResponse.json({ error: 'Client profile not found' }, { status: 404 })
      }
      clientId = clientData?.id || null
      if (!clientId) {
        return NextResponse.json({ error: 'Client profile required' }, { status: 400 })
      }
    }

    const displayName =
      client_display_name ||
      (user.user_metadata?.name as string) ||
      user.email?.split('@')[0] ||
      'Client'

    const matchQuery = service.from('order_ratings').select('id')
    if (type === 'order') {
      matchQuery.eq('order_id', order_id).eq('rating_type', 'order')
    } else {
      matchQuery.eq('client_id', clientId!).eq('rating_type', 'platform')
    }

    const { data: existingRating } = await matchQuery.maybeSingle()

    const payload = {
      order_id: type === 'order' ? order_id : null,
      client_id: clientId,
      rating,
      review_comment: review_comment || null,
      rating_type: type,
      client_display_name: displayName,
      is_published: true,
      is_visible: true,
      updated_at: new Date().toISOString(),
    }

    let result
    if (existingRating) {
      const { data, error } = await service
        .from('order_ratings')
        .update(payload)
        .eq('id', existingRating.id)
        .select()
        .single()

      if (error) throw error
      result = data
    } else {
      const { data, error } = await service
        .from('order_ratings')
        .insert({
          ...payload,
          created_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (error) throw error
      result = data
    }

    return NextResponse.json(result, { status: 201 })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to save rating'
    const code = typeof error === 'object' && error !== null && 'code' in error
      ? String((error as { code: string }).code)
      : null

    if (code === 'PGRST205' || message.includes('order_ratings')) {
      return NextResponse.json(
        {
          error:
            'Ratings are not set up yet. Run migrations/enhance_order_ratings.sql in Supabase SQL Editor.',
        },
        { status: 503 }
      )
    }

    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// GET - Fetch ratings (order, completed, public feed, admin list)
export async function GET(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const isAdmin = user?.user_metadata?.role === 'admin'
  const service = getServiceClient()
  const { searchParams } = new URL(req.url)
  const orderId = searchParams.get('order_id')
  const completed = searchParams.get('completed') === 'true'
  const isPublic = searchParams.get('public') === 'true'
  const adminList = searchParams.get('admin') === 'true'

  try {
    if (isPublic) {
      let query = service
        .from('order_ratings')
        .select('id, rating, review_comment, rating_type, client_display_name, admin_reply, admin_reply_at, created_at, order_id, order:orders(id, title)')
        .eq('is_visible', true)
        .eq('is_published', true)
        .order('created_at', { ascending: false })
        .limit(100)

      const { data, error } = await query
      if (error && (error as { code?: string }).code === 'PGRST205') {
        return NextResponse.json([])
      }
      if (error) throw error

      return NextResponse.json(
        (data || []).map((row: Record<string, unknown>) => ({
          ...row,
          order: Array.isArray(row.order) ? row.order[0] : row.order,
        }))
      )
    }

    if (adminList) {
      if (!isAdmin) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }

      const { data, error } = await service
        .from('order_ratings')
        .select('*, order:orders(id, title), client:clients(id, name, email)')
        .order('created_at', { ascending: false })
        .limit(200)

      if (error && (error as { code?: string }).code === 'PGRST205') {
        return NextResponse.json([])
      }
      if (error) throw error

      return NextResponse.json(data || [])
    }

    if (!orderId && !completed) {
      return NextResponse.json(
        { error: 'Missing order_id, completed, public, or admin parameter' },
        { status: 400 }
      )
    }

    if (completed) {
      if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }

      let clientId = user.user_metadata?.client_id as string | undefined

      if (!clientId) {
        const { data: clientData } = await service
          .from('clients')
          .select('id')
          .or(
            user.email
              ? `auth_user_id.eq.${user.id},email.eq.${user.email}`
              : `auth_user_id.eq.${user.id}`
          )
          .limit(1)
          .maybeSingle()

        clientId = clientData?.id
      }

      if (!clientId) return NextResponse.json([])

      const { data: completedOrders, error: ordersError } = await service
        .from('orders')
        .select('id, title, created_at')
        .eq('client_id', clientId)
        .eq('status', 'completed')

      if (ordersError) throw ordersError
      if (!completedOrders?.length) return NextResponse.json([])

      const orderIds = completedOrders.map((o) => o.id)
      const { data, error } = await service
        .from('order_ratings')
        .select('*')
        .in('order_id', orderIds)

      if (error && (error as { code?: string }).code === 'PGRST205') {
        return NextResponse.json([])
      }
      if (error) throw error

      return NextResponse.json(
        (data || []).map((rating) => ({
          ...rating,
          order: completedOrders.find((o) => o.id === rating.order_id),
        }))
      )
    }

    if (!isAdmin && orderId) {
      const { data: order } = await service
        .from('orders')
        .select('client_id')
        .eq('id', orderId)
        .single()

      const { data: clientData } = await service
        .from('clients')
        .select('auth_user_id')
        .eq('id', order?.client_id)
        .single()

      if (!clientData || clientData.auth_user_id !== user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
      }
    }

    const { data, error } = await service
      .from('order_ratings')
      .select('*')
      .eq('order_id', orderId!)
      .maybeSingle()

    if (error && (error as { code?: string }).code === 'PGRST205') {
      return NextResponse.json(null)
    }
    if (error) throw error

    return NextResponse.json(data)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch rating'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// PATCH - Admin moderation / reply
export async function PATCH(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || user.user_metadata?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const body = await req.json()
    const { id, admin_reply, is_visible, is_published } = body

    if (!id) {
      return NextResponse.json({ error: 'id required' }, { status: 400 })
    }

    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }
    if (typeof admin_reply === 'string') {
      updates.admin_reply = admin_reply
      updates.admin_reply_at = new Date().toISOString()
    }
    if (typeof is_visible === 'boolean') updates.is_visible = is_visible
    if (typeof is_published === 'boolean') updates.is_published = is_published

    const service = getServiceClient()
    const { data, error } = await service
      .from('order_ratings')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return NextResponse.json(data)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Update failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// DELETE - Admin remove rating
export async function DELETE(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || user.user_metadata?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const id = new URL(req.url).searchParams.get('id')
  if (!id) {
    return NextResponse.json({ error: 'id required' }, { status: 400 })
  }

  try {
    const service = getServiceClient()
    const { error } = await service.from('order_ratings').delete().eq('id', id)
    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Delete failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
