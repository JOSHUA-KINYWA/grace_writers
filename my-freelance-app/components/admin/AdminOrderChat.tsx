'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { formatDate as _formatDate, formatTime as _formatTime } from '@/lib/utils/formatDate'
import { createClient } from '@/lib/supabase/client'
import { FaComments, FaCheckCircle, FaPaperPlane, FaFile } from 'react-icons/fa'

interface AdminOrderChatProps {
  orderId: string
  clientName?: string
}

export default function AdminOrderChat({ orderId, clientName = 'Client' }: AdminOrderChatProps) {
  interface Message {
    id: string
    order_id: string
    sender_id: string
    sender_name: string
    content: string
    is_admin: boolean
    read_status: string
    created_at: string
    updated_at: string
    file_attachments?: string[]
  }
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [replying, setReplying] = useState(false)
  const [replyText, setReplyText] = useState('')
  const [toastMessage, setToastMessage] = useState('')
  const [toastVisible, setToastVisible] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const supabaseRef = useRef<any>(null)
  if (!supabaseRef.current) supabaseRef.current = createClient()
  const supabase = supabaseRef.current

  const fetchMessages = useCallback(async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('order_messages')
        .select('*')
        .eq('order_id', orderId)
        .order('created_at', { ascending: true })

      if (error) throw error

      // Mark unread client messages as read
      const unreadMessages = data?.filter((m: Message) => !m.is_admin && m.read_status === 'unread') || []
      if (unreadMessages.length > 0) {
        const unreadIds = unreadMessages.map((m: Message) => m.id)
        await fetch('/api/mark-messages-read', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orderId,
            messageIds: unreadIds,
          }),
        }).catch(err => console.error('Error marking messages as read:', err))
        .finally(() => {
          try {
            window.dispatchEvent(new Event('messagesRead'))
          } catch {}
        })
      }

      setMessages(data || [])
    } catch (error) {
      console.error('Error fetching messages:', error)
    } finally {
      setLoading(false)
    }
  }, [orderId, supabase])

  useEffect(() => {
    fetchMessages()

    // Set up real-time subscription
    const channel = supabase
      .channel(`order-messages-${orderId}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'order_messages', filter: `order_id=eq.${orderId}` },
        () => {
          fetchMessages()
        }
      )
      .subscribe()

    return () => {
      try {
        if (channel && typeof (supabase.removeChannel) === 'function') supabase.removeChannel(channel)
      } catch {
        // ignore
      }
    }
  }, [orderId, supabase, fetchMessages])

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    }
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // fetchMessages implemented above (useCallback) — duplicate removed

  async function sendReply() {
    if (!replyText.trim()) return

    setReplying(true)
    try {
      const { error } = await (supabase as any)
        .from('order_messages')
        .insert([{
          order_id: orderId,
          sender_id: (await supabase.auth.getUser()).data.user?.id,
          sender_name: 'Admin',
          content: replyText,
          is_admin: true,
          read_status: 'unread',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as any])

      if (error) throw error

      setReplyText('')
      setToastMessage(`Message sent to ${clientName}.`)
      setToastVisible(true)
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
      toastTimerRef.current = setTimeout(() => setToastVisible(false), 5000)
      await fetchMessages()
    } catch (error: Error | unknown) {
      alert(`Error sending message: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setReplying(false)
    }
  }

  function scrollToBottom() {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  function formatTime(dateString: string) {
    return _formatTime(dateString)
  }

  function formatDate(dateString: string) {
    const date = new Date(dateString)
    const today = new Date()
    if (date.toDateString() === today.toDateString()) {
      return 'Today'
    }
    return _formatDate(date)
  }

  if (loading) {
    return <div className="text-center py-8 text-gray-600">Loading messages...</div>
  }

  return (
    <div className="flex flex-col h-[500px] bg-gray-50 rounded-lg overflow-hidden border border-gray-200">
      {/* Header */}
      <div className="bg-blue-50 border-b border-gray-200 px-6 py-4 relative">
        <h3 className="font-bold text-gray-900 flex items-center gap-2">
          <FaComments className="text-blue-600" />
          Messages with {clientName}
        </h3>
        <p className="text-sm text-gray-600 mt-1">
          {messages.length} message{messages.length !== 1 ? 's' : ''}
        </p>
      </div>
      {toastVisible && (
        <div className="fixed top-24 right-6 z-50 rounded-lg bg-blue-600 text-white px-4 py-3 shadow-lg">
          {toastMessage}
        </div>
      )}

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-white">
        {messages.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <FaComments className="text-4xl mx-auto mb-3 opacity-30" />
            <p>No messages yet</p>
          </div>
        ) : (
          <>
            {messages.map((message, index) => {
              const showDateDivider = index === 0 || 
                formatDate(messages[index - 1].created_at) !== formatDate(message.created_at)

              return (
                <div key={message.id}>
                  {showDateDivider && (
                    <div className="flex items-center justify-center my-4">
                      <div className="bg-gray-300 h-px flex-1"></div>
                      <span className="px-3 text-xs text-gray-500 font-medium">
                        {formatDate(message.created_at)}
                      </span>
                      <div className="bg-gray-300 h-px flex-1"></div>
                    </div>
                  )}
                  
                  <div className={`flex ${message.is_admin ? 'justify-end' : 'justify-start'} mb-3`}>
                    <div
                      className={`max-w-xs px-4 py-3 rounded-lg ${
                        message.is_admin
                          ? 'bg-blue-600 text-white rounded-br-none'
                          : 'bg-gray-200 text-gray-900 rounded-bl-none'
                      }`}
                    >
                      {!message.is_admin && (
                        <p className="text-xs font-bold mb-1 opacity-80">
                          {message.sender_name}
                        </p>
                      )}
                      <p className="text-sm break-words">{message.content}</p>
                      
                      {/* File Attachments */}
                      {message.file_attachments && message.file_attachments.length > 0 && (
                        <div className={`mt-2 pt-2 border-t border-current border-opacity-20 space-y-1`}>
                          {message.file_attachments.map((fileUrl: string, idx: number) => {
                            const fileName = fileUrl.split('/').pop()?.split('_').slice(2).join('_') || `file-${idx + 1}`
                            return (
                              <a
                                key={idx}
                                href={fileUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                download
                                className="flex items-center gap-2 text-xs hover:opacity-80 transition"
                              >
                                <FaFile size={12} /> {fileName}
                              </a>
                            )
                          })}
                        </div>
                      )}
                      
                      <div className={`flex items-center gap-2 mt-1 ${
                        message.is_admin ? 'text-blue-100' : 'text-gray-600'
                      } text-xs`}>
                        <span>{formatTime(message.created_at)}</span>
                        {message.is_admin && message.read_status === 'read' && (
                          <FaCheckCircle size={12} />
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input Area */}
      <div className="bg-gray-50 border-t border-gray-200 p-4">
        <div className="flex gap-3">
          <input
            type="text"
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                sendReply()
              }
            }}
            placeholder="Type your reply..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500"
            disabled={replying}
          />
          <button
            onClick={sendReply}
            disabled={replying || !replyText.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 font-semibold flex items-center gap-2"
          >
            <FaPaperPlane size={14} /> Send
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Press Enter to send, Shift+Enter for new line
        </p>
      </div>
    </div>
  )
}
