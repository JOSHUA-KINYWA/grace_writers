'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { FaComments, FaUser, FaCheckCircle, FaClock, FaArchive } from 'react-icons/fa'
import ChatInput, { type QuickReplyChip } from './ChatInput'
import { formatDate, formatTime } from '@/lib/utils/formatDate'

interface ChatRoom {
  id: string
  room_name: string
  client_id: string
  last_message_at: string
  unread_count: number
  status?: string
  closed_at?: string | null
  clients: {
    id: string
    name: string
    email: string
    phone?: string
  }
}

interface AdminChatViewProps {
  initialChatRooms: ChatRoom[]
}

type RoomFilter = 'open' | 'closed' | 'all'

export default function AdminChatView({ initialChatRooms }: AdminChatViewProps) {
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>(initialChatRooms)
  const [selectedRoom, setSelectedRoom] = useState<ChatRoom | null>(null)
  const [messages, setMessages] = useState<
    Array<{
      id: string
      content: string
      user: { id: string; name: string }
      createdAt: string
      replied?: boolean
    }>
  >([])
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [roomFilter, setRoomFilter] = useState<RoomFilter>('open')
  const [quickReplies, setQuickReplies] = useState<QuickReplyChip[]>([])
  const [roomBusy, setRoomBusy] = useState(false)
  const [clientOnline, setClientOnline] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    if (!selectedRoom?.id) {
      setClientOnline(false)
      return
    }
    let mounted = true

    async function check() {
      try {
        const res = await fetch(
          `/api/presence/live-chat-client?chatRoomId=${encodeURIComponent(selectedRoom!.id)}`,
          { cache: 'no-store' }
        )
        if (!res.ok || !mounted) return
        const data = await res.json()
        if (mounted) setClientOnline(Boolean(data.isOnline ?? data.is_online))
      } catch {
        /* ignore */
      }
    }

    check()
    const interval = setInterval(check, 20_000)
    return () => {
      mounted = false
      clearInterval(interval)
    }
  }, [selectedRoom?.id])

  const loadChatRooms = useCallback(async () => {
    try {
      const res = await fetch('/api/live-chat/rooms', { cache: 'no-store' })
      const data = await res.json()
      if (res.ok && data.rooms) {
        setChatRooms(data.rooms)
      }
    } catch (error) {
      console.error('Error loading chat rooms:', error)
    }
  }, [])

  const loadMessages = useCallback(async (roomId: string) => {
    try {
      const res = await fetch(
        `/api/live-chat/messages?chatRoomId=${encodeURIComponent(roomId)}`,
        { cache: 'no-store' }
      )
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setMessages(
        (data.messages || []).map(
          (msg: {
            id: string
            content: string
            user: { id: string; name: string }
            createdAt: string
            replied?: boolean
          }) => ({
            id: msg.id,
            content: msg.content,
            user: msg.user,
            createdAt: msg.createdAt,
            replied: msg.replied,
          })
        )
      )
    } catch (err) {
      console.error('Error loading messages:', err)
    }
  }, [])

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setCurrentUserId(user.id)
    })
  }, [supabase])

  useEffect(() => {
    async function loadQuickReplies() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        const { data } = await supabase
          .from('quick_replies')
          .select('id, title, content')
          .eq('active', true)
          .or(`admin_id.eq.${user.id},is_global.eq.true`)
          .order('sort_order')
          .limit(12)
        if (data) {
          setQuickReplies(
            data.map((r: { id: string; title: string; content: string }) => ({
              id: r.id,
              title: r.title,
              content: r.content,
            }))
          )
        }
      } catch (e) {
        console.error('Quick replies load error:', e)
      }
    }
    void loadQuickReplies()
    void loadChatRooms()
  }, [supabase, loadChatRooms])

  useEffect(() => {
    const channel = supabase
      .channel('admin-chat-rooms')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_rooms' }, () => {
        void loadChatRooms()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => {
        if (selectedRoom) void loadMessages(selectedRoom.id)
        void loadChatRooms()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [selectedRoom, loadChatRooms, loadMessages, supabase])

  function handleSelectRoom(room: ChatRoom) {
    setSelectedRoom(room)
    void loadMessages(room.id)
  }

  async function closeConversation() {
    if (!selectedRoom || roomBusy) return
    if (!window.confirm('Close this conversation? The client can start a new one when ready.')) return
    setRoomBusy(true)
    try {
      const res = await fetch('/api/live-chat/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'close', chatRoomId: selectedRoom.id }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error)
      }
      await loadChatRooms()
      setSelectedRoom((prev) => (prev ? { ...prev, status: 'closed' } : null))
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to close')
    } finally {
      setRoomBusy(false)
    }
  }

  async function startNewForClient() {
    if (!selectedRoom || roomBusy) return
    if (
      !window.confirm(
        `Start a new conversation with ${selectedRoom.clients?.name || 'this client'}? The current thread will be closed.`
      )
    ) {
      return
    }
    setRoomBusy(true)
    try {
      const res = await fetch('/api/live-chat/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'new', clientId: selectedRoom.client_id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      await loadChatRooms()
      const newRoom = {
        ...selectedRoom,
        id: data.chatRoomId,
        status: 'open',
        unread_count: 0,
        last_message_at: new Date().toISOString(),
      }
      setSelectedRoom(newRoom)
      setMessages([])
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to start new conversation')
    } finally {
      setRoomBusy(false)
    }
  }

  function formatRelativeTime(dateString: string) {
    const date = new Date(dateString)
    if (Number.isNaN(date.getTime())) return ''
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)

    if (minutes < 1) return 'Just now'
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    if (days < 7) return `${days}d ago`
    return formatDate(date.toISOString())
  }

  const filteredRooms = chatRooms.filter((r) => {
    const status = r.status || 'open'
    if (roomFilter === 'all') return true
    return status === roomFilter
  })

  const isClosed = selectedRoom?.status === 'closed'

  return (
    <div className="grid md:grid-cols-3 gap-6 h-[calc(100vh-200px)]">
      <div className="bg-white rounded-lg shadow overflow-hidden flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-900">Client Conversations</h2>
          <p className="text-sm text-gray-600 mt-1">
            {chatRooms.filter((r) => (r.status || 'open') === 'open' && r.unread_count > 0).length}{' '}
            open with unread
          </p>
          <div className="flex gap-1 mt-3">
            {(['open', 'closed', 'all'] as RoomFilter[]).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setRoomFilter(f)}
                className={`text-xs px-2.5 py-1 rounded-full capitalize ${
                  roomFilter === f
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {filteredRooms.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <FaComments className="text-4xl mx-auto mb-2 opacity-50" />
              <p>No {roomFilter === 'all' ? '' : roomFilter} conversations</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredRooms.map((room) => {
                const isOpen = (room.status || 'open') === 'open'
                return (
                  <button
                    key={room.id}
                    type="button"
                    onClick={() => handleSelectRoom(room)}
                    className={`w-full text-left p-4 hover:bg-gray-50 transition ${
                      selectedRoom?.id === room.id
                        ? 'bg-purple-50 border-l-4 border-purple-600'
                        : ''
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <FaUser className="text-purple-600 shrink-0" />
                        <span className="font-semibold text-gray-900 truncate">
                          {room.clients?.name || room.clients?.email?.split('@')[0] || 'Client'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {!isOpen && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-200 text-gray-700">
                            Closed
                          </span>
                        )}
                        {room.unread_count > 0 && (
                          <span className="bg-red-500 text-white text-xs rounded-full px-2 py-1 font-bold">
                            {room.unread_count}
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 mb-1 truncate">{room.clients?.email}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">
                        {formatRelativeTime(room.last_message_at)}
                      </span>
                      {room.unread_count > 0 ? (
                        <FaClock className="text-orange-500 text-xs" />
                      ) : isOpen ? (
                        <FaCheckCircle className="text-green-500 text-xs" />
                      ) : (
                        <FaArchive className="text-gray-400 text-xs" />
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>

      <div className="md:col-span-2">
        {selectedRoom ? (
          <div className="bg-white rounded-lg shadow h-full flex flex-col">
            <div className="p-4 border-b border-gray-200 bg-purple-50">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h3 className="font-bold text-gray-900 flex items-center gap-2 flex-wrap">
                    {selectedRoom.clients?.name ||
                      selectedRoom.clients?.email?.split('@')[0] ||
                      'Client'}
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        clientOnline
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-200 text-gray-600'
                      }`}
                    >
                      {clientOnline ? 'Online' : 'Offline'}
                    </span>
                  </h3>
                  <p className="text-sm text-gray-600">{selectedRoom.clients?.email}</p>
                  {selectedRoom.clients?.phone && (
                    <p className="text-sm text-gray-600">Phone: {selectedRoom.clients.phone}</p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    Thread: {selectedRoom.room_name}
                    {isClosed ? ' · Closed' : ' · Open'}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={roomBusy || isClosed}
                    onClick={() => void closeConversation()}
                    className="text-xs px-3 py-1.5 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-50"
                  >
                    Close conversation
                  </button>
                  <button
                    type="button"
                    disabled={roomBusy}
                    onClick={() => void startNewForClient()}
                    className="text-xs px-3 py-1.5 rounded-lg bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50"
                  >
                    New conversation
                  </button>
                </div>
              </div>
            </div>
            <div className="flex-1 overflow-hidden">
              <div className="h-full flex flex-col">
                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
                  {messages.length === 0 ? (
                    <div className="text-center text-gray-500 py-8">
                      <FaComments className="text-4xl mx-auto mb-2 opacity-50" />
                      <p>
                        {isClosed
                          ? 'Conversation closed. Start a new one to continue.'
                          : 'No messages yet. Use quick replies below or wait for the client.'}
                      </p>
                    </div>
                  ) : (
                    messages.map((message, index) => {
                      const isAdminMessage = message.user.id === currentUserId
                      const showHeader =
                        index === 0 ||
                        messages[index - 1].user.id !== message.user.id ||
                        new Date(message.createdAt).getTime() -
                          new Date(messages[index - 1].createdAt).getTime() >
                          300000

                      return (
                        <div
                          key={message.id}
                          className={`flex ${isAdminMessage ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-[75%] w-fit flex flex-col gap-1 ${isAdminMessage ? 'items-end' : 'items-start'}`}
                          >
                            {showHeader && (
                              <div
                                className={`flex items-center gap-2 text-xs px-3 ${isAdminMessage ? 'justify-end flex-row-reverse' : ''}`}
                              >
                                <span className="font-bold text-gray-900">
                                  {message.user.name}
                                </span>
                                <span className="text-gray-600 text-xs">
                                  {formatTime(message.createdAt)}
                                </span>
                              </div>
                            )}
                            <div
                              className={`py-2 px-3 rounded-xl text-sm w-fit relative ${
                                isAdminMessage
                                  ? 'bg-purple-600 text-white'
                                  : 'bg-white text-gray-900 border border-gray-200'
                              }`}
                            >
                              <p className="whitespace-pre-wrap">{message.content}</p>
                            </div>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>

                <div className="border-t border-gray-200 p-4 bg-white">
                  <ChatInput
                    chatRoomId={selectedRoom.id}
                    quickReplies={quickReplies}
                    disabled={isClosed || roomBusy}
                    onMessageSent={() => {
                      void loadMessages(selectedRoom.id)
                      void loadChatRooms()
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow h-full flex items-center justify-center">
            <div className="text-center text-gray-500">
              <FaComments className="text-6xl mx-auto mb-4 opacity-50" />
              <p className="text-lg font-semibold">Select a conversation to start</p>
              <p className="text-sm mt-2">Close long threads or start fresh when needed</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
