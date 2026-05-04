import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// POST - Create or update order rating
export async function POST(req: Request) {
  const supabase = await createClient()
  const userResult = await supabase.auth.getUser()
  const user = userResult.data?.user

  if (!user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  const isAdmin = user.user_metadata?.role === 'admin'


  try {
    const body = await req.json()
    const {
      order_id,
      rating,
      review_comment
    } = body

    if (!order_id || !rating) {
      return NextResponse.json(
        { error: 'Missing required fields: order_id, rating' },
        { status: 400 }
      )
    }

    // Verify the order exists (admin can bypass ownership check)
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, client_id')
      .eq('id', order_id)
      .single()

    if (orderError || !order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      )
    }

    if (!isAdmin) {
      // fetch client record to check ownership
      const { data: clientData, error: clientError } = await supabase
        .from('clients')
        .select('auth_user_id')
        .eq('id', order.client_id)
        .single()

      if (clientError || !clientData) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 403 }
        )
      }

      // if record has no auth_user_id yet, link it to this user
      if (!clientData.auth_user_id) {
        const { error: clientUpdateError } = await supabase
          .from('clients')
          .update({ auth_user_id: user.id })
          .eq('id', order.client_id)
        if (clientUpdateError) {
          console.warn('Warning: failed to update client auth_user_id', clientUpdateError)
        }
      }

      if (clientData.auth_user_id && clientData.auth_user_id !== user.id) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 403 }
        )
      }
    }

    // Check if rating already exists
    const { data: existingRating } = await supabase
      .from('order_ratings')
      .select('id')
      .eq('order_id', order_id)
      .single()

    let result
    if (existingRating) {
      // Update existing rating
      const { data, error } = await supabase
        .from('order_ratings')
        .update({
          rating,
          review_comment,
          updated_at: new Date().toISOString()
        })
        .eq('order_id', order_id)
        .select()
        .single()

      if (error) throw error
      result = data
    } else {
      // Create new rating
      const { data, error } = await supabase
        .from('order_ratings')
        .insert([{
          order_id,
          client_id: order.client_id, // use the field we already fetched above
          rating,
          review_comment,
          created_at: new Date().toISOString()
        }])
        .select()
        .single()

      if (error) throw error
      result = data
    }

    return NextResponse.json(result, { status: 201 })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to save rating' },
      { status: 500 }
    )
  }
}

// GET - Fetch order rating
export async function GET(req: Request) {
  const supabase = await createClient()
  const userResult = await supabase.auth.getUser()
  const user = userResult.data?.user
  const isAdmin = user?.user_metadata?.role === 'admin'
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

      // Prefer client_id from auth metadata (avoids clients table RLS issues)
      const metaClientId = user.user_metadata?.client_id as string | undefined
      let clientId: string | null = metaClientId || null

      // Fallback: attempt to resolve client id from clients table (best-effort)
      if (!clientId) {
        let clientQuery = supabase.from('clients').select('id')
        if (user.email) {
          clientQuery = clientQuery.or(`auth_user_id.eq.${user.id},email.eq.${user.email}`)
        } else {
          clientQuery = clientQuery.eq('auth_user_id', user.id)
        }

        const { data: clientData, error: clientError } = await clientQuery.limit(1)
        if (clientError) {
          // If RLS blocks this lookup, do not hard-fail the whole dashboard.
          console.warn('order-ratings: unable to resolve client via clients table', clientError)
          return NextResponse.json([], { status: 200 })
        }

        const client = Array.isArray(clientData) ? clientData[0] : clientData
        clientId = client?.id || null
      }

      if (!clientId) return NextResponse.json([], { status: 200 })

      const { data: completedOrders, error: ordersError } = await supabase
        .from('orders')
        .select('id, title, created_at')
        .eq('client_id', clientId)
        .eq('status', 'completed')

      if (ordersError) throw ordersError
      if (!completedOrders || completedOrders.length === 0) {
        return NextResponse.json([])
      }

      const orderIds = completedOrders.map((order: any) => order.id)
      const { data, error } = await supabase
        .from('order_ratings')
        .select('*')
        .in('order_id', orderIds)

      // If the ratings table doesn't exist yet (migration not applied), don't hard-fail the dashboard.
      if (error && (error as any).code === 'PGRST205') {
        console.warn('order-ratings: order_ratings table missing (PGRST205); returning empty list')
        return NextResponse.json([], { status: 200 })
      }
      if (error) throw error

      const ratings = (data || []).map((rating: any) => ({
        ...rating,
        order: completedOrders.find((order: any) => order.id === rating.order_id)
      }))

      return NextResponse.json(ratings)
    }

    // if not admin, ensure user owns the order before fetching rating
    if (!isAdmin) {
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .select('client_id')
        .eq('id', orderId)
        .single()
      if (orderError || !order) {
        return NextResponse.json({ error: 'Order not found' }, { status: 404 })
      }
      const { data: clientData } = await supabase
        .from('clients')
        .select('auth_user_id')
        .eq('id', order.client_id)
        .single()
      if (!clientData || clientData.auth_user_id !== user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
      }
    }

    const { data, error } = await supabase
      .from('order_ratings')
      .select('*')
      .eq('order_id', orderId)
      .single()

    // If the ratings table doesn't exist yet (migration not applied), treat as "no rating".
    if (error && (error as any).code === 'PGRST205') {
      console.warn('order-ratings: order_ratings table missing (PGRST205); returning null')
      return NextResponse.json(null, { status: 200 })
    }
    if (error && error.code === 'PGRST116') {
      // No rating found, return null
      return NextResponse.json(null)
    }

    if (error) throw error

    return NextResponse.json(data)
  } catch (error: any) {
    console.error('order-ratings GET failed:', error)
    return NextResponse.json(
      {
        error: error?.message || 'Failed to fetch rating',
        details: error?.details || error?.toString?.() || null,
        code: error?.code || null
      },
      { status: 500 }
    )
  }
}
