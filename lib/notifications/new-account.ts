import { emailTemplates } from '@/lib/email-templates'
import { sendEmailToAllAdmins } from '@/lib/email/admin-notify'
import { notifyAllAdmins } from '@/lib/notifications/service'

export async function notifyNewAccount(input: {
  clientName: string
  clientEmail: string
  clientPhone?: string | null
  clientCompany?: string | null
}) {
  const { clientName, clientEmail, clientPhone, clientCompany } = input

  try {
    await notifyAllAdmins({
      orderId: null,
      type: 'admin_new_signup',
      title: 'New client signup',
      message: `${clientName || clientEmail} registered`,
    })
  } catch (error) {
    console.error('[new-account] in-app notification failed:', error)
  }

  try {
    const result = await sendEmailToAllAdmins({
      kind: 'admin_new_signup',
      subject: `New client signup — ${clientName || clientEmail}`,
      html: emailTemplates.newAccountNotification(
        clientName,
        clientEmail,
        clientPhone || undefined,
        clientCompany || undefined
      ),
    })
    if (result.errors.length) {
      console.error('[new-account] admin email issues:', result.errors)
    }
  } catch (error) {
    console.error('[new-account] admin email failed:', error)
  }
}
