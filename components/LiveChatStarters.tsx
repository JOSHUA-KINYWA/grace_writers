'use client'

import type { LiveChatStarter } from '@/lib/live-chat/starters'

interface LiveChatStartersProps {
  starters: LiveChatStarter[]
  onPick: (starter: LiveChatStarter) => void
  disabled?: boolean
}

export default function LiveChatStarters({
  starters,
  onPick,
  disabled = false,
}: LiveChatStartersProps) {
  if (starters.length === 0) return null

  return (
    <div className="px-1 pb-2">
      <p className="text-xs text-gray-600 mb-2 font-medium">Common topics — tap to ask our team:</p>
      <div className="flex flex-col gap-2">
        {starters.map((s) => (
          <button
            key={s.id}
            type="button"
            disabled={disabled}
            onClick={() => onPick(s)}
            className="text-left text-xs px-3 py-2 rounded-lg border border-purple-200 bg-white hover:bg-purple-50 hover:border-purple-300 transition disabled:opacity-50"
          >
            <span className="font-semibold text-purple-800">{s.label}</span>
            <span className="block text-gray-600 mt-1 leading-snug">{s.answer}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
