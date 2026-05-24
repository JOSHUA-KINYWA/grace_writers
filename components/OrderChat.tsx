'use client'

import { useState, useEffect, useRef } from 'react'
import { formatTime } from '@/lib/utils/formatDate'
import { scrollContainerToBottom, scrollContainerToElement } from '@/lib/utils/scroll-container'
import { createClient } from '@/lib/supabase/client'
import { FaPaperPlane, FaUser, FaFile, FaTrash, FaUpload } from 'react-icons/fa'

interface ChatMessage {
  id: string
  content: string
  user: {
    name: string
    id: string
  }
  createdAt: string
  isRead?: boolean
  fileAttachments?: string[]
}

interface OrderChatProps {
  orderId: string
  clientId?: string
  isAdmin?: boolean
  selectedMessageId?: string
}

interface UserPresence {
  isOnline: boolean
  lastSeen?: string
}

export default function OrderChat({ orderId, isAdmin = false, selectedMessageId }: OrderChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputMessage, setInputMessage] = useState('')
  const [user, setUser] = useState<any | null>(null)
  const [otherUserOnline, setOtherUserOnline] = useState(false)
  const [loading, setLoading] = useState(false)
  const [uploadingFiles, setUploadingFiles] = useState(false)
  const [error, setError] = useState('')
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const channelRef = useRef<any | null>(null)
  const supabaseRef = useRef<any>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const statusIntervalRef = useRef<NodeJS.Timeout | null>(null)
  if (!supabaseRef.current) supabaseRef.current = createClient()
  const supabase = supabaseRef.current
  const processedMessageIds = useRef<Set<string>>(new Set())

  // helper functions will be created inside the effect to avoid stale deps

  useEffect(() => {
    let mounted = true

    async function checkUser() {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser()
        if (authUser && mounted) {
          setUser(authUser)
          // Update user online status
          await updateUserStatus(authUser.id, true)
        }
      } catch (err) {
        console.error('Error checking user:', err)
        setError('Failed to load user info')
      }
    }

    async function updateUserStatus(userId: string, isOnline: boolean) {
      try {
        await fetch('/api/user-status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ is_online: isOnline })
        }).catch(() => {}) // Silent fail if API not ready
      } catch (err) {
        console.error('Error updating status:', err)
      }
    }

    async function checkOtherUserStatus() {
      try {
        // Get order to find the other user
        const { data: order } = await supabase
          .from('orders')
          .select('client_id, clients!client_id(auth_user_id)')
          .eq('id', orderId)
          .single()

        if (!order) return

        const otherUserId = order.clients?.auth_user_id
        if (!otherUserId || otherUserId === user?.id) return

        const response = await fetch(`/api/user-status?user_id=${otherUserId}`)
        const data = await response.json()
        if (data && mounted) {
          setOtherUserOnline(Boolean(data.isOnline ?? data.is_online))
        }
      } catch (err) {
        console.error('Error checking other user status:', err)
      }
    }

    async function fetchMessages() {
      try {
        setError('')
        const { data, error: err } = await supabase
          .from('order_messages')
          .select('*')
          .eq('order_id', orderId)
          .order('created_at', { ascending: true })

        if (err) {
          console.error('Query error:', err)
          throw err
        }

        if (data && mounted) {
          const formattedMessages = data.map((msg: any) => ({
            id: msg.id,
            content: msg.content,
            user: { name: msg.sender_name || 'User', id: msg.sender_id },
            createdAt: msg.created_at,
            isRead: msg.read_status === 'read',
            fileAttachments: msg.file_attachments || []
          }))
          setMessages(formattedMessages)
          processedMessageIds.current.clear()
          formattedMessages.forEach((m: any) => processedMessageIds.current.add(m.id))

          const unreadMessageIds = data
            .filter((m: any) => m.read_status === 'unread' && m.sender_id !== (user?.id))
            .map((m: any) => m.id)

          if (unreadMessageIds.length > 0 && user) {
            await fetch('/api/mark-messages-read', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ orderId, messageIds: unreadMessageIds })
            }).catch((e) => console.error('Failed to mark read:', e))

            // let any interested component (e.g. navbar) know that some messages
            // have been marked as read so the notification badge can update
            try {
              window.dispatchEvent(new Event('messagesRead'))
            } catch {}
          }
        }
      } catch (err) {
        console.error('Error fetching messages:', err)
        setError('Failed to load messages')
      }
    }

    function subscribeToMessages() {
      if (!channelRef.current) {
        channelRef.current = supabase
          .channel(`order-chat-${orderId}`)
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'order_messages',
              filter: `order_id=eq.${orderId}`
            },
            (payload: any) => {
              const newMsg = {
                id: (payload.new as any).id,
                content: (payload.new as any).content,
                user: { name: (payload.new as any).sender_name || 'User', id: (payload.new as any).sender_id },
                createdAt: (payload.new as any).created_at,
                isRead: (payload.new as any).read_status === 'read',
                fileAttachments: (payload.new as any).file_attachments || []
              }

              if (!processedMessageIds.current.has(newMsg.id)) {
                processedMessageIds.current.add(newMsg.id)
                setMessages((prev) => [...prev, newMsg])

                if (user && (payload.new as any).sender_id !== user.id && (payload.new as any).read_status === 'unread') {
                  fetch('/api/mark-messages-read', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ orderId, messageIds: [newMsg.id] })
                  }).catch((e) => console.error('Failed to mark read:', e))
                  .finally(() => {
                    try {
                      window.dispatchEvent(new Event('messagesRead'))
                    } catch {}
                  })
                }
              }
            }
          )
          .subscribe((status: any) => {
            if (status === 'CHANNEL_ERROR') console.error('Channel subscription error')
          })
      }
    }

    checkUser()
    fetchMessages()
    subscribeToMessages()

    // Check other user status every 10 seconds
    statusIntervalRef.current = setInterval(() => {
      if (user) checkOtherUserStatus()
    }, 10000)

    return () => {
      mounted = false
      if (channelRef.current) channelRef.current.unsubscribe()
      if (statusIntervalRef.current) clearInterval(statusIntervalRef.current)
      // Set offline when component unmounts
      if (user) updateUserStatus(user.id, false)
    }
  }, [orderId, supabase, user])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    if (!selectedMessageId) return

    const timer = setTimeout(() => {
      const element = document.getElementById(`order-message-${selectedMessageId}`)
      scrollContainerToElement(messagesContainerRef.current, element, 'smooth')
    }, 50)

    return () => clearTimeout(timer)
  }, [messages, selectedMessageId])

  const scrollToBottom = () => {
    requestAnimationFrame(() => {
      scrollContainerToBottom(messagesContainerRef.current, 'auto')
    })
  }

  async function sendMessage() {
    if ((!inputMessage.trim() && selectedFiles.length === 0) || !user) {
      setError('Please enter a message or select files')
      return
    }

    setLoading(true)
    setUploadingFiles(selectedFiles.length > 0)
    setError('')
    
    try {
      let fileUrls: string[] = []

      // Upload files if selected
      if (selectedFiles.length > 0) {
        fileUrls = await Promise.all(
          selectedFiles.map(async (file) => {
            const timestamp = Date.now()
            const random = Math.random().toString(36).substring(2, 10)
            const fileName = `${timestamp}_${random}_${file.name}`
            const filePath = `order-clarifications/${orderId}/${fileName}`

            const { error: uploadError } = await supabase.storage
              .from('order-files')
              .upload(filePath, file, { cacheControl: '3600', upsert: false })

            if (uploadError) throw new Error(`Failed to upload ${file.name}`)

            const { data } = supabase.storage
              .from('order-files')
              .getPublicUrl(filePath)

            return data?.publicUrl || filePath
          })
        )
      }

      console.log('Sending message for order:', orderId, 'from user:', user.id)
      const messageData: any = {
        order_id: orderId,
        sender_id: user.id,
        sender_name: user.email?.split('@')[0] || 'User',
        content: inputMessage.trim() || `Shared ${selectedFiles.length} file(s)`,
        is_admin: isAdmin || (user?.user_metadata?.role === 'admin'),
        read_status: 'unread'
      }

      // Only add file_attachments if there are files
      if (fileUrls.length > 0) {
        messageData.file_attachments = fileUrls
      }

      const { error: insertError } = await supabase
        .from('order_messages')
        .insert([messageData] as any)

      if (insertError) {
        console.error('Insert error:', insertError)
        throw insertError
      }

      console.log('Message sent successfully')
      setInputMessage('')
      setSelectedFiles([])
      if (fileInputRef.current) fileInputRef.current.value = ''
    } catch (error) {
      console.error('Error sending message:', error)
      setError('Failed to send message. Please try again.')
    } finally {
      setLoading(false)
      setUploadingFiles(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden flex flex-col h-96">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FaUser size={20} />
          <div>
            <h3 className="font-bold text-lg">Order Support Chat</h3>
            <p className="text-blue-100 text-sm">Message our support team</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50">
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full text-gray-500">
            <div className="text-center">
              <p className="text-lg font-semibold mb-2">No messages yet</p>
              <p className="text-sm">Start a conversation with support</p>
            </div>
          </div>
        )}
        
        {messages.map((msg) => (
          <div
            id={`order-message-${msg.id}`}
            key={msg.id}
            className={`flex gap-3 ${msg.user.id === user?.id ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-xs px-4 py-3 rounded-lg ${
                msg.user.id === user?.id
                  ? 'bg-blue-600 text-white rounded-br-none'
                  : 'bg-gray-300 text-gray-900 rounded-bl-none'
              }`}
            >
              <p className="text-xs font-semibold opacity-75 mb-1">{msg.user.name}</p>
              <p className="break-words text-sm">{msg.content}</p>
              
              {/* File Attachments */}
              {msg.fileAttachments && msg.fileAttachments.length > 0 && (
                <div className="mt-3 pt-2 border-t border-current border-opacity-20">
                  {msg.fileAttachments.map((fileUrl: string, idx: number) => {
                    const fileName = fileUrl.split('/').pop()?.split('_').slice(2).join('_') || `file-${idx + 1}`
                    return (
                      <a
                        key={idx}
                        href={fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        download
                        className="flex items-center gap-2 text-xs hover:opacity-80 transition mb-1"
                      >
                        <FaFile size={12} /> {fileName}
                      </a>
                    )
                  })}
                </div>
              )}
              
              <p className="text-xs opacity-70 mt-1">
                {formatTime(msg.createdAt)}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Error Message */}
      {error && (
        <div className="px-6 py-2 bg-red-50 border-t border-red-200">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Input */}
      <div className="border-t border-gray-200 bg-white p-4 space-y-3">
        {/* Selected Files Display */}
        {selectedFiles.length > 0 && (
          <div className="bg-blue-50 rounded p-2 space-y-2">
            <p className="text-xs font-semibold text-blue-900">Selected Files ({selectedFiles.length}):</p>
            {selectedFiles.map((file, idx) => (
              <div key={idx} className="flex items-center justify-between bg-white p-2 rounded text-xs">
                <div className="flex items-center gap-2">
                  <FaFile size={12} className="text-blue-600" />
                  <span className="text-gray-700">{file.name}</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedFiles(selectedFiles.filter((_, i) => i !== idx))
                  }}
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
            value={inputMessage}
            onChange={(e) => {
              setInputMessage(e.target.value)
              setError('')
            }}
            onKeyPress={handleKeyPress}
            placeholder="Ask for clarification or assistance... (or attach files)"
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-600 text-sm"
            rows={2}
            disabled={loading || !user}
          />
          <div className="flex flex-col gap-2">
            <label
              htmlFor="chat-file-input"
              className="bg-gray-600 text-white px-3 py-2 rounded-lg hover:bg-gray-700 transition disabled:opacity-50 cursor-pointer flex items-center justify-center h-10"
              title="Attach files"
            >
              <FaUpload size={16} />
            </label>
            <input
              id="chat-file-input"
              ref={fileInputRef}
              type="file"
              multiple
              onChange={(e) => setSelectedFiles(Array.from(e.target.files || []))}
              className="hidden"
              disabled={loading || !user}
            />
            <button
              onClick={sendMessage}
              disabled={loading || !user || (!inputMessage.trim() && selectedFiles.length === 0)}
              className="bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center h-10"
              title="Send message"
            >
              <FaPaperPlane size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
