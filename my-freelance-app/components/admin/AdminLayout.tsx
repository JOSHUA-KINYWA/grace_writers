'use client'

import { ReactNode, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { FaBars, FaTimes, FaHome, FaUsers, FaShoppingCart, FaCog, FaChartBar, FaEnvelope, FaFileAlt, FaSignOutAlt, FaBox } from 'react-icons/fa'
import LogoutButton from './LogoutButton'

interface AdminLayoutProps {
  children: ReactNode
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const pathname = usePathname()

  const navItems = [
    { icon: FaHome, label: 'Dashboard', href: '/admin' },
    { icon: FaUsers, label: 'Client Management', href: '/admin/clients' },
    { icon: FaShoppingCart, label: 'Orders', href: '/admin/orders' },
    { icon: FaEnvelope, label: 'Messages', href: '/admin/messages' },
    { icon: FaChartBar, label: 'Analytics', href: '/admin/analytics' },
    { icon: FaFileAlt, label: 'Inquiries', href: '/admin/inquiries' },
    { icon: FaBox, label: 'Portfolio', href: '/admin/portfolio' },
    { icon: FaCog, label: 'Settings', href: '/admin/settings' },
  ]

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/')

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div
        className={`${
          sidebarOpen ? 'w-64' : 'w-20'
        } bg-gradient-to-b from-gray-900 to-gray-800 text-white transition-all duration-300 flex flex-col`}
      >
        {/* Logo/Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-gray-700">
          {sidebarOpen && <h1 className="text-xl font-bold">Grace Admins</h1>}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-gray-700 rounded-lg transition"
          >
            {sidebarOpen ? <FaTimes /> : <FaBars />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-2 py-8 overflow-y-auto">
          <ul className="space-y-2">
            {navItems.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-4 px-4 py-3 rounded-lg transition ${
                    isActive(item.href)
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  <item.icon size={20} className="min-w-fit" />
                  {sidebarOpen && <span>{item.label}</span>}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* Logout Button */}
        <div className="p-4 border-t border-gray-700">
          <LogoutButton compact={!sidebarOpen} />
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <div className="h-16 bg-white shadow-sm flex items-center justify-between px-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">Admin Panel</h2>
          <div className="text-sm text-gray-600">Welcome back, Admin</div>
        </div>

        {/* Page Content */}
        <div className="flex-1 overflow-auto">
          <div className="p-6">{children}</div>
        </div>
      </div>
    </div>
  )
}
