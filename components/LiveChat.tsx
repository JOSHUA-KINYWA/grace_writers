'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { FaComments, FaTimes, FaPaperPlane, FaUser } from 'react-icons/fa'
import { formatTime } from '@/lib/utils/formatDate'
import { scrollContainerToBottom } from '@/lib/utils/scroll-container'

export default function LiveChat() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Array<{ id: string; text: string; sender: 'user' | 'admin'; timestamp: Date }>>([])
  const [inputMessage, setInputMessage] = useState('')
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  useEffect(() => {
    checkUser()
    loadMessages()
    
    // Set up real-time subscription
    const channel = supabase
      .channel('live-chat')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'messages' },
        (payload) => {
          if (payload.new) {
            loadMessages()
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  useEffect(() => {
    if (isOpen) scrollToBottom()
  }, [messages, isOpen])

  async function checkUser() {
    const { data: { user } } = await supabase.auth.getUser()
    setUser(user)
  }

  async function loadMessages() {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .order('inserted_at', { ascending: true })
        .limit(50)

      if (error) throw error

      if (data) {
        const formattedMessages = data.map((msg: any) => ({
          id: msg.id.toString(),
          text: msg.message || '',
          sender: msg.user_id === user?.id ? 'user' : 'admin',
          timestamp: new Date(msg.inserted_at)
        }))
        setMessages(formattedMessages)
      }
    } catch (error) {
      console.error('Error loading messages:', error)
    }
  }

  async function sendMessage() {
    if (!inputMessage.trim() || !user) return

    setLoading(true)
    try {
      // Get or create channel
      let { data: channelData } = await supabase
        .from('channels')
        .select('id')
        .eq('slug', `chat-${user.id}`)
        .single()

      if (!channelData) {
        const { data: newChannel } = await supabase
          .from('channels')
          .insert({ slug: `chat-${user.id}` })
          .select()
          .single()
        channelData = newChannel
      }

      // Send message
      const { error } = await supabase
        .from('messages')
        .insert({
          message: inputMessage,
          channel_id: channelData.id,
          user_id: user.id
        })

      if (error) throw error

      setInputMessage('')
      loadMessages()
    } catch (error: any) {
      alert(`Error sending message: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  function scrollToBottom() {
    scrollContainerToBottom(messagesContainerRef.current, 'smooth')
  }

  if (!user) {
    return null // Don't show chat if user is not logged in
  }

  return (
    <>
      {/* Chat Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-6 left-6 bg-purple-600 text-white p-4 rounded-full shadow-2xl z-50 hover:bg-purple-700 transition-all ${
          isOpen ? 'hidden' : 'block'
        }`}
        aria-label="Open chat"
      >
        <FaComments className="text-2xl" />
        {messages.filter(m => m.sender === 'admin' && m.timestamp > new Date(Date.now() - 60000)).length > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center">
            {messages.filter(m => m.sender === 'admin' && m.timestamp > new Date(Date.now() - 60000)).length}
          </span>
        )}
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-6 left-6 w-96 h-[600px] bg-white rounded-lg shadow-2xl z-50 flex flex-col border border-gray-200">
          {/* Chat Header */}
          <div className="bg-purple-600 text-white p-4 rounded-t-lg flex justify-between items-center">
            <div className="flex items-center gap-2">
              <FaComments />
              <span className="font-semibold">Live Chat Support</span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="hover:bg-purple-700 rounded p-1 transition"
            >
              <FaTimes />
            </button>
          </div>

          {/* Messages Area */}
          <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
            {messages.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                <FaComments className="text-4xl mx-auto mb-2 opacity-50" />
                <p>Start a conversation!</p>
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg p-3 ${
                      message.sender === 'user'
                        ? 'bg-purple-600 text-white'
                        : 'bg-white text-gray-900 border border-gray-200'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <FaUser className="text-xs" />
                      <span className="text-xs opacity-75">
                        {message.sender === 'user' ? 'You' : 'Admin'}
                      </span>
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{message.text}</p>
                    <span className="text-xs opacity-50 mt-1 block">
                      {formatTime(message.timestamp)}
                    </span>
                  </div>
                </div>
              ))
            )}
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
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900"
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
        </div>
      )}
    </>
  )
}
