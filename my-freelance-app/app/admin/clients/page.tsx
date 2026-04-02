'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { FaUsers, FaPlus, FaSearch, FaEye, FaTrash, FaEnvelope, FaPhone, FaBuilding } from 'react-icons/fa'

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

export default function AdminClientsPage() {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', company: '' })
  const supabase = createClient()

  useEffect(() => {
    fetchClients()
  }, [])

  const fetchClients = async () => {
    setLoading(true)
    try {
      const { data, error: fetchError } = await supabase
        .from('clients')
        .select('*')
        .order('date_registered', { ascending: false })

      if (fetchError) throw fetchError
      setClients(data || [])
    } catch (err) {
      setError('Failed to fetch clients: ' + (err instanceof Error ? err.message : 'Unknown error'))
    } finally {
      setLoading(false)
    }
  }

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name || !formData.email) {
      setError('Name and Email are required')
      return
    }

    try {
      const { error: insertError } = await supabase
        .from('clients')
        .insert({
          name: formData.name,
          email: formData.email,
          phone: formData.phone || null,
          company: formData.company || null,
        })

      if (insertError) throw insertError

      setFormData({ name: '', email: '', phone: '', company: '' })
      setShowCreateForm(false)
      fetchClients()
    } catch (err) {
      setError('Failed to create client: ' + (err instanceof Error ? err.message : 'Unknown error'))
    }
  }

  const handleDeleteClient = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this client?')) {
      try {
        const { error: deleteError } = await supabase
          .from('clients')
          .delete()
          .eq('id', id)

        if (deleteError) throw deleteError
        fetchClients()
      } catch (err) {
        setError('Failed to delete client: ' + (err instanceof Error ? err.message : 'Unknown error'))
      }
    }
  }

  const filteredClients = clients.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <FaUsers className="text-3xl text-blue-600" />
              <h1 className="text-4xl font-bold text-gray-900">Client Management</h1>
            </div>
            <button
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              <FaPlus size={18} />
              Add New Client
            </button>
          </div>

          {/* Create Client Form */}
          {showCreateForm && (
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <h2 className="text-xl font-bold mb-4">Create New Client Account</h2>
              <form onSubmit={handleCreateClient} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  type="text"
                  placeholder="Full Name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
                <input
                  type="email"
                  placeholder="Email Address"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
                <input
                  type="tel"
                  placeholder="Phone Number"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <input
                  type="text"
                  placeholder="Company Name"
                  value={formData.company}
                  onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  type="submit"
                  className="md:col-span-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                >
                  Create Client
                </button>
              </form>
            </div>
          )}

          {/* Search Bar */}
          <div className="relative mb-6">
            <FaSearch className="absolute left-3 top-3 text-gray-400" />
            <input
              type="text"
              placeholder="Search clients by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-6">
              {error}
            </div>
          )}
        </div>

        {/* Clients Grid */}
        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-600">Loading clients...</p>
          </div>
        ) : filteredClients.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg">
            <p className="text-gray-600">No clients found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredClients.map((client) => (
              <div key={client.id} className="bg-white rounded-lg shadow-md hover:shadow-lg transition p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-2">{client.name}</h3>
                
                <div className="space-y-2 mb-4 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <FaEnvelope size={14} />
                    <span className="truncate">{client.email}</span>
                  </div>
                  {client.phone && (
                    <div className="flex items-center gap-2">
                      <FaPhone size={14} />
                      <span>{client.phone}</span>
                    </div>
                  )}
                  {client.company && (
                    <div className="flex items-center gap-2">
                      <FaBuilding size={14} />
                      <span>{client.company}</span>
                    </div>
                  )}
                </div>

                <div className="mb-4 grid grid-cols-2 gap-2 text-sm">
                  <div className="bg-blue-50 rounded p-2">
                    <p className="text-gray-600">Projects</p>
                    <p className="text-lg font-bold text-blue-600">{client.total_projects}</p>
                  </div>
                  <div className="bg-green-50 rounded p-2">
                    <p className="text-gray-600">Spent</p>
                    <p className="text-lg font-bold text-green-600">${client.total_spent?.toLocaleString() || 0}</p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Link
                    href={`/admin/clients/${client.id}`}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition text-sm"
                  >
                    <FaEye size={14} />
                    View Details
                  </Link>
                  <button
                    onClick={() => handleDeleteClient(client.id)}
                    className="px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition"
                  >
                    <FaTrash size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
