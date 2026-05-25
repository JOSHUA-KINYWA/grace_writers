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
  children,
}: ClientOrderLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const menuItems = [
    { label: 'Order Details', icon: '📋', count: 0, show: true },
    {
      label: 'Revisions',
      icon: '🔄',
      count: revisionCount,
      show: orderStatus === 'revision' || revisionCount > 0,
    },
    { label: 'Completed', icon: '✓', count: 0, show: orderStatus === 'completed' },
  ].filter((item) => item.show)

  return (
    <div className="flex flex-col lg:flex-row gap-4 lg:gap-6 min-w-0">
      <div className="flex items-center justify-between lg:hidden">
        <button
          type="button"
          onClick={() => setSidebarOpen((o) => !o)}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-700"
        >
          {sidebarOpen ? <FaTimes /> : <FaBars />}
          Order menu
        </button>
      </div>

      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/40"
          onClick={() => setSidebarOpen(false)}
          aria-hidden
        />
      )}

      <aside
        className={`${
          sidebarOpen ? 'fixed left-0 top-0 z-50 h-full w-[min(85vw,280px)] shadow-xl' : 'hidden'
        } lg:block lg:static lg:w-56 xl:w-64 shrink-0`}
      >
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 h-full lg:sticky lg:top-4 overflow-y-auto max-h-[calc(100vh-6rem)]">
          <div className="flex items-center justify-between lg:hidden mb-4">
            <h2 className="text-lg font-bold text-gray-900">Order Menu</h2>
            <button type="button" onClick={() => setSidebarOpen(false)} className="p-2">
              <FaTimes />
            </button>
          </div>
          <h2 className="hidden lg:block text-lg font-bold text-gray-900 mb-4">Order Menu</h2>
          <nav className="space-y-2">
            {menuItems.map((item, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between px-3 py-2.5 text-gray-700 hover:bg-purple-50 rounded-lg text-sm"
              >
                <span className="flex items-center gap-2 min-w-0">
                  <span>{item.icon}</span>
                  <span className="font-medium truncate">{item.label}</span>
                </span>
                {item.count > 0 && (
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-500 text-white shrink-0">
                    {item.count}
                  </span>
                )}
              </div>
            ))}
          </nav>
        </div>
      </aside>

      <div className="flex-1 min-w-0 overflow-x-hidden">{children}</div>
    </div>
  )
}
