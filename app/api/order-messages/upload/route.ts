import { isAdminUser } from '@/lib/auth/admin'
import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient as createSupabaseService } from '@supabase/supabase-js'

export async function POST(req: Request) {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await req.formData()
    const orderId = String(formData.get('orderId') || '').trim()
    const file = formData.get('file')

    if (!orderId || !(file instanceof File)) {
      return NextResponse.json({ error: 'Missing orderId or file' }, { status: 400 })
    }

    const isAdmin = isAdminUser(user)
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

    const timestamp = Date.now()
    const random = Math.random().toString(36).substring(2, 10)
    const safeName = file.name.replace(/[^\w.\-]+/g, '_')
    const filePath = `order-clarifications/${orderId}/${timestamp}_${random}_${safeName}`

    const buffer = Buffer.from(await file.arrayBuffer())
    const { error: uploadError } = await service.storage
      .from('order-files')
      .upload(filePath, buffer, {
        contentType: file.type || 'application/octet-stream',
        cacheControl: '3600',
        upsert: false,
      })

    if (uploadError) {
      const msg = uploadError.message || 'Upload failed'
      if (msg.toLowerCase().includes('bucket')) {
        return NextResponse.json(
          {
            error:
              'Storage bucket "order-files" is missing in Supabase. Create it under Storage → New bucket (name: order-files, private).',
          },
          { status: 503 }
        )
      }
      throw uploadError
    }

    return NextResponse.json({ path: filePath })
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err))
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
