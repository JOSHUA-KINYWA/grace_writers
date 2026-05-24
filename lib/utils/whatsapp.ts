// Client-safe WhatsApp utilities (no server-side imports)

export function generateWhatsAppLink(phone: string, message: string): string {
  const cleanPhone = phone.replace(/\D/g, '')
  const encodedMessage = encodeURIComponent(message)
  return `https://wa.me/${cleanPhone}?text=${encodedMessage}`
}

export function generateServiceWhatsAppMessage(serviceTitle: string): string {
  return `Hi, I'm interested in your ${serviceTitle} service. I'd like to get a quote.`
}

// Default WhatsApp number (can be overridden via props)
export const DEFAULT_WHATSAPP_NUMBER = '+254715423188'
