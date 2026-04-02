"use client"

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import ClientLayout from './ClientLayout'
import { FaCheckCircle, FaClock, FaHourglass, FaBox, FaFire, FaFilter, FaComments, FaUserCircle, FaArrowRight } from 'react-icons/fa'
import { formatDate } from '@/lib/utils/formatDate'

interface ClientDashboardProps {
  userId: string
  initialOrders?: any[]
  client?: any
}

export default function ClientDashboard({ userId, initialOrders = [], client }: ClientDashboardProps) {
  const [sortBy, setSortBy] = useState<'newest' | 'deadline' | 'status'>('newest')
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'pending' | 'completed' | 'revision'>('all')
  const [unreadCount, setUnreadCount] = useState(0)

  const orders = initialOrders || []

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
  }, [orders, filterStatus, sortBy])

  const stats = [
    { label: 'Active', count: orders?.filter((o: any) => o.status === 'in_progress').length || 0, icon: FaClock, color: 'blue', statusKey: 'active' },
    { label: 'Pending', count: orders?.filter((o: any) => o.status === 'pending' || o.status === 'quote_sent').length || 0, icon: FaHourglass, color: 'yellow', statusKey: 'pending' },
    { label: 'On Revision', count: orders?.filter((o: any) => o.status === 'revision').length || 0, icon: FaFire, color: 'orange', statusKey: 'revision' },
    { label: 'Completed', count: orders?.filter((o: any) => o.status === 'completed').length || 0, icon: FaCheckCircle, color: 'green', statusKey: 'completed' },
    { label: 'Total', count: orders?.length || 0, icon: FaBox, color: 'gray', statusKey: 'all' },
  ]

  const statColorClasses: Record<string, string> = {
    blue: 'bg-blue-50 border-blue-200 hover:bg-blue-100',
    yellow: 'bg-yellow-50 border-yellow-200 hover:bg-yellow-100',
    orange: 'bg-orange-50 border-orange-200 hover:bg-orange-100',
    green: 'bg-green-50 border-green-200 hover:bg-green-100',
    gray: 'bg-gray-50 border-gray-200 hover:bg-gray-100',
  }

  const renderStatCard = (stat: typeof stats[number], idx: number) => {
    const Icon = stat.icon

    return (
      <button
        key={idx}
        onClick={() => setFilterStatus(stat.statusKey as any)}
        className={`bg-white rounded-lg border ${statColorClasses[stat.color] || 'bg-gray-50 border-gray-200'} p-5 shadow-sm hover:shadow-md transition cursor-pointer text-left ${
          filterStatus === stat.statusKey ? 'ring-2 ring-purple-500' : ''
        }`}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">{stat.label}</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{stat.count}</p>
          </div>
          <Icon size={28} className="opacity-30" />
        </div>
      </button>
    )
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-300'
      case 'quote_sent': return 'bg-blue-100 text-blue-800 border-blue-300'
      case 'in_progress': return 'bg-purple-100 text-purple-800 border-purple-300'
      case 'revision': return 'bg-orange-100 text-orange-800 border-orange-300'
      case 'delivered': return 'bg-teal-100 text-teal-800 border-teal-300'
      case 'completed': return 'bg-green-100 text-green-800 border-green-300'
      default: return 'bg-gray-100 text-gray-800 border-gray-300'
    }
  }

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

  const isOverdue = (deadline: string) => {
    if (!deadline) return false
    return new Date(deadline) < new Date()
  }

  return (
    <ClientLayout clientName={client?.name || 'Client'}>
      <div className="grid grid-cols-1 xl:grid-cols-[280px_minmax(0,1fr)] gap-6">
        <aside className="space-y-6">
          <div className="sticky top-6 space-y-5">
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">Client Panel</p>
              <h2 className="mt-3 text-xl font-semibold text-gray-900">Quick actions</h2>
              <div className="mt-5 space-y-3">
                <Link href="/dashboard" className="flex items-center justify-between w-full rounded-xl border border-gray-200 px-4 py-3 text-sm font-medium text-gray-700 hover:border-purple-300 hover:bg-purple-50 transition">
                  <span>Dashboard</span>
                  <FaArrowRight className="text-gray-400" />
                </Link>
                <Link href="/dashboard/messages" className="flex items-center justify-between w-full rounded-xl border border-gray-200 px-4 py-3 text-sm font-medium text-gray-700 hover:border-purple-300 hover:bg-purple-50 transition">
                  <span className="flex items-center gap-2">
                    Messages
                    {unreadCount > 0 && (
                      <span className="inline-flex items-center justify-center rounded-full bg-red-600 px-2 py-0.5 text-[0.65rem] font-semibold text-white">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </span>
                  <FaComments className="text-gray-400" />
                </Link>
                <Link href="/dashboard/revisions" className="flex items-center justify-between w-full rounded-xl border border-gray-200 px-4 py-3 text-sm font-medium text-gray-700 hover:border-purple-300 hover:bg-purple-50 transition">
                  <span>Revisions</span>
                  <FaArrowRight className="text-gray-400" />
                </Link>
                <Link href="/orders/new" className="flex items-center justify-between w-full rounded-xl border border-gray-200 px-4 py-3 text-sm font-medium text-gray-700 hover:border-purple-300 hover:bg-purple-50 transition">
                  <span>Create order</span>
                  <FaArrowRight className="text-gray-400" />
                </Link>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-50 text-purple-700">
                  <FaUserCircle size={24} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">{client?.name || 'Client Name'}</p>
                  <p className="text-sm text-gray-500">{client?.email || 'No email available'}</p>
                </div>
              </div>
              <div className="mt-6 space-y-3 text-sm text-gray-600">
                <div className="rounded-xl bg-gray-50 p-3">
                  <p className="font-semibold text-gray-900">Orders total</p>
                  <p>{orders.length}</p>
                </div>
                <div className="rounded-xl bg-gray-50 p-3">
                  <p className="font-semibold text-gray-900">Pending</p>
                  <p>{stats.find((item) => item.statusKey === 'pending')?.count || 0}</p>
                </div>
                <div className="rounded-xl bg-gray-50 p-3">
                  <p className="font-semibold text-gray-900">In progress</p>
                  <p>{stats.find((item) => item.statusKey === 'active')?.count || 0}</p>
                </div>
              </div>
            </div>
          </div>
        </aside>

        <section className="space-y-6">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3 mb-8">
            {stats.map((stat, idx) => renderStatCard(stat, idx))}
          </div>

          {/* Projects Section */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-200">
              <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">Your Orders</h2>
            <Link
              href="/orders/new"
              className="px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:shadow-lg transition font-medium text-sm shadow-md"
            >
              + New Order
            </Link>
          </div>

          {/* Filter & Sort Bar */}
          <div className="flex flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <FaFilter size={14} className="text-gray-500" />
              <span className="text-xs font-semibold text-gray-600">FILTER:</span>
            </div>
            {(['all', 'active', 'pending', 'revision', 'completed'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-3 py-1 text-xs font-medium rounded-full transition ${
                  filterStatus === status
                    ? 'bg-purple-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            ))}

            <div className="flex-1" />

            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-gray-600">SORT:</span>
            </div>
            {(['newest', 'deadline', 'status'] as const).map((sort) => (
              <button
                key={sort}
                onClick={() => setSortBy(sort)}
                className={`px-3 py-1 text-xs font-medium rounded-full transition ${
                  sortBy === sort
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {sort.charAt(0).toUpperCase() + sort.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {filteredOrders && filteredOrders.length > 0 ? (
          <div className="grid gap-4 p-6">
            {filteredOrders.map((order: any) => (
              <div
                key={order.id}
                className="bg-gradient-to-br from-gray-50 to-white rounded-lg border border-gray-200 hover:border-purple-300 hover:shadow-lg transition p-5 group cursor-pointer"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-bold text-gray-900 group-hover:text-purple-700 transition">{order.title}</h3>
                      <span className={`px-3 py-1 text-xs font-semibold rounded-full border ${getStatusColor(order.status)}`}>
                        {order.status.replace('_', ' ').toUpperCase()}
                      </span>
                      {order.status === 'revision' && (
                        <span className="px-3 py-1 text-xs font-bold rounded-full bg-orange-100 text-orange-800 border border-orange-300 flex items-center gap-1">
                          🔄 REVISION NEEDED
                        </span>
                      )}
                      {isOverdue(order.deadline) && order.status !== 'completed' && (
                        <span className="px-3 py-1 text-xs font-bold rounded-full bg-red-100 text-red-800 border border-red-300 flex items-center gap-1">
                          ⚠️ OVERDUE
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-3">
                      {order.services?.title && (
                        <div>
                          <p className="text-xs font-semibold text-gray-600 uppercase">Service</p>
                          <p className="text-gray-900 font-medium">{order.services.title}</p>
                        </div>
                      )}
                      {order.deadline && (
                        <div>
                          <p className="text-xs font-semibold text-gray-600 uppercase">Deadline</p>
                          <p className={`font-medium ${isOverdue(order.deadline) && order.status !== 'completed' ? 'text-red-700' : 'text-gray-900'}`}>
                            {formatDate(order.deadline)}
                          </p>
                        </div>
                      )}
                      {order.quote_amount && (
                        <div>
                          <p className="text-xs font-semibold text-gray-600 uppercase">Budget</p>
                          <p className="text-gray-900 font-medium">${order.quote_amount.toLocaleString()}</p>
                        </div>
                      )}
                      {order.word_count && (
                        <div>
                          <p className="text-xs font-semibold text-gray-600 uppercase">Words</p>
                          <p className="text-gray-900 font-medium">{order.word_count.toLocaleString()}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <Link
                    href={`/dashboard/orders/${order.id}`}
                    className="ml-4 px-5 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition font-semibold text-sm whitespace-nowrap shadow-md hover:shadow-lg"
                  >
                    View Details →
                  </Link>
                </div>

                {/* Additional info row */}
                <div className="flex items-center justify-between pt-3 border-t border-gray-200 text-xs text-gray-600">
                  <span>Created {formatDate(order.created_at)}</span>
                  {order.status === 'in_progress' && (
                    <span className="text-blue-600 font-semibold">📝 In Progress</span>
                  )}
                  {order.status === 'delivered' && (
                    <span className="text-teal-600 font-semibold">📦 Ready for Review</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <FaBox size={48} className="mx-auto mb-4 text-gray-300" />
            <p className="text-gray-600 mb-4 text-lg">No orders {filterStatus !== 'all' ? `with status "${filterStatus}"` : 'yet'}</p>
            <Link
              href="/orders/new"
              className="inline-block px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition font-semibold shadow-md hover:shadow-lg"
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
