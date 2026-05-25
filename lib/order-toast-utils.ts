export interface OrderToastItem {
  id: string
  orderId: string
  title: string
  subject: string
  category?: string
  deadlineText: string
  deadlineUrgent: boolean
  badge?: string
  tag?: string
  message: string
  href: string
  createdAt: string
}

export function formatDeadlineLabel(deadline: string | null | undefined): {
  text: string
  urgent: boolean
} {
  if (!deadline) {
    return { text: 'No deadline set', urgent: false }
  }

  const date = new Date(deadline)
  if (Number.isNaN(date.getTime())) {
    return { text: 'No deadline set', urgent: false }
  }

  const now = Date.now()
  const diffMs = date.getTime() - now
  const month = date.toLocaleString('en-US', { month: 'short' })
  const day = date.getDate()

  if (diffMs < 0) {
    return { text: `${month}, ${day} • Overdue`, urgent: true }
  }

  const hoursLeft = diffMs / (1000 * 60 * 60)
  if (hoursLeft < 24) {
    const hours = Math.max(1, Math.ceil(hoursLeft))
    return {
      text: `${month}, ${day} • ${hours} hour${hours === 1 ? '' : 's'} left`,
      urgent: true,
    }
  }

  const days = Math.ceil(hoursLeft / 24)
  return {
    text: `${month}, ${day} • ${days} day${days === 1 ? '' : 's'} left`,
    urgent: days <= 2,
  }
}

export function notificationToToast(
  row: {
    id: string
    order_id?: string | null
    title?: string | null
    message?: string | null
    type?: string | null
    created_at?: string | null
  },
  order: {
    id: string
    title?: string | null
    deadline?: string | null
    services?: { category?: string | null; title?: string | null } | Array<{ category?: string | null; title?: string | null }> | null
  } | null,
  role: 'admin' | 'client'
): OrderToastItem | null {
  if (!row.order_id) {
    if (row.type === 'live_chat_message') {
      return {
        id: row.id,
        orderId: '',
        title: row.title || 'Live chat',
        subject: 'Support',
        category: 'Live chat',
        deadlineText: 'Reply when you can',
        deadlineUrgent: false,
        badge: 'Live chat',
        tag: 'Support',
        message: row.message || 'New message from support',
        href: role === 'admin' ? '/admin/chat' : '/dashboard',
        createdAt: row.created_at || new Date().toISOString(),
      }
    }
    if (row.type === 'contact_inquiry') {
      return {
        id: row.id,
        orderId: '',
        title: row.title || 'Contact form',
        subject: 'Inquiry',
        category: 'Contact',
        deadlineText: 'Respond soon',
        deadlineUrgent: false,
        badge: 'New inquiry',
        tag: 'Contact',
        message: row.message || 'New contact form submission',
        href: role === 'admin' ? '/admin/inquiries' : '/contact',
        createdAt: row.created_at || new Date().toISOString(),
      }
    }
    if (row.type === 'admin_new_signup') {
      return {
        id: row.id,
        orderId: '',
        title: row.title || 'New signup',
        subject: 'Client',
        category: 'Account',
        deadlineText: '',
        deadlineUrgent: false,
        badge: 'New client',
        tag: 'Signup',
        message: row.message || 'A new client registered',
        href: role === 'admin' ? '/admin/clients' : '/dashboard',
        createdAt: row.created_at || new Date().toISOString(),
      }
    }
    if (row.type === 'password_changed') {
      return {
        id: row.id,
        orderId: '',
        title: 'Account security',
        subject: 'Security',
        category: 'Account',
        deadlineText: '',
        deadlineUrgent: false,
        badge: 'Password updated',
        tag: 'Account',
        message: row.message || 'Your password was changed.',
        href: '/account/change-password',
        createdAt: row.created_at || new Date().toISOString(),
      }
    }
    return null
  }

  const service = Array.isArray(order?.services) ? order?.services[0] : order?.services
  const category = service?.category || service?.title || 'General'
  const subject = service?.title || category
  const deadline = formatDeadlineLabel(order?.deadline)
  const orderTitle = order?.title || row.title || 'Order update'

  let badge: string | undefined
  let tag = category

  switch (row.type) {
    case 'new_order':
      badge = 'New order'
      break
    case 'revision_requested':
      badge = role === 'admin' ? 'Request for you' : 'Revision sent'
      break
    case 'revision_uploaded':
      badge = role === 'admin' ? 'Revision uploaded' : 'Revision files ready'
      break
    case 'file_upload':
      badge = 'New deliverables'
      break
    case 'new_message':
      badge = 'Clarification needed'
      break
    case 'order_update':
      badge = 'Order updated'
      break
    case 'revision_complete':
      badge = 'Revision complete'
      break
    default:
      badge = row.title || 'Update'
  }

  const href =
    row.type === 'new_message'
      ? role === 'admin'
        ? `/admin/messages?order=${row.order_id}`
        : `/dashboard/orders/${row.order_id}`
      : role === 'admin'
        ? `/admin/orders/${row.order_id}`
        : `/dashboard/orders/${row.order_id}`

  return {
    id: row.id,
    orderId: row.order_id,
    title: orderTitle,
    subject,
    category,
    deadlineText: deadline.text,
    deadlineUrgent: deadline.urgent,
    badge,
    tag,
    message: row.message || 'You have a new update on this order.',
    href,
    createdAt: row.created_at || new Date().toISOString(),
  }
}
