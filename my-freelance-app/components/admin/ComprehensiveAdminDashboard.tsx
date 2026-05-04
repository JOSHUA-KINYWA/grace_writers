'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { FaUsers, FaShoppingCart, FaDollarSign, FaBox, FaArrowRight } from 'react-icons/fa'

interface DashboardStats {
  totalClients: number
  totalOrders: number
  totalRevenue: number
  pendingOrders: number
}

export default function ComprehensiveAdminDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalClients: 0,
    totalOrders: 0,
    totalRevenue: 0,
    pendingOrders: 0,
  })
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      // Fetch total clients
      const { count: clientCount } = await supabase
        .from('clients')
        .select('*', { count: 'exact', head: true })

      // Fetch total orders
      const { count: orderCount } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })

      // Fetch pending orders
      const { count: pendingCount } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .neq('status', 'completed')

      // Calculate total revenue
      const { data: orders } = await supabase
        .from('orders')
        .select('quote_amount')

      const totalRevenue = orders?.reduce((sum, order) => sum + (order.quote_amount || 0), 0) || 0

      setStats({
        totalClients: clientCount || 0,
        totalOrders: orderCount || 0,
        totalRevenue: totalRevenue,
        pendingOrders: pendingCount || 0,
      })
    } catch (error) {
      console.error('Failed to fetch stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const StatCard = ({
    icon: Icon,
    label,
    value,
    color,
  }: {
    icon: React.ComponentType<{ size: number; className: string }>
    label: string
    value: string | number
    color: string
  }) => (
    <div className={`rounded-lg shadow-md p-6 bg-white border-l-4 ${color}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-600 text-sm font-semibold uppercase">{label}</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{value}</p>
        </div>
        <Icon size={40} className={`opacity-20 ${color.includes('blue') ? 'text-blue-600' : color.includes('green') ? 'text-green-600' : color.includes('purple') ? 'text-purple-600' : 'text-orange-600'}`} />
      </div>
    </div>
  )

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Dashboard Overview</h1>

      {loading ? (
        <div className="text-center py-12">
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      ) : (
        <>
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatCard
              icon={FaUsers}
              label="Total Clients"
              value={stats.totalClients}
              color="border-blue-500"
            />
            <StatCard
              icon={FaShoppingCart}
              label="Total Orders"
              value={stats.totalOrders}
              color="border-green-500"
            />
            <StatCard
              icon={FaDollarSign}
              label="Total Revenue"
              value={`$${stats.totalRevenue.toLocaleString()}`}
              color="border-purple-500"
            />
            <StatCard
              icon={FaBox}
              label="Pending Orders"
              value={stats.pendingOrders}
              color="border-orange-500"
            />
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Client Management Card */}
            <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition">
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-blue-50 rounded-lg">
                  <FaUsers className="text-2xl text-blue-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Client Management</h3>
                  <p className="text-sm text-gray-600">Manage all your clients, view details, and create accounts</p>
                </div>
              </div>
              <Link
                href="/admin/clients"
                className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-semibold mt-4"
              >
                Go to Clients <FaArrowRight size={14} />
              </Link>
            </div>

            {/* Order Management Card */}
            <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition">
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-green-50 rounded-lg">
                  <FaShoppingCart className="text-2xl text-green-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Order Management</h3>
                  <p className="text-sm text-gray-600">Track orders, manage status, and communicate with clients</p>
                </div>
              </div>
              <Link
                href="/admin/orders"
                className="flex items-center gap-2 text-green-600 hover:text-green-700 font-semibold mt-4"
              >
                Go to Orders <FaArrowRight size={14} />
              </Link>
            </div>

            {/* Messages Card */}
            <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition">
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-purple-50 rounded-lg">
                  <FaShoppingCart className="text-2xl text-purple-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Messages</h3>
                  <p className="text-sm text-gray-600">Direct messaging with clients and support</p>
                </div>
              </div>
              <Link
                href="/admin/messages"
                className="flex items-center gap-2 text-purple-600 hover:text-purple-700 font-semibold mt-4"
              >
                View Messages <FaArrowRight size={14} />
              </Link>
            </div>

            {/* Analytics Card */}
            <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition">
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-orange-50 rounded-lg">
                  <FaDollarSign className="text-2xl text-orange-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Analytics</h3>
                  <p className="text-sm text-gray-600">View detailed reports and analytics</p>
                </div>
              </div>
              <Link
                href="/admin/analytics"
                className="flex items-center gap-2 text-orange-600 hover:text-orange-700 font-semibold mt-4"
              >
                View Analytics <FaArrowRight size={14} />
              </Link>
            </div>

            {/* Referrals Card */}
            <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition">
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-indigo-50 rounded-lg">
                  <FaDollarSign className="text-2xl text-indigo-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Referrals</h3>
                  <p className="text-sm text-gray-600">Manage referral confirmations and reward settings</p>
                </div>
              </div>
              <Link
                href="/admin/referrals"
                className="flex items-center gap-2 text-indigo-600 hover:text-indigo-700 font-semibold mt-4"
              >
                Open Referral Panel <FaArrowRight size={14} />
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
