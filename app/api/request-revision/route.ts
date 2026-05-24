import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { emailTemplates } from '@/lib/email-templates'
import { getAdminEmail } from '@/lib/email/config'
import { sendAppEmail } from '@/lib/email/send'
import { notifyAllAdmins } from '@/lib/notifications/service'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { orderId, reason } = body

    if (!orderId) {
      return NextResponse.json({ error: 'Missing orderId' }, { status: 400 })
    }

    // Get current user
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get the order and check permissions
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, client_id, status')
      .eq('id', orderId)
      .single()

    if (orderError || !order) {
      console.error('Order fetch error:', orderError)
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // Verify user is client for this order
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('id')
      .eq('email', user.email || '')
      .single()

    console.error('Client fetch - error:', clientError, 'data:', client)

    if (!client || (client as any).id !== (order as any).client_id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Get the highest revision number for this order
    const { data: existingRevisions, error: revFetchError } = await supabase
      .from('revisions')
      .select('revision_number')
      .eq('order_id', orderId)
      .order('revision_number', { ascending: false })
      .limit(1)

    const revisionNumber = (existingRevisions && existingRevisions.length > 0) 
      ? (existingRevisions[0] as any).revision_number + 1 
      : 1

    // Create revision record - simplified
    const { data: revision, error: revisionError } = await (supabase as any)
      .from('revisions')
      .insert([
        {
          order_id: orderId,
          revision_number: revisionNumber,
          requested_by: user.id,
          requested_reason: reason || 'Revision requested',
          status: 'pending'
        }
      ])
      .select()
      .single()

    console.error('Revision insert - error:', revisionError, 'data:', revision)

    if (revisionError) {
      console.error('Revision error details:', JSON.stringify(revisionError))
      throw revisionError
    }

    // Update order status - simplified
    const { error: updateError } = await (supabase as any)
      .from('orders')
      .update({
        status: 'revision',
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId)

    console.error('Order update - error:', updateError)

    if (updateError) {
      throw updateError
    }

    // Get order title and client info for notifications
    const { data: orderDetails, error: orderDetailsError } = await supabase
      .from('orders')
      .select('*, clients!inner(name, email)')
      .eq('id', orderId)
      .single()

    // Create notification for admin (handle errors with try/catch)
    try {
      const { data: adminProfiles, error: adminProfileError } = await (supabase as any)
        .from('profiles')
        .select('id')
        .eq('account_type', 'admin')
        .limit(1)

      let adminUserId: string | null = null

      if (adminProfileError) {
        console.error('Admin profile lookup failed:', adminProfileError)
      } else if (adminProfiles && adminProfiles.length > 0) {
        adminUserId = adminProfiles[0].id
      }

      if (!adminUserId) {
        const { data: adminUsers, error: adminUserError } = await (supabase as any)
          .from('users')
          .select('id, user_metadata')
          .or('user_metadata->>role.eq.admin,email.ilike.%admin%')
          .limit(1)

        if (adminUserError) {
          console.error('Admin user lookup failed:', adminUserError)
        } else if (adminUsers && adminUsers.length > 0) {
          adminUserId = adminUsers[0].id
        }
      }

      if (adminUserId) {
        const { error: notifError } = await (supabase as any)
          .from('notifications')
          .insert({
            user_id: adminUserId,
            order_id: orderId,
            type: 'revision_requested',
            title: 'Revision Requested',
            message: `Client requested revision #${revisionNumber}: ${reason || 'See order for details'}`,
            read: false,
          })

        if (notifError) console.error('Notification failed:', notifError)
      } else {
        console.error('No admin user found to send revision notification')
      }
    } catch (err) {
      console.error('Notification failed:', err)
    }

    try {
      const adminEmail = getAdminEmail()
      const clientName = orderDetails?.clients?.name || 'Client'
      const orderTitle = orderDetails?.title || 'Order'

      await notifyAllAdmins({
        orderId,
        type: 'revision_requested',
        title: 'Revision requested',
        message: `${clientName} requested revision #${revisionNumber} on "${orderTitle}"`,
      })

      if (adminEmail) {
        await sendAppEmail({
          kind: 'revision_requested',
          to: adminEmail,
          subject: `Revision requested — ${orderTitle}`,
          html: emailTemplates.revisionRequestedAdmin(
            clientName,
            orderTitle,
            revisionNumber,
            reason,
            orderId
          ),
        })
      }
    } catch (emailErr) {
      console.error('Revision request email failed:', emailErr)
    }

    return NextResponse.json({ 
      success: true, 
      revisionId: revision.id,
      revision: revision,
      revisionNumber: revisionNumber
    })
  } catch (err) {
    console.error('Request revision error details:', err)
    let errorMessage = 'Server error'
    
    if (err instanceof Error) {
      errorMessage = err.message
    } else if (typeof err === 'object' && err !== null && 'message' in err) {
      errorMessage = String((err as any).message)
    } else if (typeof err === 'string') {
      errorMessage = err
    }
    
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
