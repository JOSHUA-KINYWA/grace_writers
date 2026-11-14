import { isAdminUser } from '@/lib/auth/admin'
import { createClient as createSupabaseService } from '@supabase/supabase-js'
import { emailTemplates } from '@/lib/email-templates'
import { sendEmailToAllAdmins } from '@/lib/email/admin-notify'
import { sendAppEmail } from '@/lib/email/send'
import {
  insertAppNotification,
  notifyAllAdmins,
  resolveClientNotifyTarget,
} from '@/lib/notifications/service'

function getServiceClient() {
  return createSupabaseService(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function sendRevisionUploadedNotification(
  revisionId: string,
  uploadedByUserId: string
) {
  const service = getServiceClient()

  const { data: revision, error: revError } = await service
    .from('revisions')
    .select('id, revision_number, orders!inner(id, title, client_id, clients!inner(email, name))')
    .eq('id', revisionId)
    .single()

  if (revError || !revision) {
    throw new Error('Revision not found')
  }

  const orderRow = Array.isArray(revision.orders) ? revision.orders[0] : revision.orders
  const clientRow = Array.isArray(orderRow?.clients) ? orderRow.clients[0] : orderRow?.clients
  const order = {
    id: String(orderRow?.id || ''),
    title: String(orderRow?.title || 'Order'),
    clientId: String(orderRow?.client_id || ''),
    clients: {
      email: String(clientRow?.email || ''),
      name: String(clientRow?.name || 'Client'),
    },
  }

  const { data: uploaderData } = await service.auth.admin.getUserById(uploadedByUserId)
  const isAdminUploader = isAdminUser(uploaderData?.user)

  if (isAdminUploader) {
    if (!order.clients?.email) return

    const target = order.clientId
      ? await resolveClientNotifyTarget(service, order.clientId)
      : null

    if (target?.userId) {
      await insertAppNotification({
        userId: target.userId,
        orderId: order.id,
        type: 'revision_uploaded',
        title: 'Revision files ready',
        message: `Revision #${revision.revision_number} files are ready for "${order.title}"`,
      }).catch(() => {})
    }

    await sendAppEmail({
      kind: 'revision_uploaded',
      to: order.clients.email,
      subject: `Revision files ready — ${order.title}`,
      html: emailTemplates.revisionFilesReadyClient(
        order.clients.name || 'Valued Client',
        order.title,
        revision.revision_number,
        order.id
      ),
    })
    return
  }

  await notifyAllAdmins({
    orderId: order.id,
    type: 'revision_uploaded',
    title: 'Client uploaded revision files',
    message: `Revision #${revision.revision_number} for "${order.title}"`,
  })

  await sendEmailToAllAdmins({
    kind: 'revision_uploaded',
    subject: `Client uploaded revision files — ${order.title}`,
    html: emailTemplates.revisionUploadedAdmin(order.title, order.id),
  })
}
