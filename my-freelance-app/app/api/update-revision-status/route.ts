import { NextResponse } from 'next/server'
import { createClient as createSupabaseService } from '@supabase/supabase-js'
import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS,
  },
})

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { revisionId, status } = body

    if (!revisionId || !status) {
      return NextResponse.json(
        { error: 'Missing revisionId or status' },
        { status: 400 }
      )
    }

    if (!['pending', 'in_progress', 'completed'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status value' },
        { status: 400 }
      )
    }

    const service = createSupabaseService(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Get revision details
    const { data: revision, error: revError } = await service
      .from('revisions')
      .select('*, orders!inner(id, title, client_id, clients!inner(email, name))')
      .eq('id', revisionId)
      .single()

    if (revError || !revision) {
      return NextResponse.json(
        { error: 'Revision not found' },
        { status: 404 }
      )
    }

    const updatedAt = status === 'completed' ? new Date().toISOString() : null

    // Update revision status
    const { error: updateError } = await service
      .from('revisions')
      .update({
        status,
        updated_at: new Date().toISOString(),
        completed_at: updatedAt,
      })
      .eq('id', revisionId)

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message },
        { status: 500 }
      )
    }

    // If revision is marked complete, check if all revisions for this order are done
    if (status === 'completed') {
      const { data: pendingRevisions } = await service
        .from('revisions')
        .select('id')
        .eq('order_id', revision.orders.id)
        .neq('status', 'completed')

      if (!pendingRevisions || pendingRevisions.length === 0) {
        // All revisions completed, update order
        await service
          .from('orders')
          .update({
            revision_status: 'completed',
          })
          .eq('id', revision.orders.id)
      } else {
        // Some still pending/in_progress
        await service
          .from('orders')
          .update({
            revision_status: 'in_progress',
          })
          .eq('id', revision.orders.id)
      }
    } else if (status === 'in_progress') {
      // Mark order as in_progress
      await service
        .from('orders')
        .update({
          revision_status: 'in_progress',
        })
        .eq('id', revision.orders.id)
    }

    // Send email to client if revision completed
    if (status === 'completed') {
      try {
        const clientEmail = revision.orders.clients.email
        const clientName = revision.orders.clients.name
        const orderTitle = revision.orders.title
        const revisionNumber = revision.revision_number

        await transporter.sendMail({
          from: process.env.GMAIL_USER,
          to: clientEmail,
          subject: `Revision #${revisionNumber} Completed - ${orderTitle}`,
          html: `
            <h2>Revision Completed!</h2>
            <p>Hi ${clientName},</p>
            <p>Your revision #${revisionNumber} for "<strong>${orderTitle}</strong>" has been completed.</p>
            <p>Please check your order dashboard to review the updated files.</p>
            <p>Thank you for working with us!</p>
          `,
        })
      } catch (emailError) {
        console.error('Error sending email:', emailError)
        // Don't fail the request if email fails
      }
    }

    // Create notification for client
    if (status === 'completed') {
      const { data: client } = await service
        .from('clients')
        .select('id, auth_user_id')
        .eq('id', revision.orders.client_id)
        .single()

      if (client) {
        const userId = client.auth_user_id || client.id
        await service
          .from('notifications')
          .insert({
            user_id: userId,
            order_id: revision.orders.id,
            type: 'revision_completed',
            title: 'Revision Completed',
            message: `Revision #${revision.revision_number} for "${revision.orders.title}" is ready for review.`,
          })
      }
    }

    return NextResponse.json({
      success: true,
      status,
      completedAt: updatedAt,
    })
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err))
    console.error('Update revision status error:', error)
    return NextResponse.json(
      { error: error.message || 'Server error' },
      { status: 500 }
    )
  }
}
