'use client'

import { useState } from 'react'
import { FaBars, FaTimes } from 'react-icons/fa'

interface ClientOrderLayoutProps {
  revisionCount: number
  orderStatus: string
  children: React.ReactNode
}

export default function ClientOrderLayout({
  revisionCount,
  orderStatus,
  children
}: ClientOrderLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true)

  // Dynamic menu items based on order status
  const menuItems = [
    {
      label: 'Order Details',
      icon: '📋',
      count: 0,
      show: true
    },
    {
      label: 'Revisions',
      icon: '🔄',
      count: revisionCount,
      show: orderStatus === 'revision' || revisionCount > 0
    },
    {
      label: 'Completed',
      icon: '✓',
      count: 0,
      show: orderStatus === 'completed'
    }
  ].filter(item => item.show)

  return (
    <div className="flex gap-6">
      {/* Sidebar */}
      <div className={`${sidebarOpen ? 'w-64' : 'w-0'} transition-all duration-300 flex-shrink-0`}>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 h-full sticky top-4">
          <h2 className="text-lg font-bold text-gray-900 mb-6">Order Menu</h2>
          <nav className="space-y-2">
            {menuItems.map((item, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between px-4 py-3 text-gray-700 hover:bg-purple-50 rounded-lg transition cursor-pointer"
              >
                <span className="flex items-center gap-3">
                  <span>{item.icon}</span>
                  <span className="font-medium">{item.label}</span>
                </span>
                {item.count > 0 && (
                  <span className="text-xs font-bold px-2 py-1 rounded-full bg-red-500 text-white">
                    {item.count}
                  </span>
                )}
              </div>
            ))}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1">
        {/* Toggle Button */}
        {!sidebarOpen && (
          <button
            onClick={() => setSidebarOpen(true)}
            className="mb-4 p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <FaBars size={20} />
          </button>
        )}
        {sidebarOpen && (
          <button
            onClick={() => setSidebarOpen(false)}
            className="mb-4 p-2 hover:bg-gray-100 rounded-lg transition lg:hidden"
          >
            <FaTimes size={20} />
          </button>
        )}
        {children}
      </div>
    </div>
  )
}
