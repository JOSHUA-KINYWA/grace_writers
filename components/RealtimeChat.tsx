'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getCachedAuthUser } from '@/lib/auth/client-session'
import { FaComments, FaTimes, FaPaperPlane, FaMinus, FaWindowMaximize } from 'react-icons/fa'
import { formatTime } from '@/lib/utils/formatDate'
import { scrollContainerToBottom } from '@/lib/utils/scroll-container'
import LiveChatStarters from '@/components/LiveChatStarters'
import { LIVE_CHAT_STARTERS, type LiveChatStarter } from '@/lib/live-chat/starters'

interface ChatMessage {
  id: string
  content: string
  user: { name: string; id: string }
  createdAt: string
  replied?: boolean
}

interface LiveChatToast {
  id: string
  preview: string
  from: string
}

interface RealtimeChatProps {
  roomName?: string
  username?: string
  onMessage?: (messages: ChatMessage[]) => void
  messages?: ChatMessage[]
  isAdmin?: boolean
  clientId?: string
}

export default function RealtimeChat({
  onMessage,
  messages: initialMessages = [],
  isAdmin = false,
}: RealtimeChatProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages)
  const [inputMessage, setInputMessage] = useState('')
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null)
  const [chatRoomId, setChatRoomId] = useState<string | null>(null)
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState('')
  const [liveToast, setLiveToast] = useState<LiveChatToast | null>(null)
  const [seenVersion, setSeenVersion] = useState(0)
  const [starters, setStarters] = useState<LiveChatStarter[]>(LIVE_CHAT_STARTERS)
  const [roomStatus, setRoomStatus] = useState<'open' | 'closed'>('open')
  const [roomBusy, setRoomBusy] = useState(false)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>['channel']> | null>(null)
  const sendingRef = useRef(false)
  const seenMessageIdsRef = useRef<Set<string>>(new Set())
  const chatRoomIdRef = useRef<string | null>(null)
  const supabaseRef = useRef(createClient())

  chatRoomIdRef.current = chatRoomId

  const seenStorageKey = useCallback((roomId: string | null) => {
    return roomId ? `live-chat-seen-${roomId}` : 'live-chat-seen-pending'
  }, [])

  const persistSeen = useCallback(
    (roomId: string | null) => {
      if (typeof window === 'undefined' || !roomId) return
      try {
        localStorage.setItem(
          seenStorageKey(roomId),
          JSON.stringify([...seenMessageIdsRef.current])
        )
      } catch {
        /* ignore */
      }
    },
    [seenStorageKey]
  )

  const hydrateSeen = useCallback(
    (roomId: string | null) => {
      if (typeof window === 'undefined' || !roomId) return
      try {
        const raw = localStorage.getItem(seenStorageKey(roomId))
        if (!raw) return
        const ids = JSON.parse(raw) as string[]
        for (const id of ids) seenMessageIdsRef.current.add(id)
        setSeenVersion((v) => v + 1)
      } catch {
        /* ignore */
      }
    },
    [seenStorageKey]
  )

  const markAllSeen = useCallback(
    (list: ChatMessage[]) => {
      let changed = false
      for (const m of list) {
        if (!seenMessageIdsRef.current.has(m.id)) {
          seenMessageIdsRef.current.add(m.id)
          changed = true
        }
      }
      if (changed) setSeenVersion((v) => v + 1)
      setLiveToast(null)
      persistSeen(chatRoomIdRef.current)
    },
    [persistSeen]
  )

  const loadMessages = useCallback(
    async (roomId?: string | null) => {
      try {
        const url = roomId
          ? `/api/live-chat/messages?chatRoomId=${encodeURIComponent(roomId)}`
          : '/api/live-chat/messages'
        let res = await fetch(url, { cache: 'no-store' })
        let data = await res.json()

        if (!res.ok && res.status === 403 && roomId) {
          chatRoomIdRef.current = null
          setChatRoomId(null)
          res = await fetch('/api/live-chat/messages', { cache: 'no-store' })
          data = await res.json()
        }

        if (!res.ok) throw new Error(data.error || 'Failed to load messages')

        const resolvedRoomId = data.chatRoomId as string | undefined
        if (resolvedRoomId) {
          setChatRoomId(resolvedRoomId)
          chatRoomIdRef.current = resolvedRoomId
          hydrateSeen(resolvedRoomId)
        }
        if (data.roomStatus === 'closed' || data.roomStatus === 'open') {
          setRoomStatus(data.roomStatus)
        }
        if (Array.isArray(data.starters)) {
          setStarters(data.starters)
        }

        const list = (data.messages || []) as ChatMessage[]
        const myId = user?.id

        setMessages(list)
        onMessage?.(list)

        if (isOpen) {
          markAllSeen(list)
        } else if (myId) {
          const unreadSupport = list.filter(
            (m) => m.user.id !== myId && !seenMessageIdsRef.current.has(m.id)
          )
          if (unreadSupport.length === 0) {
            setLiveToast(null)
          } else {
            const latest = unreadSupport[unreadSupport.length - 1]
            setLiveToast({
              id: latest.id,
              preview: latest.content.slice(0, 120),
              from: latest.user.name || 'Support',
            })
          }
        }
      } catch (e) {
        console.error('Live chat load error:', e)
      }
    },
    [onMessage, user?.id, isOpen, markAllSeen, hydrateSeen]
  )

  useEffect(() => {
    const supabase = supabaseRef.current
    getCachedAuthUser(supabase).then((u) => {
      if (u) setUser({ id: u.id, email: u.email })
    })
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_e, session) => {
      const u = session?.user
      setUser(u ? { id: u.id, email: u.email } : null)
    })
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!user || isAdmin) return
    void loadMessages(chatRoomIdRef.current)
    const poll = setInterval(() => {
      void loadMessages(chatRoomIdRef.current)
    }, 3000)
    return () => clearInterval(poll)
  }, [user, isAdmin, loadMessages])

  useEffect(() => {
    if (!chatRoomId || !user) return

    const supabase = supabaseRef.current
    if (channelRef.current) supabase.removeChannel(channelRef.current)

    const channel = supabase
      .channel(`live-chat-room-${chatRoomId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `chat_room_id=eq.${chatRoomId}`,
        },
        () => {
          void loadMessages(chatRoomId)
        }
      )
      .subscribe()

    channelRef.current = channel

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [chatRoomId, user, loadMessages])

  useEffect(() => {
    if (isOpen && !isMinimized) {
      markAllSeen(messages)
      scrollContainerToBottom(messagesContainerRef.current, 'smooth')
    }
  }, [messages, isMinimized, isOpen, markAllSeen])

  async function startNewConversation() {
    if (roomBusy) return
    if (!window.confirm('Start a new conversation? The current thread will be closed.')) return
    setRoomBusy(true)
    setError('')
    try {
      const res = await fetch('/api/live-chat/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'new', chatRoomId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to start new chat')
      setChatRoomId(data.chatRoomId)
      chatRoomIdRef.current = data.chatRoomId
      setRoomStatus('open')
      setMessages([])
      seenMessageIdsRef.current.clear()
      setSeenVersion((v) => v + 1)
      if (data.starters) setStarters(data.starters)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to start new chat')
    } finally {
      setRoomBusy(false)
    }
  }

  async function closeConversation() {
    if (roomBusy || !chatRoomId) return
    if (!window.confirm('Close this conversation? You can start a new one anytime.')) return
    setRoomBusy(true)
    setError('')
    try {
      const res = await fetch('/api/live-chat/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'close', chatRoomId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to close')
      setRoomStatus('closed')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to close chat')
    } finally {
      setRoomBusy(false)
    }
  }

  async function sendMessage(overrideText?: string) {
    if (sendingRef.current || !user) return
    const text = (overrideText ?? inputMessage).trim()
    if (!text) return
    if (roomStatus === 'closed') {
      setError('This chat is closed. Start a new conversation.')
      return
    }

    sendingRef.current = true
    setIsSending(true)
    setError('')
    setInputMessage('')

    try {
      const res = await fetch('/api/live-chat/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: text, chatRoomId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to send')

      const roomId = data.chatRoomId || chatRoomId
      if (roomId) {
        setChatRoomId(roomId)
        chatRoomIdRef.current = roomId
      }

      if (data.message) {
        const sent = data.message as ChatMessage
        seenMessageIdsRef.current.add(sent.id)
        setMessages((prev) => {
          if (prev.some((m) => m.id === sent.id)) return prev
          return [...prev, sent]
        })
      }

      void loadMessages(roomId)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to send')
      setInputMessage(text)
    } finally {
      sendingRef.current = false
      setIsSending(false)
    }
  }

  if (!user || isAdmin) {
    return null
  }

  void seenVersion
  const unreadCount = messages.filter(
    (m) => m.user.id !== user.id && !seenMessageIdsRef.current.has(m.id)
  ).length

  const hasUnread = unreadCount > 0
  const showToast =
    liveToast && !isOpen && !seenMessageIdsRef.current.has(liveToast.id)

  return (
    <>
      {!isOpen && (
        <div className="fixed bottom-6 right-6 z-[999] flex flex-col items-end gap-2">
          {showToast && liveToast && (
            <button
              type="button"
              onClick={() => {
                setIsOpen(true)
                setIsMinimized(false)
                markAllSeen(messages)
                void loadMessages(chatRoomId)
              }}
              className="max-w-[min(92vw,280px)] rounded-xl border border-purple-200 bg-white px-3 py-2 shadow-lg text-left hover:border-purple-400 transition"
            >
              <p className="text-xs font-semibold text-purple-700">
                New message from {liveToast.from}
              </p>
              <p className="text-sm text-gray-800 mt-0.5 line-clamp-2">{liveToast.preview}</p>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              setIsOpen(true)
              setIsMinimized(false)
              markAllSeen(messages)
              void loadMessages(chatRoomId)
            }}
            className={`relative bg-purple-600 text-white p-4 rounded-full shadow-2xl hover:bg-purple-700 transition-transform ${
              hasUnread ? 'animate-bounce ring-4 ring-purple-300/60' : ''
            }`}
            aria-label="Open live chat"
          >
            <FaComments className="text-2xl" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full min-w-[1.5rem] h-6 px-1 flex items-center justify-center font-bold">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
        </div>
      )}

      {isOpen && (
        <>
          {!isMinimized && (
            <button
              type="button"
              aria-label="Close chat"
              onClick={() => {
                markAllSeen(messages)
                setIsOpen(false)
              }}
              className="fixed inset-0 z-[997] bg-black/20"
            />
          )}
          <div
            className={`fixed bottom-4 right-3 sm:right-6 z-[998] bg-white rounded-xl shadow-2xl flex flex-col border border-gray-200 ${
              isMinimized ? 'w-[310px]' : 'w-[min(96vw,390px)] h-[min(72vh,620px)]'
            }`}
          >
            <div className="bg-purple-600 text-white p-3 rounded-t-lg flex flex-col gap-2">
              <div className="flex justify-between items-center">
              <div className="flex items-center gap-2 min-w-0">
                <FaComments className="shrink-0" />
                <span className="font-semibold truncate">Live Chat Support</span>
                {unreadCount > 0 && (
                  <span className="bg-red-500 text-[10px] px-2 py-0.5 rounded-full font-bold shrink-0">
                    {unreadCount} new
                  </span>
                )}
                {roomStatus === 'closed' && (
                  <span className="bg-white/20 text-[10px] px-2 py-0.5 rounded-full shrink-0">
                    Closed
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsMinimized(!isMinimized)}
                  className="hover:bg-purple-700 rounded p-1"
                >
                  {isMinimized ? <FaWindowMaximize /> : <FaMinus />}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false)
                    setIsMinimized(false)
                  }}
                  className="hover:bg-purple-700 rounded p-1"
                >
                  <FaTimes />
                </button>
              </div>
              </div>
              <div className="flex flex-wrap gap-1.5 text-[11px]">
                <button
                  type="button"
                  disabled={roomBusy || roomStatus === 'closed'}
                  onClick={() => void closeConversation()}
                  className="px-2 py-1 rounded bg-white/15 hover:bg-white/25 disabled:opacity-50"
                >
                  Close chat
                </button>
                <button
                  type="button"
                  disabled={roomBusy}
                  onClick={() => void startNewConversation()}
                  className="px-2 py-1 rounded bg-white/15 hover:bg-white/25 disabled:opacity-50"
                >
                  New conversation
                </button>
              </div>
            </div>

            {!isMinimized && (
              <>
                <div
                  ref={messagesContainerRef}
                  className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 min-h-0"
                >
                  {messages.length === 0 && roomStatus === 'open' && (
                    <LiveChatStarters
                      starters={starters}
                      disabled={isSending || roomBusy}
                      onPick={(starter) => void sendMessage(starter.message)}
                    />
                  )}
                  {messages.length === 0 ? (
                    <p className="text-center text-gray-600 text-sm py-4">
                      {roomStatus === 'closed'
                        ? 'This conversation is closed. Tap “New conversation” to continue.'
                        : 'Pick a topic above or type your message below.'}
                    </p>
                  ) : (
                    messages.map((message, index) => {
                      const isOwn = message.user.id === user.id
                      const isUnread =
                        !isOwn && !seenMessageIdsRef.current.has(message.id)
                      const showHeader =
                        index === 0 || messages[index - 1].user.id !== message.user.id
                      return (
                        <div
                          key={message.id}
                          className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-[75%] ${isOwn ? 'items-end' : 'items-start'} flex flex-col gap-1`}
                          >
                            {showHeader && (
                              <div className={`text-xs px-1 ${isOwn ? 'text-right' : ''}`}>
                                <span className="font-bold text-gray-900">
                                  {message.user.name}
                                </span>
                                <span className="text-gray-500 ml-2">
                                  {formatTime(message.createdAt)}
                                </span>
                              </div>
                            )}
                            <div
                              className={`py-2 px-3 rounded-xl text-sm ${
                                isOwn
                                  ? 'bg-purple-600 text-white'
                                  : isUnread
                                    ? 'bg-white border-2 border-purple-400 text-gray-900'
                                    : 'bg-white border border-gray-200 text-gray-900'
                              }`}
                            >
                              {message.content}
                            </div>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>

                {error && <p className="px-4 text-xs text-red-600">{error}</p>}

                <div className="border-t p-4 bg-white">
                  <form
                    onSubmit={(e) => {
                      e.preventDefault()
                      void sendMessage()
                    }}
                    className="flex gap-2"
                  >
                    <input
                      type="text"
                      value={inputMessage}
                      onChange={(e) => {
                        setInputMessage(e.target.value)
                        setError('')
                      }}
                      placeholder={
                        roomStatus === 'closed'
                          ? 'Start a new conversation to message support'
                          : 'Type your message...'
                      }
                      disabled={roomStatus === 'closed' || roomBusy}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-900 disabled:bg-gray-100"
                    />
                    <button
                      type="submit"
                      disabled={
                        isSending || roomBusy || roomStatus === 'closed' || !inputMessage.trim()
                      }
                      className="bg-purple-600 text-white px-4 py-2 rounded-lg disabled:opacity-50"
                      aria-busy={isSending}
                    >
                      <FaPaperPlane />
                    </button>
                  </form>
                  <p className="text-[10px] text-gray-500 mt-2">
                    Admin replies appear here. For order updates use Messages in your dashboard.
                  </p>
                </div>
              </>
            )}
          </div>
        </>
      )}
    </>
  )
}
