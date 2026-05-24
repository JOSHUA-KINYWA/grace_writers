'use client'

import React, { useMemo, useState, useEffect, useRef } from 'react'
import { formatTime } from '@/lib/utils/formatDate'
import { scrollContainerToBottom, scrollContainerToElement } from '@/lib/utils/scroll-container'
import {
  attachmentDisplayName,
  attachmentDownloadHref,
} from '@/lib/utils/storage-path'
import { createClient } from '@/lib/supabase/client'
import { getCachedAuthUser } from '@/lib/auth/client-session'
import { FaPaperPlane, FaUser, FaFile, FaTrash, FaUpload, FaReply, FaCheck, FaCheckDouble, FaTimes } from 'react-icons/fa'

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
  const [otherPartyLabel, setOtherPartyLabel] = useState('Support team')
  const [uploadingFiles, setUploadingFiles] = useState(false)
  const [error, setError] = useState('')
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null)
  const [expandedThreads, setExpandedThreads] = useState<Set<string>>(new Set())
  const [quickReplies, setQuickReplies] = useState<QuickReply[]>([])
  const [showQuickReplies, setShowQuickReplies] = useState(false)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const channelRef = useRef<any | null>(null)
  const supabaseRef = useRef<any>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const statusIntervalRef = useRef<NodeJS.Timeout | null>(null)
  
  if (!supabaseRef.current) supabaseRef.current = createClient()
  const supabase = supabaseRef.current
  const processedMessageIds = useRef<Set<string>>(new Set())
  const userRef = useRef<any | null>(null)
  const sendingRef = useRef(false)
  const realtimeFailedRef = useRef(false)

  function applyMessagesFromRows(data: any[], currentUserId: string | null) {
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
        replies: [],
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
    processedMessageIds.current.clear()
    data.forEach((m: any) => processedMessageIds.current.add(m.id))

    const unreadMessageIds = data
      .filter((m: any) => m.read_status === 'unread' && m.sender_id !== currentUserId)
      .map((m: any) => m.id)

    if (unreadMessageIds.length > 0) {
      void (async () => {
        try {
          const res = await fetch('/api/mark-messages-read', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orderId, messageIds: unreadMessageIds }),
          })
          if (res.ok) {
            window.dispatchEvent(new Event('messagesRead'))
          }
        } catch (e) {
          console.error('Failed to mark read:', e)
        }
      })()
    }
  }

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
    let active = true
    getCachedAuthUser(supabase).then((authUser) => {
      if (!active) return
      if (authUser) {
        userRef.current = authUser
        setUser(authUser)
      }
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const authUser = session?.user ?? null
      userRef.current = authUser
      setUser(authUser)
    })
    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [supabase])

  useEffect(() => {
    let mounted = true

    setMessages([])
    setError('')
    processedMessageIds.current.clear()

    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
      channelRef.current = null
    }

    async function checkOtherUserStatus() {
      try {
        const response = await fetch(
          `/api/presence/order-party?orderId=${encodeURIComponent(orderId)}`,
          { cache: 'no-store' }
        )
        if (!response.ok || !mounted) return
        const data = await response.json()
        if (mounted) {
          setOtherUserOnline(Boolean(data.isOnline ?? data.is_online))
          setOtherPartyLabel(data.label || (isAdmin ? 'Client' : 'Support team'))
        }
      } catch (err) {
        console.error('Error checking other user status:', err)
      }
    }

    async function fetchMessages() {
      if (!orderId || !mounted) return
      try {
        const res = await fetch(`/api/order-messages?orderId=${encodeURIComponent(orderId)}`, {
          cache: 'no-store',
        })
        if (!res.ok) {
          const errBody = await res.json().catch(() => ({}))
          throw new Error(errBody.error || 'Failed to load messages')
        }
        const payload = await res.json()
        if (mounted) {
          applyMessagesFromRows(payload.messages || [], userRef.current?.id ?? null)
        }
      } catch (err) {
        console.error('Error fetching messages:', err)
        if (mounted) setError('Failed to load messages')
      }
    }

    function subscribeToMessages() {
      if (realtimeFailedRef.current) return

      const channel = supabase.channel(`order-chat-${orderId}`)

      const onChange = (payload: { new: Record<string, unknown> }) => {
        const row = payload.new
        if (String(row.order_id) !== orderId) return
        void fetchMessages()
      }

      channel
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'order_messages' },
          onChange
        )
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'order_messages' },
          onChange
        )
        .subscribe((status: string) => {
          if (status === 'SUBSCRIBED') {
            realtimeFailedRef.current = false
            return
          }
          if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            realtimeFailedRef.current = true
            supabase.removeChannel(channel)
            if (channelRef.current === channel) channelRef.current = null
          }
        })

      channelRef.current = channel
    }

    async function init() {
      await fetchMessages()
      subscribeToMessages()
      void checkOtherUserStatus()
    }

    void init()

    const messagePollRef = setInterval(() => {
      void fetchMessages()
    }, 4000)

    statusIntervalRef.current = setInterval(() => {
      void checkOtherUserStatus()
    }, 5000)

    return () => {
      mounted = false
      realtimeFailedRef.current = false
      clearInterval(messagePollRef)
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
      if (statusIntervalRef.current) clearInterval(statusIntervalRef.current)
    }
  }, [orderId, supabase, isAdmin])

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
    if (sendingRef.current) return
    const activeUser = userRef.current || user
    if ((!inputMessage.trim() && selectedFiles.length === 0) || !activeUser) {
      setError('Please enter a message or select files')
      return
    }

    const draftText = inputMessage.trim()
    const draftFiles = [...selectedFiles]
    const draftReply = replyingTo

    sendingRef.current = true
    setUploadingFiles(draftFiles.length > 0)
    setError('')
    setInputMessage('')
    setSelectedFiles([])
    setReplyingTo(null)
    setShowQuickReplies(false)
    if (fileInputRef.current) fileInputRef.current.value = ''

    try {
      let filePaths: string[] = []

      if (draftFiles.length > 0) {
        filePaths = await Promise.all(
          draftFiles.map(async (file) => {
            const formData = new FormData()
            formData.append('orderId', orderId)
            formData.append('file', file)
            const uploadRes = await fetch('/api/order-messages/upload', {
              method: 'POST',
              body: formData,
            })
            const uploadJson = await uploadRes.json()
            if (!uploadRes.ok) {
              throw new Error(uploadJson.error || `Failed to upload ${file.name}`)
            }
            return uploadJson.path as string
          })
        )
      }

      const sendRes = await fetch('/api/order-messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId,
          content: draftText,
          fileAttachments: filePaths,
          parentMessageId: draftReply?.id || null,
        }),
      })
      const sendPayload = await sendRes.json()
      if (!sendRes.ok) {
        throw new Error(sendPayload.error || 'Failed to send message')
      }

      scrollToBottom()

      void fetch('/api/order-messages/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId,
          content: sendPayload.message?.content || draftText,
        }),
      }).catch(() => {})

      void fetch(`/api/order-messages?orderId=${encodeURIComponent(orderId)}`, {
        cache: 'no-store',
      })
        .then(async (res) => {
          if (!res.ok) return
          const payload = await res.json()
          applyMessagesFromRows(payload.messages || [], userRef.current?.id || activeUser.id)
          scrollToBottom()
        })
        .catch(() => {})
    } catch (err) {
      console.error('Error sending message:', err)
      setError(err instanceof Error ? err.message : 'Failed to send message. Please try again.')
      setInputMessage(draftText)
      setSelectedFiles(draftFiles)
      setReplyingTo(draftReply)
    } finally {
      sendingRef.current = false
      setUploadingFiles(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void sendMessage()
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
            {msg.fileAttachments.map((fileRef: string, idx: number) => (
              <a
                key={idx}
                href={attachmentDownloadHref(fileRef)}
                target="_blank"
                rel="noopener noreferrer"
                className={`inline-flex items-center gap-2 rounded-lg px-2 py-1 text-xs font-medium transition ${
                  msg.user.id === user?.id
                    ? 'bg-white/10 hover:bg-white/15 text-white'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700'
                }`}
              >
                <FaFile size={12} className={msg.user.id === user?.id ? 'text-white/90' : 'text-slate-600'} />
                <span className="truncate max-w-[220px]">{attachmentDisplayName(fileRef, idx)}</span>
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
            <div className="flex items-center gap-2 text-xs text-white/75 flex-wrap">
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
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto px-4 py-5 space-y-3 bg-gradient-to-b from-slate-50 to-white"
      >
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
              onKeyDown={handleKeyDown}
              placeholder={isAdmin ? 'Write a reply…' : 'Type your message…'}
              className="w-full px-4 py-3 border border-slate-300 rounded-2xl resize-none focus:outline-none focus:ring-2 focus:ring-blue-600 text-sm bg-white text-slate-900 placeholder-slate-400"
              rows={2}
              disabled={!user && !userRef.current}
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
              disabled={!user && !userRef.current}
            />
            <button
              type="button"
              onClick={() => void sendMessage()}
              disabled={
                uploadingFiles ||
                (!user && !userRef.current) ||
                (!inputMessage.trim() && selectedFiles.length === 0)
              }
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
