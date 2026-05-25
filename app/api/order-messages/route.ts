import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient as createSupabaseService } from '@supabase/supabase-js'
import { resolveSenderDisplayName } from '@/lib/utils/display-name'

export async function GET(req: Request) {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const orderId = searchParams.get('orderId')
    if (!orderId) {
      return NextResponse.json({ error: 'Missing orderId' }, { status: 400 })
    }

    const isAdmin = user.user_metadata?.role === 'admin'
    const db = isAdmin
      ? createSupabaseService(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!
        )
      : supabase

    if (!isAdmin) {
      const { data: order } = await db
        .from('orders')
        .select('client_id')
        .eq('id', orderId)
        .maybeSingle()

      if (!order) {
        return NextResponse.json({ error: 'Order not found' }, { status: 404 })
      }

      const { data: client } = await db
        .from('clients')
        .select('auth_user_id')
        .eq('id', order.client_id)
        .maybeSingle()

      if (client?.auth_user_id && client.auth_user_id !== user.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    const { data, error } = await db
      .from('order_messages')
      .select('*')
      .eq('order_id', orderId)
      .order('created_at', { ascending: true })

    if (error) throw error

    const rows = data || []
    const senderIds = [...new Set(rows.map((m) => m.sender_id).filter(Boolean))]
    const nameBySender: Record<string, string> = {}
    if (senderIds.length > 0) {
      const nameService = createSupabaseService(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      )
      const { data: clients } = await nameService
        .from('clients')
        .select('auth_user_id, name')
        .in('auth_user_id', senderIds)
      for (const c of clients || []) {
        if (c.auth_user_id && c.name?.trim()) {
          nameBySender[c.auth_user_id] = c.name.trim()
        }
      }
    }

    const messages = rows.map((m) => ({
      ...m,
      sender_name: m.is_admin
        ? m.sender_name || 'Support'
        : nameBySender[m.sender_id] || m.sender_name,
    }))

    return NextResponse.json({ messages })
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err))
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const {
      orderId,
      content,
      fileAttachments,
      parentMessageId,
    } = body as {
      orderId?: string
      content?: string
      fileAttachments?: string[]
      parentMessageId?: string | null
    }

    if (!orderId) {
      return NextResponse.json({ error: 'Missing orderId' }, { status: 400 })
    }

    const text = String(content || '').trim()
    const files = Array.isArray(fileAttachments) ? fileAttachments : []
    if (!text && files.length === 0) {
      return NextResponse.json({ error: 'Message cannot be empty' }, { status: 400 })
    }

    const isAdmin = user.user_metadata?.role === 'admin'
    const service = createSupabaseService(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    if (!isAdmin) {
      const { data: order } = await service
        .from('orders')
        .select('client_id')
        .eq('id', orderId)
        .maybeSingle()

      if (!order) {
        return NextResponse.json({ error: 'Order not found' }, { status: 404 })
      }

      const { data: client } = await service
        .from('clients')
        .select('auth_user_id, email')
        .eq('id', order.client_id)
        .maybeSingle()

      const ownsOrder =
        client?.auth_user_id === user.id ||
        (client?.email &&
          user.email &&
          client.email.toLowerCase() === user.email.toLowerCase())

      if (!ownsOrder) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    const senderName = await resolveSenderDisplayName(service, user, isAdmin)

    const messageData = {
      order_id: orderId,
      sender_id: user.id,
      sender_name: senderName,
      content: text || `Shared ${files.length} file(s)`,
      is_admin: isAdmin,
      read_status: 'unread',
      parent_message_id: parentMessageId || null,
      ...(files.length > 0 ? { file_attachments: files } : {}),
    }

    const { data: inserted, error } = await service
      .from('order_messages')
      .insert([messageData])
      .select('*')
      .single()

    if (error) throw error

    // Admin email + in-app alerts are sent from POST /api/order-messages/notify (called by chat UI).

    return NextResponse.json({ message: inserted })
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err))
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
