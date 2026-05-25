import { DEFAULT_WHATSAPP_NUMBER, generateWhatsAppLink } from '@/lib/utils/whatsapp'

export function getSupportWhatsAppNumber(): string {
  return (
    process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ||
    process.env.WHATSAPP_NUMBER ||
    DEFAULT_WHATSAPP_NUMBER
  )
}

export function getUrgentWhatsAppMessage(clientName?: string): string {
  const who = clientName?.trim() ? ` (${clientName.trim()})` : ''
  return (
    `Hello Grace Tutors${who}, I need urgent help. ` +
    `This may be about a quote, feedback, order update, or live chat — please assist when you can.`
  )
}

export function getUrgentWhatsAppHref(clientName?: string): string {
  return generateWhatsAppLink(
    getSupportWhatsAppNumber(),
    getUrgentWhatsAppMessage(clientName)
  )
}
