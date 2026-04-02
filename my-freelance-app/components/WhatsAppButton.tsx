'use client'

import { FaWhatsapp } from 'react-icons/fa'
import { generateWhatsAppLink } from '@/lib/utils/whatsapp'

interface WhatsAppButtonProps {
  phone?: string
  message?: string
  className?: string
  variant?: 'default' | 'floating' | 'icon'
  children?: React.ReactNode
}

export default function WhatsAppButton({
  phone = '+254715423188',
  message = "Hi, I have an urgent matter that needs immediate attention. Can we discuss?",
  className = '',
  variant = 'default',
  children
}: WhatsAppButtonProps) {
  const whatsappLink = generateWhatsAppLink(phone, message)

  const baseClasses = 'inline-flex items-center justify-center gap-2 font-semibold transition-all duration-300 hover:scale-105'
  
  const variantClasses = {
    default: 'bg-[#25D366] text-white px-6 py-3 rounded-full shadow-lg hover:shadow-xl',
    floating: 'fixed bottom-6 right-6 bg-[#25D366] text-white p-4 rounded-full shadow-2xl z-50 hover:bg-[#20BA5A] animate-pulse-slow',
    icon: 'bg-[#25D366] text-white p-3 rounded-full shadow-lg hover:shadow-xl'
  }

  return (
    <a
      href={whatsappLink}
      target="_blank"
      rel="noopener noreferrer"
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
    >
      <FaWhatsapp className="text-xl" />
      {variant !== 'icon' && (children || 'Chat on WhatsApp')}
    </a>
  )
}
