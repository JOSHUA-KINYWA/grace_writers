'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { formatDateTime } from '@/lib/utils/formatDate'
import { FaEdit, FaEye, FaDownload, FaUpload, FaTimes, FaComments, FaBell } from 'react-icons/fa'
import { showAppToast } from '@/lib/app-toast'

interface OrdersListProps {
  initialOrders: any[]
  services: any[]
}

export default function OrdersList({ initialOrders, services }: OrdersListProps) {
  const [orders, setOrders] = useState(initialOrders)
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [selectedOrder, setSelectedOrder] = useState<any>(null)
  const [showModal, setShowModal] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [unreadMessages, setUnreadMessages] = useState<{ [orderId: string]: number }>({})
  const supabase = createClient()

  // Fetch unread message counts on mount and set up real-time subscription
  useEffect(() => {
    fetchUnreadCounts()
    
    const channel = supabase
      .channel('order-messages-updates')
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'order_messages', filter: 'is_admin=eq.false' },
        () => {
          fetchUnreadCounts()
        }
      )
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'order_messages' },
        () => {
          fetchUnreadCounts()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  async function fetchUnreadCounts() {
    try {
      const { data, error } = await supabase
        .from('order_messages')
        .select('order_id')
        .eq('is_admin', false)
        .eq('read_status', 'unread')

      if (!error && data) {
        const counts: { [orderId: string]: number } = {}
        data.forEach((msg: any) => {
          counts[msg.order_id] = (counts[msg.order_id] || 0) + 1
        })
        setUnreadMessages(counts)
      }
    } catch (error) {
      console.error('Error fetching unread counts:', error)
    }
  }

  const filteredOrders = filterStatus === 'all' 
    ? orders 
    : orders.filter((o: any) => o.status === filterStatus)

  async function patchOrderViaApi(orderId: string, updates: Record<string, unknown>) {
    const res = await fetch('/api/admin/orders/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId, ...updates }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      throw new Error(data.error || 'Failed to update order')
    }
    return data
  }

  async function updateOrderStatus(orderId: string, newStatus: string) {
    setUpdating(true)
    try {
      await patchOrderViaApi(orderId, { status: newStatus })

      setOrders(orders.map((o: any) =>
        o.id === orderId ? { ...o, status: newStatus } : o
      ))
      setShowModal(false)
      showAppToast('Order updated successfully', 'success')
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Update failed'
      showAppToast(`Error: ${message}`, 'error')
    } finally {
      setUpdating(false)
    }
  }

  async function updatePaymentStatus(orderId: string, paidAmount: number) {
    setUpdating(true)
    try {
      const order = orders.find((o: any) => o.id === orderId)
      const paymentStatus =
        paidAmount >= (order?.quote_amount || 0)
          ? 'paid'
          : paidAmount > 0
            ? 'partial'
            : 'unpaid'

      await patchOrderViaApi(orderId, {
        paid_amount: paidAmount,
        payment_status: paymentStatus,
      })

      setOrders(orders.map((o: any) =>
        o.id === orderId ? { ...o, paid_amount: paidAmount, payment_status: paymentStatus } : o
      ))
      setShowModal(false)
      showAppToast('Order updated successfully', 'success')
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Update failed'
      showAppToast(`Error: ${message}`, 'error')
    } finally {
      setUpdating(false)
    }
  }

  function getStatusColor(status: string) {
    const colors: any = {
      pending: 'bg-yellow-100 text-yellow-800',
      quote_sent: 'bg-blue-100 text-blue-800',
      in_progress: 'bg-purple-100 text-purple-800',
      revision: 'bg-orange-100 text-orange-800',
      delivered: 'bg-teal-100 text-teal-800',
      completed: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
    }
    return colors[status] || 'bg-gray-100 text-gray-800'
  }

  // use shared formatter

  return (
    <>
      {/* Filter */}
      <div className="mb-6 flex gap-2 flex-wrap">
        <button
          onClick={() => setFilterStatus('all')}
          className={`px-4 py-2 rounded-lg font-semibold transition ${
            filterStatus === 'all' 
              ? 'bg-purple-600 text-white' 
              : 'bg-white text-gray-700 hover:bg-gray-50'
          }`}
        >
          All ({orders.length})
        </button>
        {['pending', 'quote_sent', 'in_progress', 'revision', 'delivered', 'completed', 'cancelled'].map((status) => (
          <button
            key={status}
            onClick={() => setFilterStatus(status)}
            className={`px-4 py-2 rounded-lg font-semibold transition capitalize ${
              filterStatus === status
                ? 'bg-purple-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            {status.replace('_', ' ')} ({orders.filter((o: any) => o.status === status).length})
          </button>
        ))}
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Client</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Service</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Payment</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Messages</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Deadline</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredOrders.length > 0 ? (
                filteredOrders.map((order: any) => (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{order.title}</div>
                      <div className="text-sm text-gray-500">{formatDateTime(order.created_at)}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">
                        {order.clients?.name || 'N/A'}
                      </div>
                      <div className="text-sm text-gray-500">{order.clients?.email}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {order.services?.title || 'Custom Order'}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs rounded-full font-semibold ${getStatusColor(order.status)}`}>
                        {order.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {order.quote_amount ? (
                        <div>
                          <div className="font-medium">
                            ${order.paid_amount || 0} / ${order.quote_amount}
                          </div>
                          <div className={`text-xs ${order.payment_status === 'paid' ? 'text-green-600' : 'text-yellow-600'}`}>
                            {order.payment_status}
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-400">No quote</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <FaComments className="text-blue-600" />
                        {unreadMessages[order.id] && unreadMessages[order.id] > 0 ? (
                          <span className="bg-red-500 text-white text-xs font-bold rounded-full px-2 py-1 flex items-center gap-1">
                            <FaBell size={12} />
                            {unreadMessages[order.id]}
                          </span>
                        ) : (
                          <span className="text-gray-400 text-xs">No messages</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {order.deadline ? formatDateTime(order.deadline) : '-'}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <Link
                        href={`/admin/orders/${order.id}`}
                        className="text-purple-600 hover:text-purple-700 font-semibold flex items-center gap-1"
                      >
                        <FaEdit /> Manage
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-gray-600">
                    No orders found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Order Management Modal */}
      {showModal && selectedOrder && (
        <OrderModal
          order={selectedOrder}
          services={services}
          onClose={() => {
            setShowModal(false)
            setSelectedOrder(null)
          }}
          onUpdate={async (updates: Record<string, unknown>) => {
            setUpdating(true)
            try {
              await patchOrderViaApi(selectedOrder.id, updates)

              setOrders(orders.map((o: any) =>
                o.id === selectedOrder.id ? { ...o, ...updates } : o
              ))
              setShowModal(false)
              showAppToast('Order updated successfully', 'success')
            } catch (error: unknown) {
              const message = error instanceof Error ? error.message : 'Update failed'
              showAppToast(`Error: ${message}`, 'error')
            } finally {
              setUpdating(false)
            }
          }}
          updating={updating}
        />
      )}
    </>
  )
}

function OrderModal({ order, services, onClose, onUpdate, updating }: any) {
  const [status, setStatus] = useState(order.status)
  const [quoteAmount, setQuoteAmount] = useState(order.quote_amount || '')
  const [paidAmount, setPaidAmount] = useState(order.paid_amount || '')
  const [adminNotes, setAdminNotes] = useState(order.admin_notes || '')
  const [clientNotes, setClientNotes] = useState(order.client_notes || '')
  const [deliverableLink, setDeliverableLink] = useState('')

  function handleSave() {
    const updates: any = {
      status,
      admin_notes: adminNotes,
      client_notes: clientNotes,
    }

    if (quoteAmount) {
      updates.quote_amount = parseFloat(quoteAmount)
    }

    if (paidAmount !== '') {
      updates.paid_amount = parseFloat(paidAmount)
      updates.payment_status = parseFloat(paidAmount) >= (parseFloat(quoteAmount) || 0) ? 'paid' :
                              parseFloat(paidAmount) > 0 ? 'partial' : 'unpaid'
    }

    if (deliverableLink) {
      updates.deliverables = [...(order.deliverables || []), deliverableLink]
    }

    onUpdate(updates)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-900">Manage Order: {order.title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <FaTimes size={24} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Order Details */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Order Details</h3>
            <div className="bg-gray-50 p-4 rounded-lg space-y-2 text-sm">
              <div><strong>Client:</strong> {order.clients?.name} ({order.clients?.email})</div>
              <div><strong>Service:</strong> {order.services?.title || 'Custom Order'}</div>
              <div><strong>Description:</strong> {order.description}</div>
              {order.requirements && (
                <div><strong>Requirements:</strong> {order.requirements}</div>
              )}
              {order.word_count && (
                <div><strong>Word Count:</strong> {order.word_count.toLocaleString()}</div>
              )}
              {order.deadline && (
                <div><strong>Deadline:</strong> {new Date(order.deadline).toLocaleString()}</div>
              )}
            </div>
          </div>

          {/* Status Update */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-gray-900"
            >
              <option value="pending">Pending</option>
              <option value="quote_sent">Quote Sent</option>
              <option value="in_progress">In Progress</option>
              <option value="revision">Revision</option>
              <option value="delivered">Delivered</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          {/* Pricing */}
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Quote Amount ($)</label>
              <input
                type="number"
                value={quoteAmount}
                onChange={(e) => setQuoteAmount(e.target.value)}
                placeholder="0.00"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-gray-900"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Paid Amount ($)</label>
              <input
                type="number"
                value={paidAmount}
                onChange={(e) => setPaidAmount(e.target.value)}
                placeholder="0.00"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-gray-900"
              />
            </div>
          </div>

          {/* Files Uploaded by Client */}
          {order.files_uploaded && order.files_uploaded.length > 0 && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Files Uploaded by Client</label>
              <div className="space-y-2">
                {order.files_uploaded.map((url: string, index: number) => (
                  <a
                    key={index}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-purple-600 hover:text-purple-700 text-sm flex items-center gap-2"
                  >
                    <FaDownload /> File {index + 1}
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Deliverables */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Add Deliverable Link</label>
            <input
              type="text"
              value={deliverableLink}
              onChange={(e) => setDeliverableLink(e.target.value)}
              placeholder="https://drive.google.com/..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-gray-900"
            />
            {order.deliverables && order.deliverables.length > 0 && (
              <div className="mt-2 space-y-1">
                <div className="text-sm font-medium text-gray-700">Existing Deliverables:</div>
                {order.deliverables.map((url: string, index: number) => (
                  <a
                    key={index}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-purple-600 hover:text-purple-700 text-sm"
                  >
                    Deliverable {index + 1}
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Admin Notes (Internal)</label>
              <textarea
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                rows={4}
                placeholder="Internal notes only visible to you..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-gray-900"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Client Notes (Visible to Client)</label>
              <textarea
                value={clientNotes}
                onChange={(e) => setClientNotes(e.target.value)}
                rows={4}
                placeholder="Notes visible to the client..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-gray-900"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-4 pt-4 border-t">
            <button
              onClick={handleSave}
              disabled={updating}
              className="flex-1 bg-purple-600 text-white py-3 rounded-lg font-semibold hover:bg-purple-700 transition disabled:opacity-50"
            >
              {updating ? 'Saving...' : 'Save Changes'}
            </button>
            <button
              onClick={onClose}
              className="px-6 py-3 border border-gray-300 rounded-lg font-semibold hover:bg-gray-50 transition"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
