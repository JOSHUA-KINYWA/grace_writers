'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { FaArrowLeft, FaSync, FaClock, FaCheckCircle, FaSpinner } from 'react-icons/fa'
import { formatDate } from '@/lib/utils/formatDate'
import { createClient } from '@/lib/supabase/client'
import ClientLayout from '@/components/client/ClientLayout'

interface Revision {
  id: string
  order_id: string
  revision_number: number
  requested_reason: string
  status: 'pending' | 'in_progress' | 'completed'
  created_at: string
  orders?: {
    id: string
    title: string
    status: string
  }
}

export default function RevisionsPage() {
  const [revisions, setRevisions] = useState<Revision[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'in_progress' | 'completed'>('all')
  const supabase = createClient()

  const fetchRevisions = useCallback(async () => {
    try {
      setLoading(true)
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user?.email) return

      // Get client
      const { data: clientData } = await supabase
        .from('clients')
        .select('id')
        .eq('email', userData.user.email)
        .single()

      if (!clientData || !(clientData as any).id) return

      const clientId = (clientData as any).id

      // Get revisions for this client's orders
      const { data: orderData } = await supabase
        .from('orders')
        .select('id')
        .eq('client_id', clientId)

      const orderIds = (orderData as any)?.map((o: any) => o.id) || []

      if (orderIds.length === 0) {
        setRevisions([])
        return
      }

      const { data, error } = await supabase
        .from('revisions')
        .select(`
          *,
          orders!order_id(id, title, status)
        `)
        .in('order_id', orderIds)
        .order('created_at', { ascending: false })

      if (!error && data) {
        setRevisions((data as any) || [])
      }
    } catch (err) {
      console.error('Error fetching revisions:', err)
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    fetchRevisions()
  }, [fetchRevisions])

  const filteredRevisions = filterStatus === 'all' 
    ? revisions 
    : revisions.filter(r => r.status === filterStatus)

  const stats = [
    { label: 'Total', count: revisions.length, color: 'bg-gray-50 border-gray-200', icon: FaSync },
    { label: 'Pending', count: revisions.filter(r => r.status === 'pending').length, color: 'bg-yellow-50 border-yellow-200', icon: FaClock },
    { label: 'In Progress', count: revisions.filter(r => r.status === 'in_progress').length, color: 'bg-blue-50 border-blue-200', icon: FaSpinner },
    { label: 'Completed', count: revisions.filter(r => r.status === 'completed').length, color: 'bg-green-50 border-green-200', icon: FaCheckCircle },
  ]

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-300'
      case 'in_progress': return 'bg-blue-100 text-blue-800 border-blue-300'
      case 'completed': return 'bg-green-100 text-green-800 border-green-300'
      default: return 'bg-gray-100 text-gray-800 border-gray-300'
    }
  }

  return (
    <ClientLayout clientName="Client">
      <div className="max-w-6xl">
        <Link href="/dashboard" className="inline-flex items-center gap-2 text-purple-700 hover:text-purple-800 mb-6 font-semibold">
          <FaArrowLeft /> Back to Orders
        </Link>

        <h1 className="text-3xl font-bold text-gray-900 mb-6">Revision Requests</h1>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {stats.map((stat, idx) => {
            const Icon = stat.icon
            return (
              <button
                key={idx}
                onClick={() => {
                  if (idx === 0) setFilterStatus('all')
                  else if (idx === 1) setFilterStatus('pending')
                  else if (idx === 2) setFilterStatus('in_progress')
                  else setFilterStatus('completed')
                }}
                className={`${stat.color} rounded-lg border p-4 hover:shadow-md transition text-left hover:border-purple-300`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-gray-600 uppercase">{stat.label}</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{stat.count}</p>
                  </div>
                  <Icon size={28} className="opacity-30" />
                </div>
              </button>
            )
          })}
        </div>

        {/* Revisions List */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Your Revisions</h2>
            <div className="flex items-center gap-2">
              {(['all', 'pending', 'in_progress', 'completed'] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => setFilterStatus(status)}
                  className={`px-3 py-1 text-xs font-medium rounded-full transition ${
                    filterStatus === status
                      ? 'bg-purple-600 text-white shadow-md'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <FaSpinner size={32} className="text-purple-600 animate-spin" />
            </div>
          ) : filteredRevisions.length > 0 ? (
            <div className="divide-y divide-gray-100">
              {filteredRevisions.map((revision) => (
                <Link
                  key={revision.id}
                  href={`/dashboard/orders/${revision.order_id}`}
                  className="block hover:bg-gray-50 transition p-6 group"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900 group-hover:text-purple-700 transition">
                          Revision #{revision.revision_number}
                        </h3>
                        <span className={`px-3 py-1 text-xs font-semibold rounded-full border ${getStatusColor(revision.status)}`}>
                          {revision.status.replace('_', ' ').toUpperCase()}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">
                        <span className="font-medium">Order:</span> {revision.orders?.title || 'Unknown Order'}
                      </p>
                      <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg border border-gray-200">
                        <span className="font-medium">Request:</span> {revision.requested_reason}
                      </p>
                    </div>
                    <span className="ml-4 text-sm text-gray-500">
                      {formatDate(revision.created_at)}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <FaSync size={48} className="mx-auto mb-4 text-gray-300" />
              <p className="text-gray-600 mb-4 text-lg">No revision requests {filterStatus !== 'all' ? `with status "${filterStatus}"` : 'yet'}</p>
              <Link href="/dashboard" className="inline-block px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition font-semibold">
                Back to Orders
              </Link>
            </div>
          )}
        </div>
      </div>
    </ClientLayout>
  )
}
