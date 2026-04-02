'use client'

import { useState, useRef, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { FaPaperPlane } from 'react-icons/fa'

interface ChatInputProps {
  roomName: string
  onMessageSent: () => void
  isAdmin?: boolean
}

export default function ChatInput({ roomName, onMessageSent, isAdmin = false }: ChatInputProps) {
  const [inputMessage, setInputMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [userName, setUserName] = useState('')
  const supabase = createClient()
  const channelRef = useRef<any>(null)

  useEffect(() => {
    checkUser()
    setupRealtime()
    
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
      }
    }
  }, [roomName])

  async function checkUser() {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      setUser(user)
      const name = isAdmin ? 'Admin' : (user.user_metadata?.name || user.email?.split('@')[0] || 'User')
      setUserName(name)
    }
  }

  function setupRealtime() {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
    }

    const channel = supabase.channel(`chat:${roomName}`, {
      config: {
        broadcast: { self: true }
      }
    })

    channel.subscribe()
    channelRef.current = channel
  }

  async function sendMessage() {
    if (!inputMessage.trim() || !user || !userName) return

    setLoading(true)
    try {
      const messageId = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}-${user.id}`
      const newMessage = {
        id: messageId,
        content: inputMessage.trim(),
        user: {
          name: userName,
          id: user.id
        },
        createdAt: new Date().toISOString(),
        replied: false
      }

      // Store message in database
      try {
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

        // Get chat room
        const { data: chatRoom } = await supabase
          .from('chat_rooms')
          .select('id')
          .eq('room_name', roomName)
          .single()

        if (channelData) {
          await supabase
            .from('messages')
            .insert({
              message: newMessage.content,
              channel_id: channelData.id,
              user_id: user.id,
              chat_room_id: chatRoom?.id || null,
              replied: false
            })

          // Update chat room last message time
          if (chatRoom) {
            await supabase
              .from('chat_rooms')
              .update({ last_message_at: new Date().toISOString() })
              .eq('id', chatRoom.id)
          }
        }
      } catch (dbError) {
        console.error('Error storing message:', dbError)
      }

      // Broadcast message
      const channel = channelRef.current
      if (channel) {
        await channel.send({
          type: 'broadcast',
          event: 'message',
          payload: newMessage
        })
      }

      setInputMessage('')
      onMessageSent()
    } catch (error: any) {
      console.error('Error sending message:', error)
      alert(`Error sending message: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  if (!user) {
    return null
  }

  return (
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
  )
}
