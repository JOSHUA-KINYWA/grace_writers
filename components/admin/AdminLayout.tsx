'use client'

import { ReactNode, useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  FaBars,
  FaTimes,
  FaHome,
  FaUsers,
  FaShoppingCart,
  FaCog,
  FaChartBar,
  FaEnvelope,
  FaFileAlt,
  FaBox,
  FaGift,
  FaComments,
  FaLink,
  FaStar,
} from 'react-icons/fa'
import LogoutButton from './LogoutButton'
import AdminOnlineAlerts from './AdminOnlineAlerts'
import AdminPresenceHeartbeat from '@/components/AdminPresenceHeartbeat'
import DashboardHeaderUser from '@/components/DashboardHeaderUser'
import AdminHeaderAlerts from '@/components/admin/AdminHeaderAlerts'
import EscrowBalanceNavBadge from '@/components/EscrowBalanceNavBadge'
import { useUnreadMessageCount } from '@/hooks/useUnreadMessageCount'
import { useUnreadLiveChatCount } from '@/hooks/useUnreadLiveChatCount'

interface AdminLayoutProps {
  children: ReactNode
}

type NavItem = {
  icon: typeof FaHome
  label: string
  href: string
  badge?: 'messages' | 'livechat'
  highlight?: boolean
}

function AdminNavBadgeLabel({ label, count }: { label: string; count: number }) {
  return (
    <span className="flex items-center gap-2 w-full min-w-0">
      <span className="truncate">{label}</span>
      {count > 0 && (
        <span className="ml-auto min-w-[20px] h-5 px-1.5 rounded-full bg-red-600 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
          {count > 99 ? '99+' : count}
        </span>
      )}
    </span>
  )
}

function AdminNavItemLabel({ item }: { item: NavItem }) {
  const { count: msgCount } = useUnreadMessageCount('admin')
  const liveCount = useUnreadLiveChatCount('admin')
  const count = item.badge === 'messages' ? msgCount : item.badge === 'livechat' ? liveCount : 0
  if (item.badge) return <AdminNavBadgeLabel label={item.label} count={count} />
  return <span className="truncate">{item.label}</span>
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [isMobile, setIsMobile] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768
      setIsMobile(mobile)
      setSidebarOpen(!mobile)
    }
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const navItems: NavItem[] = [
    { icon: FaHome, label: 'Dashboard', href: '/admin' },
    { icon: FaUsers, label: 'Clients', href: '/admin/clients' },
    { icon: FaShoppingCart, label: 'Orders', href: '/admin/orders' },
    {
      icon: FaStar,
      label: 'Manage Ratings',
      href: '/admin/ratings',
      highlight: true,
    },
    { icon: FaEnvelope, label: 'Messages', href: '/admin/messages', badge: 'messages' },
    { icon: FaComments, label: 'Live Chat', href: '/admin/chat', badge: 'livechat' },
    { icon: FaGift, label: 'Referrals', href: '/admin/referrals' },
    { icon: FaChartBar, label: 'Analytics', href: '/admin/analytics' },
    { icon: FaFileAlt, label: 'PayPal Reports', href: '/admin/reports', highlight: true },
    { icon: FaLink, label: 'Payment Links', href: '/admin/payment-links', highlight: true },
    { icon: FaFileAlt, label: 'Inquiries', href: '/admin/inquiries' },
    { icon: FaBox, label: 'Work Samples', href: '/admin/portfolio' },
    { icon: FaCog, label: 'Settings', href: '/admin/settings' },
  ]

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/')
  const showLabels = sidebarOpen || isMobile

  return (
    <div className={`min-h-screen flex flex-col ${isMobile ? '' : 'md:flex-row'} bg-slate-50`}>
      <AdminPresenceHeartbeat />
      <AdminOnlineAlerts />

      <aside
        className={`${
          isMobile
            ? sidebarOpen
              ? 'fixed inset-y-0 left-0 w-72 z-50 translate-x-0'
              : 'fixed inset-y-0 left-0 w-72 z-50 -translate-x-full pointer-events-none'
            : sidebarOpen
              ? 'relative w-72 shrink-0'
              : 'relative w-20 shrink-0'
        } bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-white transition-all duration-300 flex flex-col shadow-2xl`}
      >
        <div className="h-16 md:h-20 flex items-center justify-between px-4 border-b border-slate-700/50 shrink-0">
          {showLabels && (
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-bold text-amber-400">Grace</span>
              <span className="text-xs text-slate-300">Admin Panel</span>
            </div>
          )}
          <button
            type="button"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-slate-700/50 rounded-lg transition text-white ml-auto"
            aria-label="Toggle menu"
          >
            {sidebarOpen ? <FaTimes size={20} /> : <FaBars size={20} />}
          </button>
        </div>

        <nav className="flex-1 px-2 py-4 overflow-y-auto">
          <ul className="space-y-1">
            {navItems.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  title={item.label}
                  onClick={() => isMobile && setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition text-sm font-medium ${
                    isActive(item.href)
                      ? 'bg-amber-500/25 text-amber-200 border-l-4 border-amber-400'
                      : item.highlight
                        ? 'bg-amber-500/10 text-amber-100 hover:bg-amber-500/20 border border-amber-500/40'
                        : 'text-slate-300 hover:bg-slate-700/40 hover:text-white'
                  }`}
                >
                  <item.icon size={18} className="shrink-0" />
                  {showLabels && <AdminNavItemLabel item={item} />}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="p-3 border-t border-slate-700/50 shrink-0">
          <LogoutButton compact={!showLabels} />
        </div>
      </aside>

      {sidebarOpen && isMobile && (
        <button
          type="button"
          aria-label="Close menu"
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className="flex-1 flex flex-col min-w-0 w-full">
        <div className="h-16 md:h-20 bg-white shadow-md flex items-center justify-between px-4 md:px-8 border-b border-slate-200 gap-2">
          {isMobile && (
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="p-2 rounded-lg border border-slate-200 shrink-0"
              aria-label="Open menu"
            >
              <FaBars />
            </button>
          )}
          <div className="min-w-0 flex-1">
            <h2 className="text-lg md:text-2xl font-bold text-slate-900 truncate">Admin Panel</h2>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <EscrowBalanceNavBadge compact={isMobile} />
            <Link
              href="/admin/ratings"
              className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500 text-white px-3 py-2 text-sm font-semibold hover:bg-amber-600 transition"
            >
              <FaStar />
              <span className="hidden sm:inline">Manage Ratings</span>
              <span className="sm:hidden">Ratings</span>
            </Link>
            <AdminHeaderAlerts />
            <DashboardHeaderUser />
          </div>
        </div>

        <div className="flex-1 overflow-auto bg-slate-50">
          <div className="px-4 md:px-8 py-6 md:py-8">{children}</div>
        </div>
      </div>
    </div>
  )
}
