'use client'

import OrderChatEnhanced from '@/components/OrderChatEnhanced'
import { FaComments } from 'react-icons/fa'

interface AdminOrderChatProps {
  orderId: string
  clientName?: string
}

export default function AdminOrderChat({ orderId, clientName = 'Client' }: AdminOrderChatProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <FaComments className="text-slate-700" />
          Chat with {clientName}
        </h3>
        <p className="text-xs text-slate-500">Order: {orderId.slice(0, 8).toUpperCase()}</p>
      </div>

      <OrderChatEnhanced orderId={orderId} isAdmin />
    </div>
  )
}
