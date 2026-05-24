'use client'

import React, { useState, useEffect, useRef } from 'react'
import { formatDate, formatTime } from '@/lib/utils/formatDate'
import { createClient } from '@/lib/supabase/client'
import { FaTicketAlt, FaPlus, FaTimes, FaPaperPlane, FaFile, FaTrash, FaUpload, FaSpinner } from 'react-icons/fa'

interface SupportTicket {
  id: string
  title: string
  description: string
  category: 'general' | 'billing' | 'account' | 'technical' | 'feedback'
  status: 'open' | 'in-progress' | 'resolved' | 'closed'
  priority: 'low' | 'normal' | 'high' | 'urgent'
  createdAt: string
  updatedAt: string
  resolvedAt?: string
  messageCount?: number
}

interface TicketMessage {
  id: string
  ticketId: string
  senderId: string
  senderName: string
  content: string
  isAdmin: boolean
  fileAttachments?: string[]
  createdAt: string
  parentMessageId?: string
  replyCount?: number
  replies?: TicketMessage[]
}

interface SupportTicketsProps {
  clientId: string
}

export default function SupportTickets({ clientId }: SupportTicketsProps) {
  const [tickets, setTickets] = useState<SupportTicket[]>([])
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null)
  const [messages, setMessages] = useState<TicketMessage[]>([])
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [user, setUser] = useState<any | null>(null)
  const [error, setError] = useState('')
  
  // Form states
  const [formTitle, setFormTitle] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formCategory, setFormCategory] = useState<'general' | 'billing' | 'account' | 'technical' | 'feedback'>('general')
  const [formPriority, setFormPriority] = useState<'low' | 'normal' | 'high' | 'urgent'>('normal')
  
  // Message states
  const [messageContent, setMessageContent] = useState('')
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [replyingTo, setReplyingTo] = useState<TicketMessage | null>(null)
  const [expandedThreads, setExpandedThreads] = useState<Set<string>>(new Set())
  
  const supabaseRef = useRef<any>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const channelRef = useRef<any | null>(null)
  
  if (!supabaseRef.current) supabaseRef.current = createClient()
  const supabase = supabaseRef.current

  useEffect(() => {
    async function checkUser() {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser()
        if (authUser) setUser(authUser)
      } catch (err) {
        console.error('Error checking user:', err)
      }
    }
    checkUser()
  }, [supabase])

  useEffect(() => {
    fetchTickets()
  }, [clientId, supabase])

  useEffect(() => {
    if (selectedTicket) {
      fetchMessages(selectedTicket.id)
      subscribeToMessages(selectedTicket.id)
    }
  }, [selectedTicket])

  async function fetchTickets() {
    try {
      const { data, error: err } = await supabase
        .from('support_tickets')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false })

      if (err) throw err
      
      // Count messages for each ticket
      const ticketsWithCounts = await Promise.all(
        (data || []).map(async (ticket: any) => {
          const { count } = await supabase
            .from('support_ticket_messages')
            .select('*', { count: 'exact', head: true })
            .eq('ticket_id', ticket.id)
          return { ...ticket, messageCount: count || 0 }
        })
      )
      
      setTickets(ticketsWithCounts)
    } catch (err) {
      console.error('Error fetching tickets:', err)
      setError('Failed to load support tickets')
    }
  }

  async function fetchMessages(ticketId: string) {
    try {
      const { data, error: err } = await supabase
        .from('support_ticket_messages')
        .select('*')
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true })

      if (err) throw err

      // Build thread hierarchy
      const messageMap = new Map<string, TicketMessage>()
      const rootMessages: TicketMessage[] = []

      data?.forEach((msg: any) => {
        const chatMsg: TicketMessage = {
          id: msg.id,
          ticketId: msg.ticket_id,
          senderId: msg.sender_id,
          senderName: msg.sender_name,
          content: msg.content,
          isAdmin: msg.is_admin,
          fileAttachments: msg.file_attachments || [],
          createdAt: msg.created_at,
          parentMessageId: msg.parent_message_id,
          replyCount: msg.reply_count || 0,
          replies: []
        }
        messageMap.set(msg.id, chatMsg)

        if (!msg.parent_message_id) {
          rootMessages.push(chatMsg)
        }
      })

      messageMap.forEach((msg) => {
        if (msg.parentMessageId && messageMap.has(msg.parentMessageId)) {
          const parent = messageMap.get(msg.parentMessageId)!
          if (!parent.replies) parent.replies = []
          parent.replies.push(msg)
        }
      })

      setMessages(rootMessages)
    } catch (err) {
      console.error('Error fetching messages:', err)
    }
  }

  function subscribeToMessages(ticketId: string) {
    if (channelRef.current) {
      channelRef.current.unsubscribe()
    }

    channelRef.current = supabase
      .channel(`support-ticket-${ticketId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'support_ticket_messages',
          filter: `ticket_id=eq.${ticketId}`
        },
        () => {
          fetchMessages(ticketId)
          fetchTickets()
        }
      )
      .subscribe()
  }

  async function createTicket(e: React.FormEvent) {
    e.preventDefault()
    if (!formTitle.trim() || !formDescription.trim()) {
      setError('Please fill in all required fields')
      return
    }

    setLoading(true)
    try {
      const { data, error: err } = await supabase
        .from('support_tickets')
        .insert([{
          client_id: clientId,
          title: formTitle,
          description: formDescription,
          category: formCategory,
          priority: formPriority,
          status: 'open'
        }])
        .select()

      if (err) throw err

      // Create initial message
      if (data && user) {
        await supabase.from('support_ticket_messages').insert([{
          ticket_id: data[0].id,
          sender_id: user.id,
          sender_name: user.email?.split('@')[0] || 'Client',
          content: formDescription,
          is_admin: false,
          read_status: 'unread'
        }])
      }

      setFormTitle('')
      setFormDescription('')
      setFormCategory('general')
      setFormPriority('normal')
      setShowCreateForm(false)
      setError('')
      fetchTickets()
    } catch (err: any) {
      console.error('Error creating ticket:', err)
      setError(err?.message || 'Failed to create support ticket')
    } finally {
      setLoading(false)
    }
  }

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedTicket || (!messageContent.trim() && selectedFiles.length === 0) || !user) {
      return
    }

    setLoading(true)
    try {
      let fileUrls: string[] = []

      if (selectedFiles.length > 0) {
        fileUrls = await Promise.all(
          selectedFiles.map(async (file) => {
            const timestamp = Date.now()
            const random = Math.random().toString(36).substring(2, 10)
            const fileName = `${timestamp}_${random}_${file.name}`
            const filePath = `support-tickets/${selectedTicket.id}/${fileName}`

            const { error: uploadError } = await supabase.storage
              .from('order-files')
              .upload(filePath, file)

            if (uploadError) throw new Error(`Failed to upload ${file.name}`)

            const { data } = supabase.storage
              .from('order-files')
              .getPublicUrl(filePath)

            return data?.publicUrl || filePath
          })
        )
      }

      const { error: err } = await supabase.from('support_ticket_messages').insert([{
        ticket_id: selectedTicket.id,
        sender_id: user.id,
        sender_name: user.email?.split('@')[0] || 'Client',
        content: messageContent.trim() || `Shared ${selectedFiles.length} file(s)`,
        is_admin: false,
        parent_message_id: replyingTo?.id || null,
        file_attachments: fileUrls.length > 0 ? fileUrls : [],
        read_status: 'unread'
      }])

      if (err) throw err

      setMessageContent('')
      setSelectedFiles([])
      setReplyingTo(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
      fetchMessages(selectedTicket.id)
    } catch (err: any) {
      console.error('Error sending message:', err)
      setError(err?.message || 'Failed to send message')
    } finally {
      setLoading(false)
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'text-red-600 bg-red-50'
      case 'high': return 'text-orange-600 bg-orange-50'
      case 'normal': return 'text-blue-600 bg-blue-50'
      case 'low': return 'text-green-600 bg-green-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-blue-100 text-blue-800'
      case 'in-progress': return 'bg-yellow-100 text-yellow-800'
      case 'resolved': return 'bg-green-100 text-green-800'
      case 'closed': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const toggleThread = (messageId: string) => {
    const newExpanded = new Set(expandedThreads)
    if (newExpanded.has(messageId)) {
      newExpanded.delete(messageId)
    } else {
      newExpanded.add(messageId)
    }
    setExpandedThreads(newExpanded)
  }

  const renderMessage = (msg: TicketMessage, isReply: boolean = false) => (
    <div key={msg.id} className={`mb-3 ${isReply ? 'ml-8' : ''}`}>
      <div
        className={`p-3 rounded-lg ${
          msg.senderId === user?.id
            ? 'bg-blue-100 text-blue-900'
            : 'bg-gray-100 text-gray-900'
        }`}
      >
        <div className="flex items-center justify-between gap-2 mb-1">
          <p className="text-xs font-semibold">
            {msg.senderName} {msg.isAdmin && <span className="text-purple-600">(Admin)</span>}
          </p>
          <p className="text-xs opacity-70">{formatTime(msg.createdAt)}</p>
        </div>
        <p className="text-sm break-words mb-2">{msg.content}</p>

        {msg.fileAttachments && msg.fileAttachments.length > 0 && (
          <div className="space-y-1 mt-2 pt-2 border-t border-current border-opacity-20">
            {msg.fileAttachments.map((fileUrl: string, idx: number) => {
              const fileName = fileUrl.split('/').pop()?.split('_').slice(2).join('_') || `file-${idx + 1}`
              return (
                <a
                  key={idx}
                  href={fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  download
                  className="flex items-center gap-2 text-xs hover:opacity-80"
                >
                  <FaFile size={12} /> {fileName}
                </a>
              )
            })}
          </div>
        )}

        {msg.replyCount! > 0 && (
          <button
            onClick={() => toggleThread(msg.id)}
            className="mt-2 text-xs underline hover:opacity-80"
          >
            {expandedThreads.has(msg.id) ? 'Hide' : 'Show'} {msg.replyCount} {msg.replyCount === 1 ? 'reply' : 'replies'}
          </button>
        )}
      </div>
      {msg.replies && msg.replies.length > 0 && expandedThreads.has(msg.id) && (
        <div className="ml-4 border-l-4 border-blue-200 pl-4 space-y-3 mt-3">
          {msg.replies.map((reply) => renderMessage(reply, true))}
        </div>
      )}
    </div>
  )

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-purple-700 text-white px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FaTicketAlt size={24} />
          <h2 className="text-2xl font-bold">Support Tickets</h2>
        </div>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="bg-white text-purple-600 px-4 py-2 rounded-lg hover:bg-purple-50 transition flex items-center gap-2 font-semibold"
        >
          <FaPlus size={16} /> New Ticket
        </button>
      </div>

      <div className="flex-1 flex gap-6 p-6 overflow-hidden">
        {/* Tickets List */}
        <div className="w-80 flex flex-col gap-4">
          <div className="flex-1 overflow-y-auto space-y-2">
            {tickets.map((ticket) => (
              <button
                key={ticket.id}
                onClick={() => setSelectedTicket(ticket)}
                className={`w-full text-left p-4 rounded-lg border-2 transition ${
                  selectedTicket?.id === ticket.id
                    ? 'border-purple-600 bg-purple-50'
                    : 'border-gray-200 bg-white hover:border-purple-300'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-semibold text-sm text-gray-900 line-clamp-2">{ticket.title}</h3>
                  <span className={`text-xs px-2 py-1 rounded whitespace-nowrap ${getStatusColor(ticket.status)}`}>
                    {ticket.status}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className={`px-2 py-0.5 rounded text-xs font-semibold ${getPriorityColor(ticket.priority)}`}>
                    {ticket.priority}
                  </span>
                  <span className="text-gray-500">{ticket.category}</span>
                </div>
                <p className="text-xs text-gray-500 mt-2">{formatDate(ticket.createdAt)}</p>
                {ticket.messageCount! > 1 && (
                  <p className="text-xs text-purple-600 font-semibold mt-1">{ticket.messageCount} messages</p>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Ticket Detail / Create Form */}
        <div className="flex-1 flex flex-col gap-4 overflow-hidden">
          {showCreateForm ? (
            <form onSubmit={createTicket} className="bg-white rounded-lg shadow-md p-6 space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-900">Create New Support Ticket</h3>
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <FaTimes size={20} />
                </button>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Title *</label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="Brief summary of your issue"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Description *</label>
                <textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Describe your issue in detail"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600 resize-none"
                  rows={4}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Category</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value as any)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600"
                  >
                    <option value="general">General</option>
                    <option value="billing">Billing</option>
                    <option value="account">Account</option>
                    <option value="technical">Technical</option>
                    <option value="feedback">Feedback</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Priority</label>
                  <select
                    value={formPriority}
                    onChange={(e) => setFormPriority(e.target.value as any)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600"
                  >
                    <option value="low">Low</option>
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}

              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="px-4 py-2 bg-gray-200 text-gray-900 rounded-lg hover:bg-gray-300 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition disabled:opacity-50"
                >
                  {loading ? <FaSpinner className="animate-spin" /> : 'Create Ticket'}
                </button>
              </div>
            </form>
          ) : selectedTicket ? (
            <div className="bg-white rounded-lg shadow-md overflow-hidden flex flex-col h-full">
              {/* Ticket Header */}
              <div className="bg-gray-50 border-b border-gray-200 p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-2">{selectedTicket.title}</h3>
                <div className="flex items-center gap-3 flex-wrap">
                  <span className={`text-xs px-3 py-1 rounded-full font-semibold ${getStatusColor(selectedTicket.status)}`}>
                    {selectedTicket.status}
                  </span>
                  <span className={`text-xs px-3 py-1 rounded-full font-semibold ${getPriorityColor(selectedTicket.priority)}`}>
                    {selectedTicket.priority} priority
                  </span>
                  <span className="text-xs text-gray-600 bg-gray-200 px-3 py-1 rounded-full">
                    {selectedTicket.category}
                  </span>
                  <span className="text-xs text-gray-500 ml-auto">
                    Created {formatDate(selectedTicket.createdAt)}
                  </span>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {messages.map((msg) => (
                  <div key={msg.id}>
                    {renderMessage(msg)}
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              {replyingTo && (
                <div className="px-6 py-2 bg-blue-50 border-t border-blue-200 flex items-center justify-between">
                  <div className="text-sm">
                    <p className="text-blue-700 font-semibold">Replying to {replyingTo.senderName}</p>
                    <p className="text-blue-600 text-xs truncate">{replyingTo.content}</p>
                  </div>
                  <button onClick={() => setReplyingTo(null)} className="text-blue-600 hover:text-red-600">
                    <FaTimes size={16} />
                  </button>
                </div>
              )}

              <form onSubmit={sendMessage} className="border-t border-gray-200 bg-white p-4 space-y-3">
                {selectedFiles.length > 0 && (
                  <div className="bg-blue-50 rounded p-2 space-y-2">
                    <p className="text-xs font-semibold text-blue-900">Files ({selectedFiles.length}):</p>
                    {selectedFiles.map((file, idx) => (
                      <div key={idx} className="flex items-center justify-between bg-white p-2 rounded text-xs">
                        <span className="text-gray-700">{file.name}</span>
                        <button
                          type="button"
                          onClick={() => setSelectedFiles(selectedFiles.filter((_, i) => i !== idx))}
                          className="text-red-600 hover:text-red-700"
                        >
                          <FaTrash size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex gap-3">
                  <textarea
                    value={messageContent}
                    onChange={(e) => setMessageContent(e.target.value)}
                    placeholder="Type your message..."
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-purple-600 text-sm"
                    rows={2}
                    disabled={loading}
                  />
                  <div className="flex flex-col gap-2">
                    <label
                      htmlFor="ticket-file-input"
                      className="bg-gray-600 text-white px-3 py-2 rounded-lg hover:bg-gray-700 transition cursor-pointer flex items-center justify-center h-10"
                    >
                      <FaUpload size={16} />
                    </label>
                    <input
                      id="ticket-file-input"
                      ref={fileInputRef}
                      type="file"
                      multiple
                      onChange={(e) => setSelectedFiles(Array.from(e.target.files || []))}
                      className="hidden"
                      disabled={loading}
                    />
                    <button
                      type="submit"
                      disabled={loading || (!messageContent.trim() && selectedFiles.length === 0)}
                      className="bg-purple-600 text-white px-3 py-2 rounded-lg hover:bg-purple-700 transition disabled:opacity-50 flex items-center justify-center h-10"
                    >
                      <FaPaperPlane size={16} />
                    </button>
                  </div>
                </div>
              </form>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-md flex items-center justify-center h-full text-gray-500">
              <div className="text-center">
                <FaTicketAlt size={48} className="mx-auto mb-4 opacity-50" />
                <p className="text-lg font-semibold">No ticket selected</p>
                <p className="text-sm">Select a ticket or create a new one</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
