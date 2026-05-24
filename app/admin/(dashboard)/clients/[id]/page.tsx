'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { FaArrowLeft, FaEdit, FaEnvelope, FaPhone, FaBuilding, FaCalendar, FaDollarSign, FaShoppingCart, FaComment, FaPaperPlane, FaHistory } from 'react-icons/fa'

interface Client {
  id: string
  email: string
  name: string
  phone: string | null
  company: string | null
  whatsapp_number: string | null
  date_registered: string
  total_projects: number
  total_spent: number
  last_contacted: string | null
}

interface Order {
  id: string
  title: string
  status: string
  created_at: string
  description: string | null
  quote_amount: number | null
}

interface Message {
  id: string
  sender_id: string
  sender_name: string
  content: string
  is_admin: boolean
  created_at: string
}

export default function AdminClientDetailPage() {
  const params = useParams()
  const clientId = params.id as string
  const [client, setClient] = useState<Client | null>(null)
  const [orders, setOrders] = useState<Order[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [newMessage, setNewMessage] = useState('')
  const [activeTab, setActiveTab] = useState<'details' | 'orders' | 'messages'>('details')
  const [editMode, setEditMode] = useState(false)
  const [editData, setEditData] = useState<Partial<Client>>({})
  const supabase = createClient() as any

  useEffect(() => {
    fetchClientDetails()
    fetchOrders()
    fetchMessages()
  }, [clientId])

  const fetchClientDetails = async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('clients')
        .select('*')
        .eq('id', clientId)
        .single()

      if (fetchError) throw fetchError
      setClient(data)
      setEditData(data)
    } catch (err) {
      setError('Failed to fetch client: ' + (err instanceof Error ? err.message : 'Unknown error'))
    } finally {
      setLoading(false)
    }
  }

  const fetchOrders = async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('orders')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false })

      if (fetchError) throw fetchError
      setOrders(data || [])
    } catch (err) {
      console.error('Failed to fetch orders:', err)
    }
  }

  const fetchMessages = async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('direct_messages')
        .select('*')
        .or(`sender_id.eq.${clientId},recipient_id.eq.${clientId}`)
        .order('created_at', { ascending: true })

      if (fetchError) throw fetchError
      setMessages(data || [])
    } catch (err) {
      console.error('Failed to fetch messages:', err)
      setError('Failed to load messages: ' + (err instanceof Error ? err.message : 'Unknown error'))
    }
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim()) return

    try {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) throw new Error('Not authenticated')

      const { error: insertError } = await supabase
        .from('direct_messages' as any)
        .insert({
          sender_id: userData.user.id,
          sender_name: editData.name || 'Admin',
          recipient_id: clientId,
          content: newMessage,
          is_admin: true,
          read_at: null,
        } as any)

      if (insertError) throw insertError
      setNewMessage('')
      fetchMessages()
    } catch (err) {
      setError('Failed to send message: ' + (err instanceof Error ? err.message : 'Unknown error'))
    }
  }

  const handleSaveClient = async () => {
    try {
      const { error: updateError } = await supabase
        .from('clients')
        .update(editData)
        .eq('id', clientId)

      if (updateError) throw updateError
      setEditMode(false)
      fetchClientDetails()
    } catch (err) {
      setError('Failed to save client: ' + (err instanceof Error ? err.message : 'Unknown error'))
    }
  }

  if (loading) {
    return <div className="min-h-screen bg-gray-100 flex items-center justify-center">Loading...</div>
  }

  if (!client) {
    return <div className="min-h-screen bg-gray-100 flex items-center justify-center">Client not found</div>
  }

  const statusColors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    quote_sent: 'bg-blue-100 text-blue-800',
    in_progress: 'bg-purple-100 text-purple-800',
    revision: 'bg-orange-100 text-orange-800',
    completed: 'bg-green-100 text-green-800',
    delivered: 'bg-teal-100 text-teal-800',
  }

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Link href="/admin/clients" className="flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-4">
            <FaArrowLeft /> Back to Clients
          </Link>

          <div className="bg-white rounded-lg shadow-md p-6 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{client.name}</h1>
              <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <FaEnvelope /> {client.email}
                </div>
                {client.phone && (
                  <div className="flex items-center gap-2">
                    <FaPhone /> {client.phone}
                  </div>
                )}
                {client.company && (
                  <div className="flex items-center gap-2">
                    <FaBuilding /> {client.company}
                  </div>
                )}
              </div>
            </div>
            <button
              onClick={() => setEditMode(!editMode)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              <FaEdit /> Edit
            </button>
          </div>

          {/* Edit Mode */}
          {editMode && (
            <div className="bg-white rounded-lg shadow-md p-6 mt-4">
              <h2 className="text-xl font-bold mb-4">Edit Client Details</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <input
                  type="text"
                  placeholder="Name"
                  value={editData.name || ''}
                  onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <input
                  type="email"
                  placeholder="Email"
                  value={editData.email || ''}
                  onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <input
                  type="tel"
                  placeholder="Phone"
                  value={editData.phone || ''}
                  onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <input
                  type="text"
                  placeholder="Company"
                  value={editData.company || ''}
                  onChange={(e) => setEditData({ ...editData, company: e.target.value })}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleSaveClient}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                >
                  Save Changes
                </button>
                <button
                  onClick={() => setEditMode(false)}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-md mb-6">
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setActiveTab('details')}
              className={`flex-1 py-4 px-6 text-center font-semibold transition ${
                activeTab === 'details' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Client Details
            </button>
            <button
              onClick={() => setActiveTab('orders')}
              className={`flex-1 py-4 px-6 text-center font-semibold transition ${
                activeTab === 'orders' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Order History ({orders.length})
            </button>
            <button
              onClick={() => setActiveTab('messages')}
              className={`flex-1 py-4 px-6 text-center font-semibold transition ${
                activeTab === 'messages' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Messages
            </button>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {/* Details Tab */}
            {activeTab === 'details' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2 text-blue-600">
                    <FaShoppingCart /> Total Projects
                  </div>
                  <p className="text-3xl font-bold text-gray-900">{client.total_projects}</p>
                </div>
                <div className="bg-green-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2 text-green-600">
                    <FaDollarSign /> Total Spent
                  </div>
                  <p className="text-3xl font-bold text-gray-900">${client.total_spent?.toLocaleString() || 0}</p>
                </div>
                <div className="bg-purple-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2 text-purple-600">
                    <FaCalendar /> Date Registered
                  </div>
                  <p className="text-lg font-bold text-gray-900">{new Date(client.date_registered).toLocaleDateString()}</p>
                </div>
                <div className="bg-orange-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2 text-orange-600">
                    <FaHistory /> Last Contacted
                  </div>
                  <p className="text-lg font-bold text-gray-900">
                    {client.last_contacted ? new Date(client.last_contacted).toLocaleDateString() : 'Never'}
                  </p>
                </div>
              </div>
            )}

            {/* Orders Tab */}
            {activeTab === 'orders' && (
              <div className="space-y-4">
                {orders.length === 0 ? (
                  <p className="text-gray-600 text-center py-8">No orders yet</p>
                ) : (
                  orders.map((order) => (
                    <div key={order.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="text-lg font-bold text-gray-900">{order.title}</h3>
                          {order.description && <p className="text-sm text-gray-600">{order.description}</p>}
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusColors[order.status] || 'bg-gray-100'}`}>
                          {order.status?.replace('_', ' ').toUpperCase()}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-sm text-gray-600 mt-2">
                        <div>
                          <p className="font-semibold text-gray-900">Created</p>
                          <p>{new Date(order.created_at).toLocaleDateString()}</p>
                        </div>
                        {order.quote_amount && (
                          <div>
                            <p className="font-semibold text-gray-900">Amount</p>
                            <p>${order.quote_amount.toLocaleString()}</p>
                          </div>
                        )}
                        <Link href={`/admin/orders/${order.id}`} className="text-blue-600 hover:text-blue-700 font-semibold">
                          View Details →
                        </Link>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Messages Tab */}
            {activeTab === 'messages' && (
              <div className="flex flex-col gap-4 h-96">
                <div className="flex-1 overflow-y-auto bg-gray-50 rounded-lg p-4 mb-4">
                  {messages.length === 0 ? (
                    <p className="text-gray-600 text-center py-8">No messages yet</p>
                  ) : (
                    messages.map((msg) => (
                      <div key={msg.id} className={`mb-3 ${msg.is_admin ? 'flex justify-end' : 'flex justify-start'}`}>
                        <div className={`max-w-xs p-3 rounded-lg ${msg.is_admin ? 'bg-blue-600 text-white' : 'bg-white text-gray-900 border border-gray-200'}`}>
                          <p className="text-sm">{msg.content}</p>
                          <p className="text-xs mt-1 opacity-70">{new Date(msg.created_at).toLocaleTimeString()}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                <form onSubmit={handleSendMessage} className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Type your message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
                  >
                    <FaPaperPlane size={14} /> Send
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}
      </div>
    </div>
  )
}
