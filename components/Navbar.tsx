'use client'

import Link from 'next/link'
import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { FaBars, FaTimes, FaUser, FaSignOutAlt, FaCog, FaLock, FaSearch } from 'react-icons/fa'
import { createClient } from '@/lib/supabase/client'
import { getCachedAuthUser } from '@/lib/auth/client-session'
import GetQuoteButton from './GetQuoteButton'
import NotificationBadge from './NotificationBadge'

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [userRole, setUserRole] = useState<string | null>(null)
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

  // Notification badge now handles notification display

  useEffect(() => {
    getCachedAuthUser(supabase).then((user) => {
      if (user) {
        setUser(user)
        setUserRole(user.app_metadata?.role || 'client')
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: any, session: any) => {
      if (session?.user) {
        setUser(session.user)
        setUserRole(session.user.app_metadata?.role || 'client')
      } else {
        setUser(null)
        setUserRole(null)
      }
    })

    return () => {
      subscription?.unsubscribe()
    }
  }, [supabase])



  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  return (
    <nav className="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-800 shadow-xl sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center gap-3">
            <Link 
              href={user && userRole === 'admin' ? '/admin' : user ? '/dashboard' : '/'} 
              className="flex items-center gap-3 hover:opacity-90 transition"
            >
              {/* Logo - elegant pen design */}
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-yellow-400 via-yellow-500 to-amber-600 flex items-center justify-center font-bold text-white text-xl shadow-lg">
                ✍
              </div>
              {/* Brand Text */}
              <div className="flex flex-col ml-1">
                <span className="text-lg font-bold text-white leading-tight">Grace Writers</span>
                <span className="text-xs text-white font-semibold tracking-wider">WORDS THAT WORK</span>
              </div>
            </Link>
          </div>

          {/* Search Bar */}
          {user && userRole !== 'admin' && (
            <div className="hidden lg:flex flex-1 max-w-xs mx-4 relative">
              <div className="w-full">
                <div className="relative flex items-center">
                  <FaSearch className="absolute left-3 text-slate-400" size={16} />
                  <input
                    type="text"
                    placeholder="Search orders..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value)
                      handleSearch(e.target.value)
                    }}
                    onFocus={() => setSearchOpen(true)}
                    className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400 text-sm bg-white text-slate-900 placeholder-slate-500"
                  />
                </div>
                {searchOpen && searchResults.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-slate-950 border border-slate-800 rounded-lg shadow-xl z-50">
                    {searchResults.map((result: any) => (
                      <Link
                        key={result.id}
                        href={`/dashboard/orders/${result.id}`}
                        onClick={() => {
                          setSearchOpen(false)
                          setSearchQuery('')
                        }}
                        className="block px-4 py-2 hover:bg-slate-900 transition text-sm text-white border-b border-slate-800 last:border-b-0"
                      >
                        <p className="font-medium text-white">{result.title}</p>
                        <p className="text-xs text-slate-400">{result.status.toUpperCase()}</p>
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
                <Link href="/" className="text-white hover:text-yellow-300 transition font-medium text-sm">
                  Home
                </Link>
                <Link href="/services" className="text-white hover:text-yellow-300 transition font-medium text-sm">
                  Services
                </Link>
                <Link href="/portfolio" className="text-white hover:text-yellow-300 transition font-medium text-sm">
                  Portfolio
                </Link>
                <Link href="/about" className="text-white hover:text-yellow-300 transition font-medium text-sm">
                  About
                </Link>
                
                {/* More Menu for Additional Items */}
                <div className="relative group">
                  <button className="text-white hover:text-yellow-300 transition font-medium text-sm flex items-center gap-1 px-2 py-1 hover:bg-gray-100 rounded">
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

                <div className="flex items-center gap-4 ml-4 pl-4 border-l border-gray-600">
                  {userRole !== 'admin' && (
                    <NotificationBadge userId={user?.id} clientId={user?.user_metadata?.client_id} />
                  )}

                  <div className="relative group">
                    <button className="flex items-center gap-2 text-white hover:text-white transition font-semibold">
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

            {!user && (
              <GetQuoteButton className="text-sm py-2 px-4">Get quote</GetQuoteButton>
            )}
          </div>

          <div className="md:hidden">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="text-gray-100 hover:text-white"
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

            {!user && (
              <div className="px-3 py-2 mt-4">
                <GetQuoteButton className="w-full justify-center text-sm py-2">Get quote</GetQuoteButton>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  )
}
