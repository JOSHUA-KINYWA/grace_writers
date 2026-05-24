'use client'

import { useState, useRef } from 'react'
import { FaPaperPlane } from 'react-icons/fa'

export interface QuickReplyChip {
  id: string
  title: string
  content: string
}

interface ChatInputProps {
  chatRoomId: string
  onMessageSent: () => void
  quickReplies?: QuickReplyChip[]
  disabled?: boolean
}

export default function ChatInput({
  chatRoomId,
  onMessageSent,
  quickReplies = [],
  disabled = false,
}: ChatInputProps) {
  const [inputMessage, setInputMessage] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState('')
  const sendingRef = useRef(false)

  async function sendMessage(textOverride?: string) {
    if (sendingRef.current || disabled) return
    const text = (textOverride ?? inputMessage).trim()
    if (!text || !chatRoomId) return

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
      onMessageSent()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to send')
      setInputMessage(text)
    } finally {
      sendingRef.current = false
      setIsSending(false)
    }
  }

  return (
    <div>
      {quickReplies.length > 0 && (
        <div className="mb-3">
          <p className="text-xs text-gray-600 mb-2 font-medium">Quick replies:</p>
          <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto">
            {quickReplies.map((q) => (
              <button
                key={q.id}
                type="button"
                disabled={disabled || isSending}
                onClick={() => void sendMessage(q.content)}
                className="text-xs px-2.5 py-1 rounded-full border border-purple-200 bg-purple-50 text-purple-800 hover:bg-purple-100 disabled:opacity-50"
                title={q.content}
              >
                {q.title}
              </button>
            ))}
          </div>
        </div>
      )}
      {error && <p className="text-xs text-red-600 mb-2">{error}</p>}
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
          onChange={(e) => setInputMessage(e.target.value)}
          placeholder="Type your reply..."
          disabled={disabled}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-900 disabled:bg-gray-100"
        />
        <button
          type="submit"
          disabled={disabled || isSending || !inputMessage.trim()}
          className="bg-purple-600 text-white px-4 py-2 rounded-lg disabled:opacity-50"
        >
          <FaPaperPlane />
        </button>
      </form>
    </div>
  )
}
