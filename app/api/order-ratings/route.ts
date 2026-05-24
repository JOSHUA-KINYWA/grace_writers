import { createClient } from '@/lib/supabase/server'
import { createClient as createSupabaseService } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

function getServiceClient() {
  return createSupabaseService(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// POST - Create or update order rating
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
    const { order_id, rating, review_comment } = body

    if (!order_id || !rating) {
      return NextResponse.json(
        { error: 'Missing required fields: order_id, rating' },
        { status: 400 }
      )
    }

    const { data: order, error: orderError } = await service
      .from('orders')
      .select('id, client_id')
      .eq('id', order_id)
      .single()

    if (orderError || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    if (!isAdmin) {
      const { data: clientData } = await service
        .from('clients')
        .select('auth_user_id, email')
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
    }

    const { data: existingRating } = await service
      .from('order_ratings')
      .select('id')
      .eq('order_id', order_id)
      .maybeSingle()

    let result
    if (existingRating) {
      const { data, error } = await service
        .from('order_ratings')
        .update({
          rating,
          review_comment,
          updated_at: new Date().toISOString(),
        })
        .eq('order_id', order_id)
        .select()
        .single()

      if (error) throw error
      result = data
    } else {
      const { data, error } = await service
        .from('order_ratings')
        .insert({
          order_id,
          client_id: order.client_id,
          rating,
          review_comment,
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
            'Ratings are not set up yet. Run migrations/create_order_ratings_table.sql in Supabase SQL Editor, or run: node scripts/ensure-order-ratings-table.mjs',
        },
        { status: 503 }
      )
    }

    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// GET - Fetch order rating
export async function GET(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const isAdmin = user?.user_metadata?.role === 'admin'
  const service = getServiceClient()
  const { searchParams } = new URL(req.url)
  const orderId = searchParams.get('order_id')
  const completed = searchParams.get('completed') === 'true'

  try {
    if (!orderId && !completed) {
      return NextResponse.json(
        { error: 'Missing order_id or completed parameter' },
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
