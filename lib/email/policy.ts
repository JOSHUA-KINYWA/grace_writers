/**
 * Only these email types are sent (saves Brevo daily quota).
 * Auth confirm/reset stays in Supabase — not listed here.
 */
export type AppEmailKind =
  | 'deliverable_upload'
  | 'revision_requested'
  | 'revision_uploaded'
  | 'revision_status'
  | 'clarification_message'
  | 'live_chat_message'
  | 'admin_new_signup'
  | 'admin_new_order'
  | 'admin_contact_inquiry'
  | 'password_changed'
  | 'admin_test_email'

const ENABLED: ReadonlySet<AppEmailKind> = new Set([
  'deliverable_upload',
  'revision_requested',
  'revision_uploaded',
  'revision_status',
  'clarification_message',
  'live_chat_message',
  'admin_new_signup',
  'admin_new_order',
  'admin_contact_inquiry',
  'password_changed',
  'admin_test_email',
])

export function canSendEmail(kind: AppEmailKind): boolean {
  return ENABLED.has(kind)
}

export function emailKindLabel(kind: AppEmailKind): string {
  return kind.replace(/_/g, ' ')
}
