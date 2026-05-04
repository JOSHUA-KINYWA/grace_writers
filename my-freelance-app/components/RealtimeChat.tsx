'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { FaComments, FaTimes, FaPaperPlane, FaMinus, FaWindowMaximize } from 'react-icons/fa'
import { formatTime } from '@/lib/utils/formatDate'

interface ChatMessage {
  id: string
  content: string
  user: {
    name: string
    id?: string
  }
  createdAt: string
  replied?: boolean
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
  roomName = 'support-chat',
  username,
  onMessage,
  messages: initialMessages = [],
  isAdmin = false,
  clientId
}: RealtimeChatProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages)
  const [inputMessage, setInputMessage] = useState('')
  const [user, setUser] = useState<any>(null)
  const [userName, setUserName] = useState('')
  const [loading, setLoading] = useState(false)
  const [chatRoomId, setChatRoomId] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const channelRef = useRef<any>(null)
  const supabase = createClient()
  const processedMessageIds = useRef<Set<string>>(new Set())

  useEffect(() => {
    checkUser()
    
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
      }
    }
  }, [roomName])

  useEffect(() => {
    if (user) {
      loadStoredMessages()
      setupRealtime()
    }
  }, [user, chatRoomId, roomName])

  useEffect(() => {
    if (!isMinimized) {
      scrollToBottom()
    }
  }, [messages, isMinimized])

  useEffect(() => {
    if (!isOpen) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }
    globalThis.addEventListener('keydown', onKeyDown)
    return () => globalThis.removeEventListener('keydown', onKeyDown)
  }, [isOpen])

  async function checkUser() {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      setUser(user)
      const name = username || user.user_metadata?.name || user.email?.split('@')[0] || 'User'
      setUserName(name)
      
      // Get or create chat room
      await getOrCreateChatRoom(user.id, name)
    }
  }

  async function getOrCreateChatRoom(userId: string, name: string) {
    try {
      if (!user?.email) return

      // Get client record
      let { data: client } = await supabase
        .from('clients')
        .select('id')
        .eq('email', user.email)
        .single()

      if (!client && !isAdmin) {
        // Create client if doesn't exist
        const { data: newClient, error: clientError } = await supabase
          .from('clients')
          .insert({
            email: user.email,
            name: name
          })
          .select()
          .single()
        
        if (clientError) {
          console.error('Error creating client:', clientError)
          return
        }
        
        client = newClient
      }

      if (client) {
        const roomName = `chat-${client.id}`
        let { data: room } = await supabase
          .from('chat_rooms')
          .select('id')
          .eq('room_name', roomName)
          .single()
        
        if (!room) {
          const { data: newRoom, error: roomError } = await supabase
            .from('chat_rooms')
            .insert({
              client_id: client.id,
              room_name: roomName
            })
            .select()
            .single()
          
          if (roomError) {
            console.error('Error creating chat room:', roomError)
            return
          }
          
          room = newRoom
        }
        
        if (room) {
          setChatRoomId(room.id)
          // Reload messages after room is set
          setTimeout(() => loadStoredMessages(), 200)
        }
      }
    } catch (error) {
      console.error('Error creating chat room:', error)
    }
  }

  async function loadStoredMessages() {
    if (initialMessages.length > 0 && messages.length === 0) {
      setMessages(initialMessages)
      processedMessageIds.current = new Set(initialMessages.map(m => m.id))
      return
    }
    
    if (initialMessages.length > 0) {
      // Don't reload if we already have initial messages
      return
    }

    // Load messages from database
    try {
      let query = supabase
        .from('messages')
        .select('*')
        .order('inserted_at', { ascending: true })
        .limit(50)

      if (chatRoomId) {
        query = query.eq('chat_room_id', chatRoomId)
      }

      const { data, error } = await query
      
      // Get user info from clients table (not users table)
      const userIds = [...new Set(data?.map((m: any) => m.user_id) || [])] as string[]
      const userMap: Record<string, string> = {}
      
      if (userIds.length > 0) {
        // Try to get names from clients table first
        const { data: clientsData } = await supabase
          .from('clients')
          .select('id, email, name')
          .in('id', userIds)
        
        if (clientsData) {
          clientsData.forEach((client: any) => {
            userMap[client.id] = client.name || client.email?.split('@')[0] || 'User'
          })
        }
        
        // For any remaining user IDs, use default
        userIds.forEach((userId) => {
          if (!userMap[userId]) {
            userMap[userId] = 'User'
          }
        })
      }

      if (!error && data) {
        const formattedMessages: ChatMessage[] = data.map((msg: any, index: number) => ({
          id: `${msg.id}-${msg.inserted_at}-${index}`,
          content: msg.message || '',
          user: {
            name: userMap[msg.user_id] || 'User',
            id: msg.user_id
          },
          createdAt: msg.inserted_at,
          replied: msg.replied || false
        }))
        setMessages(formattedMessages)
        processedMessageIds.current = new Set(formattedMessages.map(m => m.id))
      }
    } catch (error) {
      console.error('Error loading messages:', error)
    }
  }

  function setupRealtime() {
    // Remove existing channel if any
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
    }

    // Create broadcast channel for real-time messaging
    const channel = supabase.channel(`chat:${roomName}`, {
      config: {
        broadcast: { self: true }
      }
    })

    // Listen for broadcast messages
    channel.on('broadcast', { event: 'message' }, (payload) => {
      const newMessage: ChatMessage = payload.payload as ChatMessage
      
      // Avoid duplicates - check both ID and content+timestamp
      const isDuplicate = processedMessageIds.current.has(newMessage.id) ||
        messages.some(m => 
          m.content === newMessage.content && 
          Math.abs(new Date(m.createdAt).getTime() - new Date(newMessage.createdAt).getTime()) < 1000
        )

      if (isDuplicate) {
        return
      }

      processedMessageIds.current.add(newMessage.id)
      
      setMessages((prev) => {
        // Double check for duplicates
        if (prev.some(m => 
          m.id === newMessage.id || 
          (m.content === newMessage.content && 
           Math.abs(new Date(m.createdAt).getTime() - new Date(newMessage.createdAt).getTime()) < 1000)
        )) {
          return prev
        }
        const updated = [...prev, newMessage]
        if (onMessage) {
          onMessage(updated)
        }
        return updated
      })
    })

    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log('Connected to chat channel')
      }
    })

    channelRef.current = channel
  }

  async function sendMessage() {
    if (!inputMessage.trim() || !user || !userName) return

    setLoading(true)
    try {
      const messageId = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}-${user.id}`
      const newMessage: ChatMessage = {
        id: messageId,
        content: inputMessage.trim(),
        user: {
          name: userName,
          id: user.id
        },
        createdAt: new Date().toISOString(),
        replied: false
      }

      processedMessageIds.current.add(messageId)

      // Store message in database first
      let dbMessageId: string | null = null
      try {
        if (!chatRoomId) {
          await getOrCreateChatRoom(user.id, userName)
          await new Promise(resolve => setTimeout(resolve, 300))
        }

        // Get or create channel
        let { data: channelData } = await supabase
          .from('channels')
          .select('id')
          .eq('slug', roomName)
          .single()

        if (!channelData) {
          const { data: newChannel } = await supabase
            .from('channels')
            .insert({ slug: roomName })
            .select()
            .single()
          channelData = newChannel
        }

        if (channelData) {
          const { data: insertedMessage, error: insertError } = await supabase
            .from('messages')
            .insert({
              message: newMessage.content,
              channel_id: channelData.id,
              user_id: user.id,
              chat_room_id: chatRoomId,
              replied: false
            })
            .select('id')
            .single()

          if (!insertError && insertedMessage) {
            dbMessageId = insertedMessage.id
            // Update message ID with DB ID for consistency
            newMessage.id = `${dbMessageId}-${Date.now()}-${user.id}`
          }
        }
      } catch (dbError) {
        console.error('Error storing message:', dbError)
      }

      // Add to local state immediately (optimistic update)
      processedMessageIds.current.add(newMessage.id)
      setMessages((prev) => {
        if (prev.some(m => m.id === newMessage.id)) {
          return prev
        }
        const updated = [...prev, newMessage]
        if (onMessage) {
          onMessage(updated)
        }
        return updated
      })

      // Broadcast message to all connected clients (including self)
      const channel = channelRef.current
      if (channel) {
        await channel.send({
          type: 'broadcast',
          event: 'message',
          payload: newMessage
        })
      }

      setInputMessage('')
    } catch (error: any) {
      console.error('Error sending message:', error)
      alert(`Error sending message: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  async function markAsReplied(messageId: string) {
    if (!isAdmin) return
    
    try {
      await supabase
        .from('messages')
        .update({ 
          replied: true,
          replied_at: new Date().toISOString()
        })
        .eq('id', messageId.split('-')[0]) // Extract DB ID from composite key

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId ? { ...msg, replied: true } : msg
        )
      )
    } catch (error) {
      console.error('Error marking as replied:', error)
    }
  }

  function scrollToBottom() {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  if (!user) {
    return null // Don't show chat if user is not logged in
  }

  const unreadCount = messages.filter(m => 
    m.user.name !== userName && 
    !m.replied &&
    new Date(m.createdAt) > new Date(Date.now() - 60000)
  ).length

  // If embedded (has initialMessages and isAdmin), always show chat window without floating button
  const isEmbedded = isAdmin && initialMessages && initialMessages.length > 0
  const shouldShowFloatingButton = !isEmbedded && user

  return (
    <>
      {/* Chat Toggle Button - Only show if not embedded and user is logged in */}
      {shouldShowFloatingButton && (
        <button
          onClick={() => {
            setIsOpen(!isOpen)
            setIsMinimized(false)
          }}
          className={`fixed bottom-6 right-6 bg-purple-600 text-white p-4 rounded-full shadow-2xl z-[999] hover:bg-purple-700 transition-all ${
            isOpen ? 'hidden' : 'block'
          }`}
          aria-label="Open chat"
        >
          <FaComments className="text-2xl" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center font-bold">
              {unreadCount}
            </span>
          )}
        </button>
      )}

      {/* Chat Window */}
      {(isOpen || isEmbedded) && (
        <>
          {!isEmbedded && isOpen && !isMinimized && (
            <button
              type="button"
              aria-label="Close chat backdrop"
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 z-[997] bg-black/20 sm:bg-black/10"
            />
          )}
          <div className={`${isEmbedded ? 'relative w-full h-full' : `fixed bottom-4 right-3 sm:right-6 z-[998] ${isMinimized ? 'w-[310px]' : 'w-[min(96vw,390px)] h-[min(72vh,620px)]'}`} bg-white rounded-xl shadow-2xl flex flex-col border border-gray-200 transition-all`}>
          {/* Chat Header */}
          <div className="bg-purple-600 text-white p-4 rounded-t-lg flex justify-between items-center">
            <div className="flex items-center gap-2">
              <FaComments />
              <span className="font-semibold">Live Chat Support</span>
            </div>
            <div className="flex items-center gap-2">
              {!isEmbedded && (
                <button
                  onClick={() => setIsMinimized(!isMinimized)}
                  className="hover:bg-purple-700 rounded p-1 transition"
                  aria-label={isMinimized ? 'Maximize' : 'Minimize'}
                >
                  {isMinimized ? <FaWindowMaximize /> : <FaMinus />}
                </button>
              )}
              {!isEmbedded && (
                <button
                  onClick={() => setIsOpen(false)}
                  className="hover:bg-purple-700 rounded p-1 transition"
                  aria-label="Close chat"
                  title="Close chat"
                >
                  <FaTimes />
                </button>
              )}
            </div>
          </div>

          {!isMinimized && (
            <>
              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
                {messages.length === 0 ? (
                  <div className="text-center text-gray-700 py-8">
                    <FaComments className="text-4xl mx-auto mb-2 opacity-50 text-gray-600" />
                    <p className="font-medium">Start a conversation!</p>
                  </div>
                ) : (
                  messages.map((message, index) => {
                    const isOwnMessage = message.user.name === userName || message.user.id === user.id
                    const showHeader = index === 0 || 
                      messages[index - 1].user.id !== message.user.id ||
                      new Date(message.createdAt).getTime() - new Date(messages[index - 1].createdAt).getTime() > 300000 // 5 minutes

                    // Ensure unique key
                    const uniqueKey = `${message.id}-${index}-${message.createdAt}`

                    return (
                      <div
                        key={uniqueKey}
                        className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className={`max-w-[75%] w-fit flex flex-col gap-1 ${isOwnMessage ? 'items-end' : 'items-start'}`}>
                          {showHeader && (
                            <div className={`flex items-center gap-2 text-xs px-3 ${isOwnMessage ? 'justify-end flex-row-reverse' : ''}`}>
                              <span className="font-bold text-gray-900">{message.user.name}</span>
                              <span className="text-gray-600 text-xs">
                                {formatTime(message.createdAt)}
                              </span>
                            </div>
                          )}
                          <div
                            className={`py-2 px-3 rounded-xl text-sm w-fit relative ${
                              isOwnMessage
                                ? 'bg-purple-600 text-white'
                                : 'bg-white text-gray-900 border border-gray-200'
                            }`}
                          >
                            <p className="whitespace-pre-wrap">{message.content}</p>
                            {isAdmin && !isOwnMessage && !message.replied && (
                              <button
                                onClick={() => markAsReplied(message.id)}
                                className="absolute -bottom-6 left-0 text-xs text-purple-600 hover:text-purple-700 font-semibold"
                              >
                                Mark as replied
                              </button>
                            )}
                            {message.replied && (
                              <span className="absolute -bottom-6 left-0 text-xs text-green-600 font-semibold">
                                ✓ Replied
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <div className="border-t border-gray-200 p-4 bg-white">
                <form
                  onSubmit={(e) => {
                    e.preventDefault()
                    sendMessage()
                  }}
                  className="flex gap-2"
                >
                  <input
                    type="text"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    placeholder="Type your message..."
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 font-medium"
                    disabled={loading}
                  />
                  <button
                    type="submit"
                    disabled={loading || !inputMessage.trim()}
                    className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <FaPaperPlane />
                  </button>
                </form>
              </div>
            </>
          )}
        </div>
        </>
      )}
    </>
  )
}
