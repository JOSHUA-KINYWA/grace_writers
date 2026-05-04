'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { FaComments, FaUser, FaCheckCircle, FaClock } from 'react-icons/fa'
import ChatInput from './ChatInput'
import { formatDate, formatTime } from '@/lib/utils/formatDate'

interface ChatRoom {
  id: string
  room_name: string
  client_id: string
  last_message_at: string
  unread_count: number
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

export default function AdminChatView({ initialChatRooms }: AdminChatViewProps) {
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>(initialChatRooms)
  const [selectedRoom, setSelectedRoom] = useState<ChatRoom | null>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const supabase = createClient()

  const loadChatRooms = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('chat_rooms')
        .select(`
          *,
          clients:client_id (id, name, email, phone)
        `)
        .order('last_message_at', { ascending: false })

      if (!error && data) {
        const roomsWithCounts = await Promise.all(
          data.map(async (room: any) => {
            const { count } = await supabase
              .from('messages')
              .select('*', { count: 'exact', head: true })
              .eq('chat_room_id', room.id)
              .eq('replied', false)

            return { ...room, unread_count: count || 0 }
          })
        )
        setChatRooms(roomsWithCounts)
      }
    } catch (error) {
      console.error('Error loading chat rooms:', error)
    }
  }, [supabase])

  const loadMessages = useCallback(async (roomId: string) => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('chat_room_id', roomId)
        .order('inserted_at', { ascending: true })

      if (!error && data) {
        const userIds = [...new Set(data.map((m: any) => m.user_id))]
        const userMap: Record<string, string> = {}

        if (userIds.length > 0) {
          const { data: clientsData } = await supabase
            .from('clients')
            .select('id, email, name')
            .in('id', userIds)

          if (clientsData) {
            clientsData.forEach((client: any) => {
              userMap[client.id] = client.name || client.email?.split('@')[0] || 'User'
            })
          }
        }

        const formattedMessages = data.map((msg: any) => ({
          id: `${msg.id}-${msg.inserted_at}`,
          content: msg.message || '',
          user: {
            name: userMap[msg.user_id] || 'User',
            id: msg.user_id,
          },
          createdAt: msg.inserted_at,
          replied: msg.replied || false,
        }))
        setMessages(formattedMessages)
      }
    } catch (error) {
      console.error('Error loading messages:', error)
    }
  }, [supabase])

  useEffect(() => {
    // Get current admin user ID
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setCurrentUserId(user.id)
      }
    })
  }, [])

  useEffect(() => {
    // Set up real-time subscription for chat rooms
    const channel = supabase
      .channel('admin-chat-rooms')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'chat_rooms' },
        () => {
          loadChatRooms()
        }
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'messages' },
        () => {
          if (selectedRoom) {
            loadMessages(selectedRoom.id)
          }
          loadChatRooms()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [selectedRoom, loadChatRooms, loadMessages, supabase])

  function handleSelectRoom(room: ChatRoom) {
    setSelectedRoom(room)
    loadMessages(room.id)
  }

  function formatDate(dateString: string) {
    const date = new Date(dateString)
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

  return (
    <div className="grid md:grid-cols-3 gap-6 h-[calc(100vh-200px)]">
      {/* Chat Rooms List */}
      <div className="bg-white rounded-lg shadow overflow-hidden flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-900">Client Conversations</h2>
          <p className="text-sm text-gray-600 mt-1">
            {chatRooms.filter(r => r.unread_count > 0).length} unread
          </p>
        </div>
        <div className="flex-1 overflow-y-auto">
          {chatRooms.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <FaComments className="text-4xl mx-auto mb-2 opacity-50" />
              <p>No conversations yet</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {chatRooms.map((room) => (
                <button
                  key={room.id}
                  onClick={() => handleSelectRoom(room)}
                  className={`w-full text-left p-4 hover:bg-gray-50 transition ${
                    selectedRoom?.id === room.id ? 'bg-purple-50 border-l-4 border-purple-600' : ''
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <FaUser className="text-purple-600" />
                      <span className="font-semibold text-gray-900">
                        {room.clients?.name || room.clients?.email?.split('@')[0] || 'Client'}
                      </span>
                    </div>
                    {room.unread_count > 0 && (
                      <span className="bg-red-500 text-white text-xs rounded-full px-2 py-1 font-bold">
                        {room.unread_count}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mb-1">{room.clients?.email}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">
                      {formatDate(room.last_message_at)}
                    </span>
                    {room.unread_count > 0 ? (
                      <FaClock className="text-orange-500 text-xs" />
                    ) : (
                      <FaCheckCircle className="text-green-500 text-xs" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Chat Window */}
      <div className="md:col-span-2">
        {selectedRoom ? (
          <div className="bg-white rounded-lg shadow h-full flex flex-col">
            <div className="p-4 border-b border-gray-200 bg-purple-50">
              <h3 className="font-bold text-gray-900">
                {selectedRoom.clients?.name || selectedRoom.clients?.email?.split('@')[0] || 'Client'}
              </h3>
              <p className="text-sm text-gray-600">{selectedRoom.clients?.email}</p>
              {selectedRoom.clients?.phone && (
                <p className="text-sm text-gray-600">Phone: {selectedRoom.clients.phone}</p>
              )}
            </div>
            <div className="flex-1 overflow-hidden">
              <div className="h-full flex flex-col">
                {/* Messages Display */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
                  {messages.length === 0 ? (
                    <div className="text-center text-gray-500 py-8">
                      <FaComments className="text-4xl mx-auto mb-2 opacity-50" />
                      <p>No messages yet. Start the conversation!</p>
                    </div>
                  ) : (
                    messages.map((message, index) => {
                      const isAdminMessage = message.user.id === currentUserId
                      const showHeader = index === 0 || 
                        messages[index - 1].user.id !== message.user.id ||
                        new Date(message.createdAt).getTime() - new Date(messages[index - 1].createdAt).getTime() > 300000

                      return (
                        <div
                          key={message.id}
                          className={`flex ${isAdminMessage ? 'justify-end' : 'justify-start'}`}
                        >
                          <div className={`max-w-[75%] w-fit flex flex-col gap-1 ${isAdminMessage ? 'items-end' : 'items-start'}`}>
                            {showHeader && (
                              <div className={`flex items-center gap-2 text-xs px-3 ${isAdminMessage ? 'justify-end flex-row-reverse' : ''}`}>
                                <span className="font-bold text-gray-900">{message.user.name}</span>
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
                              {!isAdminMessage && !message.replied && (
                                <button
                                  onClick={async () => {
                                    try {
                                      await supabase
                                        .from('messages')
                                        .update({ 
                                          replied: true,
                                          replied_at: new Date().toISOString()
                                        })
                                        .eq('id', message.id.split('-')[0])

                                      setMessages((prev) =>
                                        prev.map((msg) =>
                                          msg.id === message.id ? { ...msg, replied: true } : msg
                                        )
                                      )
                                    } catch (error) {
                                      console.error('Error marking as replied:', error)
                                    }
                                  }}
                                  className="absolute -bottom-6 left-0 text-xs text-purple-600 hover:text-purple-700 font-semibold"
                                >
                                  Mark as replied
                                </button>
                              )}
                              {message.replied && (
                                <span className="absolute -bottom-6 left-0 text-xs text-green-600 font-semibold flex items-center gap-1">
                                  <FaCheckCircle /> Replied
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>

                {/* Input Area */}
                <div className="border-t border-gray-200 p-4 bg-white">
                  <ChatInput
                    roomName={selectedRoom.room_name}
                    onMessageSent={() => {
                      loadMessages(selectedRoom.id)
                      loadChatRooms()
                    }}
                    isAdmin={true}
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
              <p className="text-sm mt-2">Choose a client from the list to view messages</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
