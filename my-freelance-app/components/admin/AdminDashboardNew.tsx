'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { FaBox, FaSpinner, FaBars, FaTimes } from 'react-icons/fa'
import { formatDate } from '@/lib/utils/formatDate'

export default function AdminDashboardNew() {
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [filter, setFilter] = useState<string>('all')
  const supabaseRef = useRef<any>(null)
  if (!supabaseRef.current) supabaseRef.current = createClient()
  const supabase = supabaseRef.current

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true)
      let query = supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false })

      if (filter !== 'all') {
        query = query.eq('status', filter)
      }

      const { data, error } = await query

      if (!error && data) {
        setOrders(data)
      }
    } catch (err) {
      console.error('Error fetching orders:', err)
    } finally {
      setLoading(false)
    }
  }, [filter, supabase])

  useEffect(() => {
    fetchOrders()
  }, [fetchOrders])

  const stats = {
    inProgress: orders.filter(o => o.status === 'in_progress').length,
    onRevision: orders.filter(o => o.status === 'revision').length,
    pending: orders.filter(o => o.status === 'pending' || o.status === 'quote_sent').length,
    delivered: orders.filter(o => o.status === 'delivered').length,
    completed: orders.filter(o => o.status === 'completed').length,
    total: orders.length,
  }

  const menuItems = [
    { label: 'In Progress', count: stats.inProgress, status: 'in_progress', icon: '⚙️' },
    { label: 'On Revision', count: stats.onRevision, status: 'revision', icon: '🔄' },
    { label: 'Pending Clarification', count: stats.pending, status: 'pending', icon: '⏳' },
    { label: 'Delivered', count: stats.delivered, status: 'delivered', icon: '📦' },
    { label: 'Completed', count: stats.completed, status: 'completed', icon: '✓' },
    { label: 'Available Orders', count: stats.total, status: 'all', icon: '📋', highlight: true },
  ]

  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'w-64' : 'w-0'} bg-white shadow-lg transition-all duration-300 overflow-hidden`}>
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-purple-600 mb-1">Admin</h2>
          <p className="text-xs text-gray-500">Management Dashboard</p>
        </div>

        <nav className="p-4 space-y-2">
          {menuItems.map((item) => (
            <button
              key={item.status}
              onClick={() => setFilter(item.status)}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition ${
                filter === item.status
                  ? 'bg-purple-100 text-purple-700 font-semibold'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <span className="flex items-center gap-3">
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </span>
              <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                item.highlight
                  ? 'bg-yellow-400 text-gray-900'
                  : 'bg-gray-300 text-gray-700'
              }`}>
                {item.count}
              </span>
            </button>
          ))}

          <div className="mt-6 mb-2">
            <h3 className="text-xs font-bold text-gray-500 uppercase px-4 mb-3">Actions</h3>
          </div>

          <Link
            href="/admin/messages"
            className="flex items-center justify-between px-4 py-3 text-gray-700 hover:bg-red-50 rounded-lg transition"
          >
            <span className="flex items-center gap-3">
              <span>📨</span>
              <span>New Messages</span>
            </span>
            <span className="text-xs font-bold px-2 py-1 rounded-full bg-red-500 text-white">!</span>
          </Link>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <div className="bg-white shadow-sm border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 hover:bg-gray-100 rounded-lg md:hidden"
            >
              {sidebarOpen ? <FaTimes size={20} /> : <FaBars size={20} />}
            </button>
            <h1 className="text-2xl font-bold text-gray-900">Orders Dashboard</h1>
          </div>
          <Link href="/admin/orders" className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm font-semibold">
            View Full Orders
          </Link>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center h-96">
              <FaSpinner className="animate-spin text-purple-600 text-4xl" />
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              {/* Table Header */}
              <div className="grid grid-cols-6 gap-4 px-6 py-4 bg-gray-50 border-b border-gray-200 font-semibold text-sm text-gray-900">
                <div>Order ID</div>
                <div>Title</div>
                <div>Status</div>
                <div>Deadline</div>
                <div>Price</div>
                <div>Action</div>
              </div>

              {/* Table Rows */}
              <div className="divide-y divide-gray-200">
                {orders.length > 0 ? (
                  orders.slice(0, 20).map((order) => (
                    <div key={order.id} className="grid grid-cols-6 gap-4 px-6 py-4 items-center hover:bg-gray-50 transition text-sm">
                      <div className="font-mono text-gray-600 font-semibold">{order.id.slice(0, 8)}</div>
                      <div className="font-medium text-gray-900 truncate">{order.title}</div>
                      <div>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                          order.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                          order.status === 'revision' ? 'bg-orange-100 text-orange-800' :
                          order.status === 'pending' || order.status === 'quote_sent' ? 'bg-yellow-100 text-yellow-800' :
                          order.status === 'delivered' ? 'bg-green-100 text-green-800' :
                          order.status === 'completed' ? 'bg-green-200 text-green-900' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {order.status.replace('_', ' ')}
                        </span>
                      </div>
                      <div className="text-gray-600">
                        {order.deadline ? formatDate(order.deadline) : '—'}
                      </div>
                      <div className="font-semibold text-gray-900">
                        ${order.quote_amount || 0}
                      </div>
                      <div>
                        <Link
                          href={`/admin/orders/${order.id}`}
                          className="text-purple-600 hover:text-purple-800 font-semibold text-sm"
                        >
                          View →
                        </Link>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="col-span-6 text-center py-12 text-gray-500">
                    <FaBox size={32} className="mx-auto mb-3 opacity-30" />
                    <p>No orders found in this category</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
