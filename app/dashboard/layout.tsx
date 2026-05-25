'use client'

import { ReactNode, useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { 
  FaBars, 
  FaTimes, 
  FaHome, 
  FaShoppingCart, 
  FaEnvelope, 
  FaFileAlt, 
  FaCog,
  FaSignOutAlt,
  FaImages,
  FaWhatsapp,
  FaStar,
} from 'react-icons/fa'
import { getUrgentWhatsAppHref } from '@/lib/support-contact'
import MessageNavBadge from '@/components/MessageNavBadge'
import DashboardHeaderUser from '@/components/DashboardHeaderUser'
import UrgentWhatsAppNavButton from '@/components/UrgentWhatsAppNavButton'
import { useUnreadMessageCount } from '@/hooks/useUnreadMessageCount'

interface DashboardLayoutProps {
  children: ReactNode
}

function ClientNavMessagesLabel({ label }: { label: string }) {
  const { count } = useUnreadMessageCount('client')
  return (
    <span className="flex items-center gap-2 w-full">
      <span>{label}</span>
      {count > 0 && (
        <span className="ml-auto min-w-[20px] h-5 px-1.5 rounded-full bg-red-600 text-white text-[10px] font-bold flex items-center justify-center">
          {count > 99 ? '99+' : count}
        </span>
      )}
    </span>
  )
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const pathname = usePathname()
  const supabase = createClient()

  useEffect(() => {
    fetch('/api/client/link-auth', { method: 'POST' }).catch(() => {})
  }, [])

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768
      setIsMobile(mobile)
      if (!mobile) {
        setSidebarOpen(true)
      } else {
        setSidebarOpen(false)
      }
    }

    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    if (isMobile) setSidebarOpen(false)
  }, [pathname, isMobile])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  const navItems = [
    { icon: FaHome, label: 'Dashboard', href: '/dashboard' },
    { icon: FaShoppingCart, label: 'My Orders', href: '/dashboard/orders' },
    { icon: FaImages, label: 'Work Samples', href: '/dashboard/samples' },
    { icon: FaFileAlt, label: 'Revisions', href: '/dashboard/revisions' },
    { icon: FaEnvelope, label: 'Messages', href: '/dashboard/messages' },
    { icon: FaStar, label: 'Reviews', href: '/dashboard/reviews' },
    { icon: FaCog, label: 'Account', href: '/account/profile' },
  ]

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/')

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-gray-50">
      {/* Mobile overlay */}
      {sidebarOpen && isMobile && (
        <button
          type="button"
          aria-label="Close menu"
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`${
          isMobile
            ? sidebarOpen
              ? 'fixed inset-y-0 left-0 w-72 z-50 translate-x-0'
              : 'fixed inset-y-0 left-0 w-72 z-50 -translate-x-full pointer-events-none'
            : sidebarOpen
              ? 'relative w-72'
              : 'relative w-20'
        } bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-white transition-all duration-300 flex flex-col shadow-2xl shrink-0`}
      >
        <div className="h-16 md:h-20 flex items-center justify-between px-4 border-b border-slate-700/50">
          {(sidebarOpen || isMobile) && (
            <div className="flex flex-col">
              <span className="text-sm font-bold text-amber-400">Grace</span>
              <span className="text-xs text-slate-300">Client Portal</span>
            </div>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-slate-700/50 rounded-lg transition text-white ml-auto"
            aria-label={sidebarOpen ? 'Collapse menu' : 'Expand menu'}
          >
            {sidebarOpen ? <FaTimes size={20} /> : <FaBars size={20} />}
          </button>
        </div>

        <nav className="flex-1 px-2 py-4 md:py-6 overflow-y-auto">
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
                  {(sidebarOpen || isMobile) &&
                    (item.href === '/dashboard/messages' ? (
                      <ClientNavMessagesLabel label={item.label} />
                    ) : (
                      <span>{item.label}</span>
                    ))}
                </Link>
              </li>
            ))}
          </ul>
          {(sidebarOpen || isMobile) && (
            <div className="px-2 mt-4">
              <a
                href={getUrgentWhatsAppHref()}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 px-3 py-3 rounded-lg bg-green-600/90 hover:bg-green-600 text-white font-semibold text-sm transition"
              >
                <FaWhatsapp size={18} />
                Urgent help (WhatsApp)
              </a>
              <p className="text-[0.65rem] text-slate-400 px-3 mt-2 leading-snug">
                Quotes, feedback, or if live chat is slow
              </p>
            </div>
          )}
        </nav>

        <div className="p-3 md:p-4 border-t border-slate-700/50 bg-slate-800/50">
          {sidebarOpen || isMobile ? (
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3 md:px-4 py-2 md:py-3 bg-red-600/20 hover:bg-red-600/30 text-red-300 rounded-lg transition duration-200 font-medium text-sm md:text-base"
            >
              <FaSignOutAlt size={16} />
              <span>Logout</span>
            </button>
          ) : (
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center px-3 md:px-4 py-2 md:py-3 bg-red-600/20 hover:bg-red-600/30 text-red-300 rounded-lg transition duration-200"
              title="Logout"
            >
              <FaSignOutAlt size={16} />
            </button>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 w-full">
        <div className="h-16 md:h-20 bg-white shadow-md flex items-center justify-between px-4 md:px-8 border-b border-slate-200 gap-3">
          {isMobile && (
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="p-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 shrink-0"
              aria-label="Open menu"
            >
              <FaBars size={18} />
            </button>
          )}
          <div className="min-w-0 flex-1">
            <h2 className="text-lg md:text-3xl font-bold text-slate-900 truncate">Client Dashboard</h2>
            <p className="hidden md:block text-xs text-slate-500 mt-1">Manage your orders and projects</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <UrgentWhatsAppNavButton compact={isMobile} />
            <MessageNavBadge
              role="client"
              href="/dashboard/messages"
              className="text-sm text-slate-600 bg-slate-100 hover:bg-slate-200 px-3 py-2 rounded-lg"
              iconOnly={isMobile}
            />
            <DashboardHeaderUser />
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          <div className="px-4 md:px-8 py-6 md:py-8">{children}</div>
        </div>
      </div>
    </div>
  )
}
