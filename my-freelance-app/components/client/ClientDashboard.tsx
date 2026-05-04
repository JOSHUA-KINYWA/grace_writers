"use client"

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import ClientLayout from './ClientLayout'
import { FaCheckCircle, FaClock, FaHourglass, FaBox, FaFire, FaFilter, FaComments, FaUserCircle, FaArrowRight, FaHistory, FaStar } from 'react-icons/fa'
import { formatDate } from '@/lib/utils/formatDate'

interface ClientDashboardProps {
  userId: string
  initialOrders?: any[]
  client?: any
}

export default function ClientDashboard({ userId, initialOrders = [], client }: ClientDashboardProps) {
  const router = useRouter()
  const [sortBy, setSortBy] = useState<'newest' | 'deadline' | 'status'>('newest')
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'pending' | 'completed' | 'revision'>('all')
  const [filterCategory, setFilterCategory] = useState('all')
  const [deadlineFilter, setDeadlineFilter] = useState<'all' | 'upcoming' | 'overdue' | 'next7'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [unreadCount, setUnreadCount] = useState(0)
  const [reviewHistory, setReviewHistory] = useState<any[]>([])
  const [reviewLoading, setReviewLoading] = useState(false)

  const orders = initialOrders || []

  const serviceCategories = useMemo(() => {
    const categories = new Set<string>()
    orders.forEach((order: any) => {
      const category = order.services?.category || order.services?.title || 'Custom'
      if (category) categories.add(category)
    })
    return Array.from(categories).sort()
  }, [orders])

  const completedOrders = useMemo(() => orders.filter((order: any) => order.status === 'completed'), [orders])

  const averageRating = useMemo(() => {
    if (!reviewHistory.length) return 0
    const ratings = reviewHistory.map((item: any) => Number(item.rating) || 0)
    return ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length
  }, [reviewHistory])

  const handleRepeatOrder = (order: any) => {
    if (typeof window !== 'undefined') {
      const repeatKey = `grace_writers_order_repeat_${order.id}`
      const repeatTemplate = {
        id: order.id,
        service_id: order.service_id || '',
        title: order.title || '',
        description: order.description || '',
        requirements: order.requirements || '',
        word_count: order.word_count ? String(order.word_count) : '',
        deadline: order.deadline || '',
      }
      window.localStorage.setItem(repeatKey, JSON.stringify(repeatTemplate))
    }
    router.push(`/orders/new?repeat=${order.id}`)
  }

  // Filter orders
  const filteredOrders = useMemo(() => {
    let filtered = [...orders]

    if (filterStatus !== 'all') {
      if (filterStatus === 'active') {
        filtered = filtered.filter((o: any) => o.status === 'in_progress')
      } else if (filterStatus === 'pending') {
        filtered = filtered.filter((o: any) => o.status === 'pending' || o.status === 'quote_sent')
      } else if (filterStatus === 'completed') {
        filtered = filtered.filter((o: any) => o.status === 'completed')
      } else if (filterStatus === 'revision') {
        filtered = filtered.filter((o: any) => o.status === 'revision')
      }
    }

    if (filterCategory !== 'all') {
      filtered = filtered.filter((o: any) => {
        const category = o.services?.category || o.services?.title || 'Custom'
        return category === filterCategory
      })
    }

    if (deadlineFilter !== 'all') {
      const now = new Date()
      const nextWeek = new Date(now)
      nextWeek.setDate(nextWeek.getDate() + 7)
      filtered = filtered.filter((o: any) => {
        if (!o.deadline) return false
        const deadline = new Date(o.deadline)
        if (deadlineFilter === 'overdue') return deadline < now
        if (deadlineFilter === 'upcoming') return deadline >= now
        if (deadlineFilter === 'next7') return deadline >= now && deadline <= nextWeek
        return true
      })
    }

    if (searchQuery.trim()) {
      const query = searchQuery.trim().toLowerCase()
      filtered = filtered.filter((o: any) => {
        const title = o.title || ''
        const description = o.description || ''
        const requirements = o.requirements || ''
        const serviceName = o.services?.title || ''
        const category = o.services?.category || ''
        const orderId = o.id || ''

        return [title, description, requirements, serviceName, category, orderId, o.status]
          .some((value) => value?.toString().toLowerCase().includes(query))
      })
    }

    // Sort orders
    if (sortBy === 'deadline') {
      filtered.sort((a: any, b: any) => {
        if (!a.deadline) return 1
        if (!b.deadline) return -1
        return new Date(a.deadline).getTime() - new Date(b.deadline).getTime()
      })
    } else if (sortBy === 'status') {
      const statusOrder = { pending: 0, quote_sent: 1, in_progress: 2, revision: 3, delivered: 4, completed: 5 }
      filtered.sort((a: any, b: any) => (statusOrder[a.status as keyof typeof statusOrder] || 6) - (statusOrder[b.status as keyof typeof statusOrder] || 6))
    } else {
      filtered.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    }

    return filtered
  }, [orders, filterStatus, sortBy, filterCategory, deadlineFilter, searchQuery])

  const stats = [
    { label: 'Active', count: orders?.filter((o: any) => o.status === 'in_progress').length || 0, icon: FaClock, color: 'blue', statusKey: 'active' },
    { label: 'Pending', count: orders?.filter((o: any) => o.status === 'pending' || o.status === 'quote_sent').length || 0, icon: FaHourglass, color: 'yellow', statusKey: 'pending' },
    { label: 'On Revision', count: orders?.filter((o: any) => o.status === 'revision').length || 0, icon: FaFire, color: 'orange', statusKey: 'revision' },
    { label: 'Completed', count: orders?.filter((o: any) => o.status === 'completed').length || 0, icon: FaCheckCircle, color: 'green', statusKey: 'completed' },
    { label: 'Total', count: orders?.length || 0, icon: FaBox, color: 'gray', statusKey: 'all' },
  ]

  const statColorClasses: Record<string, string> = {
    blue: 'bg-blue-50 border-blue-300 hover:bg-blue-100 text-blue-900',
    yellow: 'bg-amber-50 border-amber-300 hover:bg-amber-100 text-amber-900',
    orange: 'bg-orange-50 border-orange-300 hover:bg-orange-100 text-orange-900',
    green: 'bg-green-50 border-green-300 hover:bg-green-100 text-green-900',
    gray: 'bg-slate-50 border-slate-300 hover:bg-slate-100 text-slate-900',
  }

  const renderStatCard = (stat: typeof stats[number], idx: number) => {
    const Icon = stat.icon

    return (
      <button
        key={idx}
        onClick={() => setFilterStatus(stat.statusKey as any)}
        className={`bg-white rounded-lg border ${statColorClasses[stat.color] || 'bg-slate-50 border-slate-300'} p-4 md:p-5 shadow-sm hover:shadow-md transition cursor-pointer text-left ${
          filterStatus === stat.statusKey ? 'ring-2 ring-purple-500' : ''
        }`}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">{stat.label}</p>
            <p className="text-xl md:text-2xl font-bold mt-1">{stat.count}</p>
          </div>
          <Icon size={24} className="opacity-40 flex-shrink-0" />
        </div>
      </button>
    )
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-amber-100 text-amber-900 border-amber-300 font-medium'
      case 'quote_sent': return 'bg-blue-100 text-blue-900 border-blue-300 font-medium'
      case 'in_progress': return 'bg-purple-100 text-purple-900 border-purple-300 font-medium'
      case 'revision': return 'bg-orange-100 text-orange-900 border-orange-300 font-medium'
      case 'delivered': return 'bg-cyan-100 text-cyan-900 border-cyan-300 font-medium'
      case 'completed': return 'bg-green-100 text-green-900 border-green-300 font-medium'
      default: return 'bg-slate-100 text-slate-900 border-slate-300 font-medium'
    }
  }

  const getOrderCardNote = (order: any) => {
    switch (order.status) {
      case 'pending':
        return 'Waiting for quote or order confirmation.'
      case 'quote_sent':
        return 'Quote sent — review and approve to begin work.'
      case 'in_progress':
        return 'Work is underway. Expect an update soon.'
      case 'delivered':
        return 'Deliverables are ready for your review.'
      case 'revision':
        return 'Revision requested — we are updating the order.'
      case 'completed':
        return 'This order is complete. Leave feedback if needed.'
      default:
        return 'Order status is being updated.'
    }
  }

  const recentActivity = useMemo(() => {
    return [...orders]
      .sort((a: any, b: any) => new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime())
      .slice(0, 4)
      .map((order: any) => {
        let title = 'Order updated'
        let detail = ''

        switch (order.status) {
          case 'pending':
            title = 'Awaiting quote'
            detail = 'Your order is waiting to be reviewed and priced.'
            break
          case 'quote_sent':
            title = 'Quote sent'
            detail = 'Review the quote and approve to start the project.'
            break
          case 'in_progress':
            title = 'Work in progress'
            detail = 'The writer is currently working on your order.'
            break
          case 'delivered':
            title = 'Deliverables ready'
            detail = 'Your files are uploaded and ready for review.'
            break
          case 'revision':
            title = 'Revision active'
            detail = 'A revision request is active on this order.'
            break
          case 'completed':
            title = 'Order complete'
            detail = 'The project has been completed successfully.'
            break
          default:
            detail = 'Recent order activity has been recorded.'
        }

        return {
          id: order.id,
          title,
          detail,
          date: order.updated_at || order.created_at,
          orderTitle: order.title,
        }
      })
  }, [orders])

  useEffect(() => {
    const supabase = createClient()

    async function loadUnreadCount() {
      try {
        const res = await fetch('/api/unread-message-count')
        if (!res.ok) return
        const data = await res.json()
        const unreadByOrder = (data?.unreadByOrder || {}) as Record<string, number>
        const total = Object.values(unreadByOrder).reduce((sum, value) => sum + Number(value || 0), 0)
        setUnreadCount(total)
      } catch (error) {
        console.error('Failed to load unread message count', error)
      }
    }

    loadUnreadCount()

    const handleMessagesRead = () => loadUnreadCount()
    window.addEventListener('messagesRead', handleMessagesRead)

    const channel = supabase
      .channel('client-dashboard-unread')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'order_messages' }, () => {
        loadUnreadCount()
      })
      .subscribe()

    return () => {
      window.removeEventListener('messagesRead', handleMessagesRead)
      supabase.removeChannel(channel)
    }
  }, [])

  useEffect(() => {
    async function loadReviewHistory() {
      if (completedOrders.length === 0) {
        setReviewHistory([])
        return
      }

      setReviewLoading(true)
      try {
        const response = await fetch('/api/order-ratings?completed=true', {
          cache: 'no-store',
          credentials: 'same-origin',
        })

        if (!response.ok) {
          const text = await response.text()
          let errorData: any = null
          try {
            errorData = JSON.parse(text)
          } catch {
            errorData = text
          }
          console.error('Unable to fetch review history:', response.status, response.url, errorData)
          setReviewHistory([])
          return
        }

        const data = await response.json()
        setReviewHistory(Array.isArray(data) ? data : [])
      } catch (error) {
        console.error('Failed to load review history:', error)
        setReviewHistory([])
      } finally {
        setReviewLoading(false)
      }
    }

    loadReviewHistory()
  }, [completedOrders.length])

  const isOverdue = (deadline: string) => {
    if (!deadline) return false
    return new Date(deadline) < new Date()
  }

  return (
    <ClientLayout clientName={client?.name || 'Client'}>
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-[240px_minmax(0,1fr)] gap-4 md:gap-6 auto-rows-max md:auto-rows-auto">
        <aside className="hidden md:flex flex-col space-y-6 md:sticky md:top-4 md:h-fit">
          <div className="space-y-5">
            <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-600">Quick</p>
              <h2 className="mt-2 text-lg font-bold text-slate-900">Actions</h2>
              <div className="mt-4 space-y-2 text-sm">
                <Link href="/dashboard" className="flex items-center justify-between w-full rounded-lg border border-slate-200 px-3 py-2 font-medium text-slate-700 hover:border-purple-300 hover:bg-purple-50 transition">
                  <span>Dashboard</span>
                  <FaArrowRight className="text-slate-400 text-xs" />
                </Link>
                <Link href="/dashboard/messages" className="flex items-center justify-between w-full rounded-lg border border-slate-200 px-3 py-2 font-medium text-slate-700 hover:border-purple-300 hover:bg-purple-50 transition">
                  <span className="flex items-center gap-2">
                    Messages
                    {unreadCount > 0 && (
                      <span className="inline-flex items-center justify-center rounded-full bg-red-600 px-1.5 py-0.5 text-[0.6rem] font-bold text-white">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </span>
                  <FaComments className="text-slate-400 text-xs" />
                </Link>
                <Link href="/dashboard/revisions" className="flex items-center justify-between w-full rounded-lg border border-slate-200 px-3 py-2 font-medium text-slate-700 hover:border-purple-300 hover:bg-purple-50 transition">
                  <span>Revisions</span>
                  <FaArrowRight className="text-slate-400 text-xs" />
                </Link>
                <Link href="/dashboard/referrals" className="flex items-center justify-between w-full rounded-lg border border-slate-200 px-3 py-2 font-medium text-slate-700 hover:border-purple-300 hover:bg-purple-50 transition">
                  <span>Referrals</span>
                  <FaArrowRight className="text-slate-400 text-xs" />
                </Link>
                <Link href="/orders/new" className="flex items-center justify-between w-full rounded-lg border border-slate-200 px-3 py-2 font-medium text-slate-700 hover:border-purple-300 hover:bg-purple-50 transition">
                  <span>New Order</span>
                  <FaArrowRight className="text-slate-400 text-xs" />
                </Link>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 text-purple-700 flex-shrink-0">
                  <FaUserCircle size={20} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-900 truncate">{client?.name || 'Client'}</p>
                  <p className="text-xs text-slate-600 truncate">{client?.email || 'No email'}</p>
                </div>
              </div>
              <div className="mt-4 space-y-2 text-sm">
                <div className="rounded-lg bg-slate-50 border border-slate-100 p-3">
                  <p className="font-semibold text-slate-900 text-xs uppercase tracking-wide">Total Orders</p>
                  <p className="text-lg font-bold text-slate-900 mt-1">{orders.length}</p>
                </div>
                <div className="rounded-lg bg-amber-50 border border-amber-100 p-3">
                  <p className="font-semibold text-amber-900 text-xs uppercase tracking-wide">Pending</p>
                  <p className="text-lg font-bold text-amber-900 mt-1">{stats.find((item) => item.statusKey === 'pending')?.count || 0}</p>
                </div>
                <div className="rounded-lg bg-purple-50 border border-purple-100 p-3">
                  <p className="font-semibold text-purple-900 text-xs uppercase tracking-wide">In Progress</p>
                  <p className="text-lg font-bold text-purple-900 mt-1">{stats.find((item) => item.statusKey === 'active')?.count || 0}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">Activity</p>
                  <h2 className="text-lg font-bold text-slate-900">Recent updates</h2>
                </div>
                <FaHistory className="text-slate-400" />
              </div>
              <div className="space-y-3">
                {recentActivity.length > 0 ? (
                  recentActivity.map((event) => (
                    <Link
                      key={event.id}
                      href={`/dashboard/orders/${event.id}`}
                      className="block rounded-xl border border-slate-200 bg-slate-50 p-3 hover:bg-slate-100 transition"
                    >
                      <p className="text-sm font-semibold text-slate-900 truncate">{event.title}</p>
                      <p className="text-xs text-slate-500 truncate">{event.orderTitle}</p>
                      <p className="mt-2 text-[0.7rem] uppercase tracking-wide text-slate-400">{formatDate(event.date)}</p>
                    </Link>
                  ))
                ) : (
                  <p className="text-sm text-slate-600">No recent order activity to show.</p>
                )}
              </div>
            </div>

            <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-slate-600">Review History</p>
                  <h2 className="text-lg font-bold text-slate-900">Completed orders</h2>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-slate-900">{reviewHistory.length} reviews</p>
                  {reviewHistory.length > 0 && (
                    <p className="text-xs text-slate-500">{averageRating.toFixed(1)} / 5 average</p>
                  )}
                </div>
              </div>
              <div className="space-y-3">
                {reviewLoading ? (
                  <p className="text-sm text-slate-600">Loading review history...</p>
                ) : reviewHistory.length > 0 ? (
                  reviewHistory.slice(0, 3).map((review) => (
                    <div key={`${review.order_id}-${review.id || review.created_at}`} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-slate-900 truncate">{review.order?.title || 'Completed order'}</p>
                        <span className="text-xs font-semibold text-amber-700">{Number(review.rating).toFixed(1)} / 5</span>
                      </div>
                      <div className="mt-2 flex items-center gap-1 text-yellow-500">
                        {[...Array(5)].map((_, index) => (
                          <FaStar
                            key={index}
                            className={index < Number(review.rating) ? 'text-yellow-500' : 'text-slate-300'}
                          />
                        ))}
                      </div>
                      {review.review_comment && (
                        <p className="text-sm text-slate-600 mt-2 line-clamp-2">{review.review_comment}</p>
                      )}
                      <p className="text-xs text-slate-400 mt-2">Order ID: {String(review.order_id).padStart(9, '0')}</p>
                    </div>
                  ))
                ) : completedOrders.length > 0 ? (
                  <p className="text-sm text-slate-600">You have completed orders but no ratings yet. Leave feedback once a project is finished.</p>
                ) : (
                  <p className="text-sm text-slate-600">No completed orders yet.</p>
                )}
              </div>
            </div>

          </div>
        </aside>

        <section className="col-span-1 md:col-span-2 lg:col-span-1 space-y-6">
          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2 md:gap-3">
            {stats.map((stat, idx) => renderStatCard(stat, idx))}
          </div>

          {/* Orders Section */}
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-4 md:px-6 py-4 md:py-5 border-b border-slate-200">
              <div className="flex items-center justify-between gap-3 mb-4">
                <h2 className="text-lg md:text-2xl font-bold text-slate-900">Your Orders</h2>
                <Link
                  href="/orders/new"
                  className="px-3 md:px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:shadow-lg transition font-medium text-xs md:text-sm shadow-md whitespace-nowrap"
                >
                  + New
                </Link>
              </div>

              {/* Filter & Sort Bar */}
              <div className="space-y-3">
                <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-3">
                  <div className="relative">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search orders by title, ID, status, keyword..."
                      className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200"
                    />
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <select
                      value={filterCategory}
                      onChange={(e) => setFilterCategory(e.target.value)}
                      className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200"
                    >
                      <option value="all">All services / categories</option>
                      {serviceCategories.map((category) => (
                        <option key={category} value={category}>{category}</option>
                      ))}
                    </select>
                    <select
                      value={deadlineFilter}
                      onChange={(e) => setDeadlineFilter(e.target.value as any)}
                      className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200"
                    >
                      <option value="all">Deadline: All</option>
                      <option value="upcoming">Upcoming</option>
                      <option value="next7">Next 7 days</option>
                      <option value="overdue">Overdue</option>
                    </select>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 items-center">
                  <div className="flex items-center gap-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-600">
                    <FaFilter size={12} className="text-slate-600" />
                    Filter
                  </div>
                  {(['all', 'active', 'pending', 'revision', 'completed'] as const).map((status) => (
                    <button
                      key={status}
                      onClick={() => setFilterStatus(status)}
                      className={`px-3 py-2 text-xs font-medium rounded-full transition ${
                        filterStatus === status
                          ? 'bg-purple-600 text-white shadow-md'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {status === 'active' ? 'Active' : status.charAt(0).toUpperCase() + status.slice(1)}
                    </button>
                  ))}
                  <div className="ml-auto flex items-center gap-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-600">
                    Sort
                  </div>
                  {(['newest', 'deadline', 'status'] as const).map((sort) => (
                    <button
                      key={sort}
                      onClick={() => setSortBy(sort)}
                      className={`px-3 py-2 text-xs font-medium rounded-full transition ${
                        sortBy === sort
                          ? 'bg-blue-600 text-white shadow-md'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {sort.charAt(0).toUpperCase() + sort.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {filteredOrders && filteredOrders.length > 0 ? (
              <div className="divide-y divide-slate-200">
                {filteredOrders.map((order: any) => (
                  <div
                    key={order.id}
                    className="bg-white hover:bg-slate-50/50 transition p-4 md:p-6 border-b border-slate-100 last:border-b-0"
                  >
                    <div className="flex flex-col md:flex-row items-start md:items-start md:justify-between gap-3 md:gap-4">
                      <div className="flex-1 min-w-0 w-full">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-3">
                          <h3 className="text-base md:text-lg font-bold text-slate-900 truncate">{order.title}</h3>
                          <span className={`px-2.5 py-1 text-xs font-semibold rounded-full border ${getStatusColor(order.status)} whitespace-nowrap`}>
                            {order.status.replace('_', ' ').toUpperCase()}
                          </span>
                          {order.status === 'revision' && (
                            <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-orange-100 text-orange-900 border border-orange-300">
                              🔄 REV
                            </span>
                          )}
                          {isOverdue(order.deadline) && order.status !== 'completed' && (
                            <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-red-100 text-red-900 border border-red-300">
                              ⚠️ DUE
                            </span>
                          )}
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs md:text-sm mb-4">
                          {order.services?.title && (
                            <div>
                              <p className="font-bold text-slate-600 uppercase text-[0.7rem] md:text-xs">Service</p>
                              <p className="text-slate-900 font-medium mt-1 truncate">{order.services.title}</p>
                            </div>
                          )}
                          {order.deadline && (
                            <div>
                              <p className="font-bold text-slate-600 uppercase text-[0.7rem] md:text-xs">Deadline</p>
                              <p className={`font-medium mt-1 ${isOverdue(order.deadline) && order.status !== 'completed' ? 'text-red-700 font-bold' : 'text-slate-900'}`}>
                                {formatDate(order.deadline)}
                              </p>
                            </div>
                          )}
                          {order.quote_amount && (
                            <div>
                              <p className="font-bold text-slate-600 uppercase text-[0.7rem] md:text-xs">Budget</p>
                              <p className="text-slate-900 font-bold mt-1">${order.quote_amount.toLocaleString()}</p>
                            </div>
                          )}
                          {order.word_count && (
                            <div>
                              <p className="font-bold text-slate-600 uppercase text-[0.7rem] md:text-xs">Words</p>
                              <p className="text-slate-900 font-medium mt-1">{order.word_count.toLocaleString()}</p>
                            </div>
                          )}
                        </div>
                        <p className="text-sm text-slate-600">{getOrderCardNote(order)}</p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => handleRepeatOrder(order)}
                          className="px-3 md:px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg transition font-semibold text-xs md:text-sm shadow-sm whitespace-nowrap"
                        >
                          Repeat Order
                        </button>
                        <Link
                          href={`/dashboard/orders/${order.id}`}
                          className="px-3 md:px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition font-semibold text-xs md:text-sm shadow-md hover:shadow-lg whitespace-nowrap"
                        >
                          View Details
                        </Link>
                      </div>
                    </div>

                    {/* Additional info row */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pt-3 border-t border-slate-200 text-xs text-slate-600 mt-3">
                      <span>Created {formatDate(order.created_at)}</span>
                      <div className="flex gap-2 flex-wrap">
                        {order.status === 'in_progress' && (
                          <span className="text-blue-700 font-semibold bg-blue-50 px-2 py-1 rounded">📝 In Progress</span>
                        )}
                        {order.status === 'delivered' && (
                          <span className="text-cyan-700 font-semibold bg-cyan-50 px-2 py-1 rounded">📦 Review</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 md:py-16">
                <FaBox size={40} className="mx-auto mb-4 text-slate-300" />
                <p className="text-slate-600 mb-4 text-base md:text-lg font-medium">No orders {filterStatus !== 'all' ? `with status "${filterStatus}"` : 'yet'}</p>
                <Link
                  href="/orders/new"
                  className="inline-block px-5 md:px-6 py-2 md:py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition font-semibold text-sm md:text-base shadow-md hover:shadow-lg"
                >
                  Create Your First Order
                </Link>
              </div>
            )}
          </div>
        </section>
      </div>
    </ClientLayout>
  )
}
