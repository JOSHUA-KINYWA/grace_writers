'use client'

import React, { useMemo, useState, useEffect, useRef } from 'react'
import { formatTime } from '@/lib/utils/formatDate'
import { createClient } from '@/lib/supabase/client'
import { FaPaperPlane, FaUser, FaCircle, FaFile, FaTrash, FaUpload, FaReply, FaCheck, FaCheckDouble, FaTimes } from 'react-icons/fa'

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
  parentMessageId?: string
  threadRootId?: string
  replyCount?: number
  replies?: ChatMessage[]
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

interface QuickReply {
  id: string
  title: string
  content: string
  category: string
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
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null)
  const [expandedThreads, setExpandedThreads] = useState<Set<string>>(new Set())
  const [quickReplies, setQuickReplies] = useState<QuickReply[]>([])
  const [showQuickReplies, setShowQuickReplies] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const channelRef = useRef<any | null>(null)
  const supabaseRef = useRef<any>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const statusIntervalRef = useRef<NodeJS.Timeout | null>(null)
  
  if (!supabaseRef.current) supabaseRef.current = createClient()
  const supabase = supabaseRef.current
  const processedMessageIds = useRef<Set<string>>(new Set())

  // Fetch quick replies for admins
  useEffect(() => {
    async function fetchQuickReplies() {
      if (!isAdmin) return
      try {
        const { data } = await supabase
          .from('quick_replies')
          .select('*')
          .eq('active', true)
          .or(`admin_id.eq.${user?.id},is_global.eq.true`)
          .order('sort_order')
        if (data) setQuickReplies(data)
      } catch (err) {
        console.error('Error fetching quick replies:', err)
      }
    }
    if (user?.id) fetchQuickReplies()
  }, [user?.id, isAdmin, supabase])

  useEffect(() => {
    let mounted = true

    async function checkUser() {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser()
        if (authUser && mounted) {
          setUser(authUser)
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
        }).catch(() => {})
      } catch (err) {
        console.error('Error updating status:', err)
      }
    }

    async function checkOtherUserStatus() {
      try {
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
          setOtherUserOnline(data.is_online || false)
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
          // Build message tree with threads
          const messageMap = new Map<string, ChatMessage>()
          const rootMessages: ChatMessage[] = []

          data.forEach((msg: any) => {
            const chatMsg: ChatMessage = {
              id: msg.id,
              content: msg.content,
              user: { name: msg.sender_name || 'User', id: msg.sender_id },
              createdAt: msg.created_at,
              isRead: msg.read_status === 'read',
              fileAttachments: msg.file_attachments || [],
              parentMessageId: msg.parent_message_id,
              threadRootId: msg.thread_root_id,
              replyCount: msg.reply_count || 0,
              replies: []
            }
            messageMap.set(msg.id, chatMsg)

            if (!msg.parent_message_id) {
              rootMessages.push(chatMsg)
            }
          })

          // Build thread hierarchy
          messageMap.forEach((msg) => {
            if (msg.parentMessageId && messageMap.has(msg.parentMessageId)) {
              const parent = messageMap.get(msg.parentMessageId)!
              if (!parent.replies) parent.replies = []
              parent.replies.push(msg)
            }
          })

          setMessages(rootMessages)
          processedMessageIds.current.clear()
          rootMessages.forEach((m) => processedMessageIds.current.add(m.id))

          const unreadMessageIds = data
            .filter((m: any) => m.read_status === 'unread' && m.sender_id !== user?.id)
            .map((m: any) => m.id)

          if (unreadMessageIds.length > 0 && user) {
            await fetch('/api/mark-messages-read', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ orderId, messageIds: unreadMessageIds })
            }).catch((e) => console.error('Failed to mark read:', e))

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
              const newMsg: ChatMessage = {
                id: (payload.new as any).id,
                content: (payload.new as any).content,
                user: { name: (payload.new as any).sender_name || 'User', id: (payload.new as any).sender_id },
                createdAt: (payload.new as any).created_at,
                isRead: (payload.new as any).read_status === 'read',
                fileAttachments: (payload.new as any).file_attachments || [],
                parentMessageId: (payload.new as any).parent_message_id,
                threadRootId: (payload.new as any).thread_root_id,
                replyCount: 0,
                replies: []
              }

              if (!processedMessageIds.current.has(newMsg.id)) {
                processedMessageIds.current.add(newMsg.id)
                
                // If it's a reply, find parent and add to replies
                if (newMsg.parentMessageId) {
                  setMessages(prev => {
                    const findAndAddReply = (msgs: ChatMessage[]): ChatMessage[] => {
                      return msgs.map(msg => {
                        if (msg.id === newMsg.parentMessageId) {
                          return { ...msg, replies: [...(msg.replies || []), newMsg] }
                        }
                        if (msg.replies?.length) {
                          return { ...msg, replies: findAndAddReply(msg.replies) }
                        }
                        return msg
                      })
                    }
                    return findAndAddReply(prev)
                  })
                } else {
                  setMessages(prev => [...prev, newMsg])
                }

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

    statusIntervalRef.current = setInterval(() => {
      if (user) checkOtherUserStatus()
    }, 10000)

    return () => {
      mounted = false
      if (channelRef.current) channelRef.current.unsubscribe()
      if (statusIntervalRef.current) clearInterval(statusIntervalRef.current)
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
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }, 50)
    return () => clearTimeout(timer)
  }, [messages, selectedMessageId])

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'auto' })
    }, 0)
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

      const messageData: any = {
        order_id: orderId,
        sender_id: user.id,
        sender_name: user.email?.split('@')[0] || 'User',
        content: inputMessage.trim() || `Shared ${selectedFiles.length} file(s)`,
        is_admin: isAdmin || (user?.user_metadata?.role === 'admin'),
        read_status: 'unread',
        parent_message_id: replyingTo?.id || null
      }

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

      setInputMessage('')
      setSelectedFiles([])
      setReplyingTo(null)
      setShowQuickReplies(false)
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

  const toggleThread = (messageId: string) => {
    const newExpanded = new Set(expandedThreads)
    if (newExpanded.has(messageId)) {
      newExpanded.delete(messageId)
    } else {
      newExpanded.add(messageId)
    }
    setExpandedThreads(newExpanded)
  }

  const applyQuickReply = (reply: QuickReply) => {
    setInputMessage(reply.content)
    setShowQuickReplies(false)
  }

  const formatDayLabel = useMemo(() => {
    return (iso: string) => {
      const d = new Date(iso)
      const today = new Date()
      const yesterday = new Date()
      yesterday.setDate(today.getDate() - 1)
      const sameDay = (a: Date, b: Date) =>
        a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
      if (sameDay(d, today)) return 'Today'
      if (sameDay(d, yesterday)) return 'Yesterday'
      return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
    }
  }, [])

  const getFileName = (fileUrl: string, idx: number) => {
    const name = fileUrl.split('/').pop() || `file-${idx + 1}`
    const cleaned = name.includes('_') ? name.split('_').slice(2).join('_') : name
    return cleaned || `file-${idx + 1}`
  }

  const renderMessage = (msg: ChatMessage, isReply: boolean = false) => (
    <div
      id={`order-message-${msg.id}`}
      key={msg.id}
      className={`flex ${msg.user.id === user?.id ? 'justify-end' : 'justify-start'} ${isReply ? 'pl-6' : ''}`}
    >
      <div
        className={`group relative max-w-[78%] md:max-w-[70%] px-4 py-3 rounded-2xl shadow-sm border ${
          msg.user.id === user?.id
            ? 'bg-gradient-to-br from-blue-600 to-blue-700 text-white border-blue-600/40 rounded-br-md'
            : 'bg-white text-slate-900 border-slate-200 rounded-bl-md'
        } ${isReply ? 'bg-opacity-95' : ''}`}
      >
        <div className="flex items-start justify-between gap-3 mb-1">
          <p className={`text-[11px] font-semibold ${msg.user.id === user?.id ? 'text-blue-50/90' : 'text-slate-500'}`}>
            {msg.user.id === user?.id ? (isAdmin ? 'You (Admin)' : 'You') : msg.user.name}
          </p>
          <p className={`text-[11px] ${msg.user.id === user?.id ? 'text-blue-50/80' : 'text-slate-400'}`}>
            {formatTime(msg.createdAt)}
          </p>
        </div>
        <p className={`break-words text-sm leading-relaxed ${msg.user.id === user?.id ? 'text-white' : 'text-slate-800'}`}>
          {msg.content}
        </p>

        {msg.fileAttachments && msg.fileAttachments.length > 0 && (
          <div className={`mt-3 pt-2 border-t ${msg.user.id === user?.id ? 'border-white/20' : 'border-slate-200'} space-y-1.5`}>
            {msg.fileAttachments.map((fileUrl: string, idx: number) => (
              <a
                key={idx}
                href={fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                download
                className={`inline-flex items-center gap-2 rounded-lg px-2 py-1 text-xs font-medium transition ${
                  msg.user.id === user?.id
                    ? 'bg-white/10 hover:bg-white/15 text-white'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700'
                }`}
              >
                <FaFile size={12} className={msg.user.id === user?.id ? 'text-white/90' : 'text-slate-600'} />
                <span className="truncate max-w-[220px]">{getFileName(fileUrl, idx)}</span>
              </a>
            ))}
          </div>
        )}

        <div className="mt-2 flex items-center justify-between gap-3">
          {!isReply && (msg.replyCount || 0) > 0 ? (
            <button
              onClick={() => toggleThread(msg.id)}
              className={`text-xs font-semibold ${
                msg.user.id === user?.id ? 'text-blue-50/90 hover:text-blue-50' : 'text-slate-600 hover:text-slate-800'
              }`}
            >
              {expandedThreads.has(msg.id) ? 'Hide thread' : 'View thread'} · {msg.replyCount} {msg.replyCount === 1 ? 'reply' : 'replies'}
            </button>
          ) : (
            <span />
          )}

          {msg.user.id === user?.id && (
            <span className={`inline-flex items-center gap-1 text-xs ${msg.user.id === user?.id ? 'text-blue-50/80' : 'text-slate-400'}`}>
              {msg.isRead ? <FaCheckDouble size={12} /> : <FaCheck size={12} />}
              <span className="hidden sm:inline">{msg.isRead ? 'Read' : 'Sent'}</span>
            </span>
          )}
        </div>
      </div>

      {!isReply && msg.user.id !== user?.id && (
        <button
          onClick={() => setReplyingTo(msg)}
          className="ml-2 mt-2 text-slate-400 hover:text-blue-600 transition opacity-0 group-hover:opacity-100"
          title="Reply to this message"
        >
          <FaReply size={14} />
        </button>
      )}
    </div>
  )

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-[520px]">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-800 text-white px-5 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/10">
            <FaUser size={18} className="text-white/90" />
          </div>
          <div className="min-w-0">
            <p className="font-bold text-base truncate">{isAdmin ? 'Client conversation' : 'Support chat'}</p>
            <div className="flex items-center gap-2 text-xs text-white/75">
              <FaCircle size={8} className={otherUserOnline ? 'text-green-400' : 'text-slate-400'} />
              <span>{otherUserOnline ? 'Online' : 'Offline'}</span>
              <span className="text-white/35">•</span>
              <span className="truncate">Order: {orderId.slice(0, 8).toUpperCase()}</span>
            </div>
          </div>
        </div>

        {isAdmin && quickReplies.length > 0 && (
          <button
            onClick={() => setShowQuickReplies(!showQuickReplies)}
            className="shrink-0 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 px-3 py-2 text-xs font-semibold transition"
            title="Quick replies"
          >
            Quick replies
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-3 bg-gradient-to-b from-slate-50 to-white">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-slate-500">
            <div className="text-center max-w-sm">
              <p className="text-base font-bold text-slate-700">No messages yet</p>
              <p className="text-sm mt-1">Send a message to start the conversation.</p>
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg, idx) => {
              const prev = idx > 0 ? messages[idx - 1] : null
              const showDateDivider = !prev || formatDayLabel(prev.createdAt) !== formatDayLabel(msg.createdAt)

              return (
                <div key={msg.id} className="space-y-3">
                  {showDateDivider && (
                    <div className="flex items-center justify-center py-2">
                      <div className="h-px bg-slate-200 flex-1" />
                      <span className="px-3 text-xs font-semibold text-slate-500">
                        {formatDayLabel(msg.createdAt)}
                      </span>
                      <div className="h-px bg-slate-200 flex-1" />
                    </div>
                  )}

                  {renderMessage(msg)}
                  {msg.replies && msg.replies.length > 0 && expandedThreads.has(msg.id) && (
                    <div className="ml-3 border-l-2 border-slate-200 pl-3 space-y-3">
                      {msg.replies.map((reply) => renderMessage(reply, true))}
                    </div>
                  )}
                </div>
              )
            })}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Error Message */}
      {error && (
        <div className="px-6 py-2 bg-red-50 border-t border-red-200">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Reply To Indicator */}
      {replyingTo && (
        <div className="px-5 py-2 bg-blue-50 border-t border-blue-100 flex items-center justify-between">
          <div className="text-sm">
            <p className="text-blue-700 font-semibold">Replying to {replyingTo.user.name}</p>
            <p className="text-blue-600 text-xs truncate">{replyingTo.content}</p>
          </div>
          <button
            onClick={() => setReplyingTo(null)}
            className="text-blue-600 hover:text-red-600"
          >
            <FaTimes size={16} />
          </button>
        </div>
      )}

      {/* Input */}
      <div className="border-t border-slate-200 bg-white p-4 space-y-3">
        {selectedFiles.length > 0 && (
          <div className="bg-slate-50 rounded-xl p-3 space-y-2 border border-slate-200">
            <p className="text-xs font-semibold text-slate-700">Attachments ({selectedFiles.length})</p>
            {selectedFiles.map((file, idx) => (
              <div key={idx} className="flex items-center justify-between bg-white p-2 rounded-lg text-xs border border-slate-200">
                <div className="flex items-center gap-2">
                  <FaFile size={12} className="text-slate-600" />
                  <span className="text-slate-700 truncate max-w-[260px]">{file.name}</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedFiles(selectedFiles.filter((_, i) => i !== idx))
                  }}
                  className="text-slate-500 hover:text-red-600 transition"
                >
                  <FaTrash size={12} />
                </button>
              </div>
            ))}
          </div>
        )}
        
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <textarea
              value={inputMessage}
              onChange={(e) => {
                setInputMessage(e.target.value)
                setError('')
              }}
              onKeyPress={handleKeyPress}
              placeholder={isAdmin ? 'Write a reply…' : 'Type your message…'}
              className="w-full px-4 py-3 border border-slate-300 rounded-2xl resize-none focus:outline-none focus:ring-2 focus:ring-blue-600 text-sm bg-white text-slate-900 placeholder-slate-400"
              rows={2}
              disabled={loading || !user}
            />
            <p className="absolute right-3 bottom-2 text-[11px] text-slate-400">
              Enter to send • Shift+Enter new line
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <label
              htmlFor="chat-file-input"
              className="bg-slate-900 text-white px-3 py-2 rounded-xl hover:bg-slate-800 transition disabled:opacity-50 cursor-pointer flex items-center justify-center h-10 border border-slate-800"
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
              className="bg-blue-600 text-white px-3 py-2 rounded-xl hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center h-10 shadow-sm"
              title="Send message"
            >
              <FaPaperPlane size={16} />
            </button>
          </div>
        </div>

        {showQuickReplies && quickReplies.length > 0 && (
          <div className="bg-purple-50 rounded-2xl p-3 space-y-2 max-h-44 overflow-y-auto border border-purple-200">
            <p className="text-xs font-semibold text-purple-900 mb-2">Quick replies</p>
            {quickReplies.map((qr) => (
              <button
                key={qr.id}
                onClick={() => applyQuickReply(qr)}
                className="w-full text-left bg-white hover:bg-purple-100 p-3 rounded-xl text-xs text-slate-700 border border-purple-200 transition"
              >
                <p className="font-semibold">{qr.title}</p>
                <p className="text-gray-600 line-clamp-2">{qr.content}</p>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
