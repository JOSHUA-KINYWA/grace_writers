'use client'

import { FaWhatsapp } from 'react-icons/fa'
import { getUrgentWhatsAppHref } from '@/lib/support-contact'

interface UrgentWhatsAppNavButtonProps {
  clientName?: string
  compact?: boolean
  className?: string
}

export default function UrgentWhatsAppNavButton({
  clientName,
  compact = false,
  className = '',
}: UrgentWhatsAppNavButtonProps) {
  const href = getUrgentWhatsAppHref(clientName)

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition shadow-sm ${
        compact
          ? 'bg-green-600 hover:bg-green-700 text-white px-3 py-2 text-xs'
          : 'bg-green-600 hover:bg-green-700 text-white px-4 py-2.5 text-sm'
      } ${className}`}
      title="Urgent help via WhatsApp — quotes, feedback, or if live chat is slow"
    >
      <FaWhatsapp className={compact ? 'text-base' : 'text-lg'} />
      {!compact && <span>Urgent help</span>}
      {compact && <span className="hidden sm:inline">Urgent</span>}
    </a>
  )
}
