'use client'

import { ReactNode, useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { FaBars, FaTimes, FaHome, FaUsers, FaShoppingCart, FaCog, FaChartBar, FaEnvelope, FaFileAlt, FaBox, FaGift } from 'react-icons/fa'
import LogoutButton from './LogoutButton'

interface AdminLayoutProps {
  children: ReactNode
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [isMobile, setIsMobile] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768)
      if (window.innerWidth < 768) {
        setSidebarOpen(false)
      }
    }

    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const navItems = [
    { icon: FaHome, label: 'Dashboard', href: '/admin' },
    { icon: FaUsers, label: 'Clients', href: '/admin/clients' },
    { icon: FaShoppingCart, label: 'Orders', href: '/admin/orders' },
    { icon: FaEnvelope, label: 'Messages', href: '/admin/messages' },
    { icon: FaGift, label: 'Referrals', href: '/admin/referrals' },
    { icon: FaChartBar, label: 'Analytics', href: '/admin/analytics' },
    { icon: FaFileAlt, label: 'Inquiries', href: '/admin/inquiries' },
    { icon: FaBox, label: 'Portfolio', href: '/admin/portfolio' },
    { icon: FaCog, label: 'Settings', href: '/admin/settings' },
  ]

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/')

  return (
    <div className={`min-h-screen flex flex-col ${isMobile ? '' : 'md:flex-row'} bg-slate-50`}>
      {/* Sidebar */}
      <div
        className={`${
          sidebarOpen ? 'w-full md:w-72' : 'w-0 md:w-20'
        } bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-white transition-all duration-300 flex flex-col shadow-2xl fixed md:static top-0 left-0 h-screen md:h-auto z-40 ${
          !sidebarOpen && !isMobile ? 'md:flex' : ''
        }`}
      >
        {/* Logo/Header */}
        <div className="h-16 md:h-20 flex items-center justify-between px-4 border-b border-slate-700/50">
          {sidebarOpen && (
            <div className="flex flex-col">
              <span className="text-sm font-bold text-amber-400">Grace</span>
              <span className="text-xs text-slate-300">Admin Panel</span>
            </div>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-slate-700/50 rounded-lg transition text-white"
          >
            {sidebarOpen ? <FaTimes size={20} /> : <FaBars size={20} />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-2 py-4 md:py-6 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
          <ul className="space-y-1">
            {navItems.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={() => isMobile && setSidebarOpen(false)}
                  className={`flex items-center gap-3 md:gap-4 px-3 md:px-4 py-2 md:py-3 rounded-lg transition duration-200 text-sm md:text-base font-medium ${
                    isActive(item.href)
                      ? 'bg-amber-500/20 text-amber-300 border-l-4 border-amber-400'
                      : 'text-slate-300 hover:bg-slate-700/40 hover:text-white'
                  }`}
                >
                  <item.icon size={18} className="min-w-fit md:min-w-[20px]" />
                  {(sidebarOpen || isMobile) && <span>{item.label}</span>}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* Logout Button */}
        <div className="p-3 md:p-4 border-t border-slate-700/50 bg-slate-800/50">
          <LogoutButton compact={!sidebarOpen && !isMobile} />
        </div>
      </div>

      {/* Mobile overlay */}
      {sidebarOpen && isMobile && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col w-full overflow-hidden">
        {/* Top Bar */}
        <div className="h-16 md:h-20 bg-white shadow-md flex items-center justify-between px-4 md:px-8 border-b border-slate-200">
          <div className="min-w-0">
            <h2 className="text-lg md:text-3xl font-bold text-slate-900 truncate">Admin Panel</h2>
            <p className="hidden md:block text-xs text-slate-500 mt-1">Manage your business efficiently</p>
          </div>
          <div className="hidden md:block text-sm text-slate-600 bg-slate-100 px-4 py-2 rounded-lg whitespace-nowrap">
            Welcome back, Admin
          </div>
        </div>

        {/* Page Content */}
        <div className="flex-1 overflow-auto bg-slate-50">
          <div className="px-4 md:px-8 py-6 md:py-8">{children}</div>
        </div>
      </div>
    </div>
  )
}
