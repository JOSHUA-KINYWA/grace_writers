'use client'

import Link from 'next/link'
import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { FaBars, FaTimes, FaUser, FaSignOutAlt, FaBell, FaCog, FaLock, FaSearch } from 'react-icons/fa'
import { createClient } from '@/lib/supabase/client'
import WhatsAppButton from './WhatsAppButton'

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [unreadCount, setUnreadCount] = useState(0)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const router = useRouter()

  const supabase = useMemo(() => createClient(), [])

  const handleSearch = useCallback(async (query: string) => {
    if (!query.trim() || !user) {
      setSearchResults([])
      return
    }

    try {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user?.email) return

      const { data: clientData } = await supabase
        .from('clients')
        .select('id')
        .eq('email', userData.user.email)
        .single()

      if (!clientData || !(clientData as any).id) return

      // Search orders by title
      const { data } = await supabase
        .from('orders')
        .select('id, title, status, created_at')
        .eq('client_id', (clientData as any).id)
        .ilike('title', `%${query}%`)
        .limit(5)

      setSearchResults((data as any) || [])
    } catch (err) {
      console.error('Search error:', err)
    }
  }, [supabase, user])

  const fetchUnreadCount = useCallback(async () => {
    try {
      const response = await fetch('/api/unread-message-count')
      if (!response.ok) {
        // Silently fail for 401 (not authenticated) and other errors
        if (response.status !== 401) {
          console.error('Error fetching unread count:', response.status)
        }
        setUnreadCount(0)
        return
      }
      const data = await response.json()
      const total = Object.values(data.unreadByOrder || {}).reduce((sum: number, count: any) => sum + count, 0)
      setUnreadCount(total)
    } catch {
      setUnreadCount(0)
    }
  }, [])

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }: any) => {
      if (user) {
        setUser(user)
        setUserRole(user.user_metadata?.role || 'client')
        fetchUnreadCount()
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: any, session: any) => {
      if (session?.user) {
        setUser(session.user)
        setUserRole(session.user.user_metadata?.role || 'client')
        fetchUnreadCount()
      } else {
        setUser(null)
        setUserRole(null)
      }
    })

    // listen for explicit read events dispatched by chat components
    const handleMessagesRead = () => fetchUnreadCount()
    window.addEventListener('messagesRead', handleMessagesRead)

    return () => {
      subscription?.unsubscribe()
      window.removeEventListener('messagesRead', handleMessagesRead)
    }
  }, [supabase, fetchUnreadCount])

  useEffect(() => {
    const channel = supabase
      .channel('navbar-messages')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'order_messages' }, () => {
        fetchUnreadCount()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, fetchUnreadCount])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  return (
    <nav className="bg-white shadow-lg sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <Link 
              href={user && userRole === 'admin' ? '/admin' : user ? '/dashboard' : '/'} 
              className="text-2xl font-bold text-purple-600"
            >
              Grace Writers
            </Link>
          </div>

          {/* Search Bar */}
          {user && userRole !== 'admin' && (
            <div className="hidden lg:flex flex-1 max-w-xs mx-4 relative">
              <div className="w-full">
                <div className="relative flex items-center">
                  <FaSearch className="absolute left-3 text-gray-400" size={16} />
                  <input
                    type="text"
                    placeholder="Search orders..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value)
                      handleSearch(e.target.value)
                    }}
                    onFocus={() => setSearchOpen(true)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                  />
                </div>
                {searchOpen && searchResults.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-300 rounded-lg shadow-lg z-50">
                    {searchResults.map((result: any) => (
                      <Link
                        key={result.id}
                        href={`/dashboard/orders/${result.id}`}
                        onClick={() => {
                          setSearchOpen(false)
                          setSearchQuery('')
                        }}
                        className="block px-4 py-2 hover:bg-gray-100 transition text-sm text-gray-700 border-b border-gray-100 last:border-b-0"
                      >
                        <p className="font-medium">{result.title}</p>
                        <p className="text-xs text-gray-500">{result.status.toUpperCase()}</p>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="hidden md:flex items-center space-x-6">
            {!user && (
              <>
                <Link href="/" className="text-gray-700 hover:text-purple-600 transition font-medium text-sm">
                  Home
                </Link>
                <Link href="/services" className="text-gray-700 hover:text-purple-600 transition font-medium text-sm">
                  Services
                </Link>
                <Link href="/portfolio" className="text-gray-700 hover:text-purple-600 transition font-medium text-sm">
                  Portfolio
                </Link>
                <Link href="/about" className="text-gray-700 hover:text-purple-600 transition font-medium text-sm">
                  About
                </Link>
                
                {/* More Menu for Additional Items */}
                <div className="relative group">
                  <button className="text-gray-700 hover:text-purple-600 transition font-medium text-sm flex items-center gap-1 px-2 py-1 hover:bg-gray-100 rounded">
                    More ▼
                  </button>
                  <div className="absolute left-0 mt-1 w-44 bg-white rounded-lg shadow-xl border border-gray-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                    <Link href="/contact" className="block px-4 py-2 text-gray-700 hover:bg-purple-50 rounded-lg transition font-medium text-sm">Contact</Link>
                  </div>
                </div>

                <Link href="/login" className="text-white bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-lg transition font-medium">
                  Login
                </Link>
              </>
            )}

            {user && (
              <div className="flex items-center gap-4">
                {userRole !== 'admin' && (
                  <div className="flex items-center gap-3 ml-4">
                    {/* System elements only - no content navigation */}
                  </div>
                )}

                <div className="flex items-center gap-4 ml-4 pl-4 border-l border-gray-300">
                  <button
                    onClick={() => router.push(userRole === 'admin' ? '/admin/messages' : '/dashboard/messages')}
                    title="View notifications"
                    className="relative text-gray-700 hover:text-purple-600 transition text-xl"
                  >
                    <FaBell />
                    {unreadCount > 0 && (
                      <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </button>

                  <div className="relative group">
                    <button className="flex items-center gap-2 text-gray-700 hover:text-purple-600 transition font-semibold">
                      <FaUser />
                      {user?.email?.split('@')[0]}
                    </button>

                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-gray-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                      <div className="p-4 border-b border-gray-200">
                        <p className="text-sm text-gray-600">{user?.email}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {userRole === 'admin' ? 'Admin' : 'Client'}
                        </p>
                      </div>

                      <div className="space-y-1 p-2">
                        <Link
                          href={userRole === 'admin' ? '/admin' : '/dashboard'}
                          className="flex items-center gap-3 px-4 py-2 text-gray-700 hover:bg-purple-50 rounded transition text-sm"
                        >
                          <FaUser size={14} /> {userRole === 'admin' ? 'Admin' : 'Dashboard'}
                        </Link>

                        <Link
                          href="/account/profile"
                          className="flex items-center gap-3 px-4 py-2 text-gray-700 hover:bg-purple-50 rounded transition text-sm"
                        >
                          <FaCog size={14} /> Settings
                        </Link>

                        <Link
                          href="/account/change-password"
                          className="flex items-center gap-3 px-4 py-2 text-gray-700 hover:bg-purple-50 rounded transition text-sm"
                        >
                          <FaLock size={14} /> Password
                        </Link>

                        <button
                          onClick={handleLogout}
                          className="w-full flex items-center gap-3 px-4 py-2 text-red-600 hover:bg-red-50 rounded transition mt-1 border-t border-gray-200 text-sm"
                        >
                          <FaSignOutAlt size={14} /> Logout
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <WhatsAppButton variant="default" className="text-sm">
              Urgent Help
            </WhatsAppButton>
          </div>

          <div className="md:hidden">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="text-gray-700 hover:text-purple-600"
            >
              {isOpen ? <FaTimes size={24} /> : <FaBars size={24} />}
            </button>
          </div>
        </div>
      </div>

      {isOpen && (
        <div className="md:hidden bg-white border-t">
          <div className="px-4 pt-2 pb-3 space-y-1">
            {!user && (
              <>
                <Link href="/" className="block px-3 py-2 text-gray-700 hover:bg-purple-50 rounded font-medium">
                  Home
                </Link>
                <Link href="/services" className="block px-3 py-2 text-gray-700 hover:bg-purple-50 rounded font-medium">
                  Services
                </Link>
                <Link href="/portfolio" className="block px-3 py-2 text-gray-700 hover:bg-purple-50 rounded font-medium">
                  Portfolio
                </Link>
                <Link href="/about" className="block px-3 py-2 text-gray-700 hover:bg-purple-50 rounded font-medium">
                  About Us
                </Link>
                <Link href="/contact" className="block px-3 py-2 text-gray-700 hover:bg-purple-50 rounded font-medium">
                  Contact
                </Link>
                <Link href="/login" className="block px-3 py-2 text-white bg-purple-600 hover:bg-purple-700 rounded font-semibold text-center">
                  Login
                </Link>
              </>
            )}

            {user && (
              <>
                <div className="px-3 py-2 border-b border-gray-200">
                  <p className="font-semibold text-gray-900">{user?.email?.split('@')[0]}</p>
                  <p className="text-xs text-gray-500">{user?.email}</p>
                </div>

                {userRole !== 'admin' && (
                  <>
                    <Link href="/" className="block px-3 py-2 text-gray-700 hover:bg-purple-50 rounded font-medium">
                      Home
                    </Link>
                    <Link href="/services" className="block px-3 py-2 text-gray-700 hover:bg-purple-50 rounded font-medium">
                      Services
                    </Link>
                    <Link href="/portfolio" className="block px-3 py-2 text-gray-700 hover:bg-purple-50 rounded font-medium">
                      Portfolio
                    </Link>
                    <Link href="/dashboard" className="block px-3 py-2 text-purple-600 hover:bg-purple-50 rounded font-semibold">
                      My Orders
                    </Link>
                    <Link href="/dashboard/messages" className="block px-3 py-2 text-gray-700 hover:bg-purple-50 rounded font-medium">
                      Messages
                    </Link>
                    <Link href="/about" className="block px-3 py-2 text-gray-700 hover:bg-purple-50 rounded font-medium">
                      About Us
                    </Link>
                    <Link href="/contact" className="block px-3 py-2 text-gray-700 hover:bg-purple-50 rounded font-medium">
                      Contact
                    </Link>
                  </>
                )}

                <div className="px-3 py-2 border-t border-gray-200 mt-2">
                  <p className="text-xs text-gray-600 font-semibold mb-2">Account</p>
                </div>

                <Link href={userRole === 'admin' ? '/admin' : '/dashboard'} className="block px-3 py-2 text-gray-700 hover:bg-purple-50 rounded font-medium">
                  {userRole === 'admin' ? 'Admin Dashboard' : 'Dashboard'}
                </Link>

                <Link href="/account/profile" className="block px-3 py-2 text-gray-700 hover:bg-purple-50 rounded flex items-center gap-2">
                  <FaCog size={14} /> Settings
                </Link>

                <Link href="/account/change-password" className="block px-3 py-2 text-gray-700 hover:bg-purple-50 rounded flex items-center gap-2">
                  <FaLock size={14} /> Password
                </Link>

                <button
                  onClick={() => {
                    setIsOpen(false)
                    handleLogout()
                  }}
                  className="block w-full text-left px-3 py-2 text-red-600 hover:bg-red-50 rounded flex items-center gap-2"
                >
                  <FaSignOutAlt size={14} /> Logout
                </button>
              </>
            )}

            <div className="px-3 py-2 mt-4">
              <WhatsAppButton variant="default" className="w-full justify-center">
                Urgent Help
              </WhatsAppButton>
            </div>
          </div>
        </div>
      )}
    </nav>
  )
}
