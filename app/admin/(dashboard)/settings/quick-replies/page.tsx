'use client'

import React, { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { FaPlus, FaEdit, FaTrash, FaTimes, FaGlobeAmericas, FaLock, FaSpinner } from 'react-icons/fa'

interface QuickReply {
  id: string
  title: string
  content: string
  category: string
  is_global: boolean
  sort_order: number
  active: boolean
}

interface FormData {
  title: string
  content: string
  category: string
  is_global: boolean
  active: boolean
}

export default function QuickRepliesPage() {
  const [replies, setReplies] = useState<QuickReply[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [user, setUser] = useState<any>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [formData, setFormData] = useState<FormData>({
    title: '',
    content: '',
    category: 'general',
    is_global: false,
    active: true
  })

  const supabaseRef = useRef<any>(null)

  if (!supabaseRef.current) supabaseRef.current = createClient()
  const supabase = supabaseRef.current

  useEffect(() => {
    async function init() {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) return

      setUser(authUser)
      fetchReplies(authUser.id)
    }
    init()
  }, [supabase])

  async function fetchReplies(userId: string) {
    try {
      setLoading(true)
      const { data, error: err } = await supabase
        .from('quick_replies')
        .select('*')
        .or(`admin_id.eq.${userId},is_global.eq.true`)
        .order('sort_order')

      if (err) throw err
      setReplies(data || [])
    } catch (err: any) {
      console.error('Error fetching quick replies:', err)
      setError(err?.message || 'Failed to load quick replies')
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return

    if (!formData.title.trim() || !formData.content.trim()) {
      setError('Title and content are required')
      return
    }

    setSaving(true)
    setError('')
    setSuccess('')

    try {
      if (editingId) {
        const { error: err } = await supabase
          .from('quick_replies')
          .update(formData)
          .eq('id', editingId)

        if (err) throw err
        setSuccess('Quick reply updated successfully!')
      } else {
        const { error: err } = await supabase
          .from('quick_replies')
          .insert([{
            ...formData,
            admin_id: user.id,
            sort_order: replies.length
          }])

        if (err) throw err
        setSuccess('Quick reply created successfully!')
      }

      setFormData({
        title: '',
        content: '',
        category: 'general',
        is_global: false,
        active: true
      })
      setEditingId(null)
      setShowForm(false)
      fetchReplies(user.id)

      setTimeout(() => setSuccess(''), 3000)
    } catch (err: any) {
      console.error('Error saving quick reply:', err)
      setError(err?.message || 'Failed to save quick reply')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this quick reply?')) return

    try {
      const { error: err } = await supabase
        .from('quick_replies')
        .delete()
        .eq('id', id)

      if (err) throw err

      setSuccess('Quick reply deleted')
      fetchReplies(user.id)
      setTimeout(() => setSuccess(''), 3000)
    } catch (err: any) {
      console.error('Error deleting quick reply:', err)
      setError(err?.message || 'Failed to delete quick reply')
    }
  }

  function handleEdit(reply: QuickReply) {
    setFormData({
      title: reply.title,
      content: reply.content,
      category: reply.category,
      is_global: reply.is_global,
      active: reply.active
    })
    setEditingId(reply.id)
    setShowForm(true)
  }

  function handleCancel() {
    setFormData({
      title: '',
      content: '',
      category: 'general',
      is_global: false,
      active: true
    })
    setEditingId(null)
    setShowForm(false)
  }

  const categories = ['general', 'billing', 'account', 'technical', 'feedback']

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Quick Replies</h1>
          <p className="text-gray-600 mt-2">Manage your predefined message templates for faster responses</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition flex items-center gap-2 font-semibold"
        >
          <FaPlus /> New Quick Reply
        </button>
      </div>

      {/* Alerts */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
          {success}
        </div>
      )}

      {/* Form */}
      {showForm && (
        <div className="mb-8 bg-white rounded-lg shadow-md p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">
              {editingId ? 'Edit Quick Reply' : 'Create New Quick Reply'}
            </h2>
            <button
              onClick={handleCancel}
              className="text-gray-400 hover:text-gray-600 transition"
            >
              <FaTimes size={20} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Title *</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., Invoice Payment Info"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Content *</label>
              <textarea
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder="Type your response here... You can include detailed instructions, links, etc."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600 resize-vertical"
                rows={6}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Category</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600"
                >
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  <input
                    type="checkbox"
                    checked={formData.active}
                    onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                    className="mr-2"
                  />
                  Active
                </label>
              </div>
            </div>

            <div>
              <label className="flex items-center gap-2 cursor-pointer text-sm font-semibold text-gray-700">
                <input
                  type="checkbox"
                  checked={formData.is_global}
                  onChange={(e) => setFormData({ ...formData, is_global: e.target.checked })}
                />
                <span className="flex items-center gap-1">
                  {formData.is_global ? (
                    <>
                      <FaGlobeAmericas className="text-green-600" />
                      Share with all admins
                    </>
                  ) : (
                    <>
                      <FaLock className="text-gray-600" />
                      Only for me
                    </>
                  )}
                </span>
              </label>
            </div>

            <div className="flex gap-3 justify-end pt-4">
              <button
                type="button"
                onClick={handleCancel}
                className="px-6 py-2 bg-gray-200 text-gray-900 rounded-lg hover:bg-gray-300 transition font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition disabled:opacity-50 font-semibold flex items-center gap-2"
              >
                {saving ? <FaSpinner className="animate-spin" /> : null}
                {editingId ? 'Update' : 'Create'} Quick Reply
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Quick Replies List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <FaSpinner className="animate-spin text-purple-600 text-3xl" />
        </div>
      ) : replies.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <p className="text-gray-500 text-lg">No quick replies yet</p>
          <p className="text-gray-400 text-sm mt-2">Create one to speed up your responses</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {replies.map((reply) => (
            <div
              key={reply.id}
              className="bg-white rounded-lg shadow-md p-6 border border-gray-200 hover:shadow-lg transition"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-bold text-gray-900">{reply.title}</h3>
                    {reply.is_global && (
                      <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full font-semibold flex items-center gap-1">
                        <FaGlobeAmericas size={12} /> Global
                      </span>
                    )}
                    {!reply.active && (
                      <span className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded-full font-semibold">
                        Inactive
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded whitespace-pre-wrap mb-3">
                    {reply.content}
                  </p>
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <span className="bg-gray-100 px-2 py-1 rounded">{reply.category}</span>
                  </div>
                </div>
                <div className="flex gap-2 ml-4">
                  <button
                    onClick={() => handleEdit(reply)}
                    className="text-blue-600 hover:text-blue-700 p-2 hover:bg-blue-50 rounded-lg transition"
                    title="Edit"
                  >
                    <FaEdit size={18} />
                  </button>
                  <button
                    onClick={() => handleDelete(reply.id)}
                    className="text-red-600 hover:text-red-700 p-2 hover:bg-red-50 rounded-lg transition"
                    title="Delete"
                  >
                    <FaTrash size={18} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
