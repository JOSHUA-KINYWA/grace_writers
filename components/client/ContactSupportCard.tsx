'use client'

import Link from 'next/link'
import { FaComments, FaHeadset } from 'react-icons/fa'

export default function ContactSupportCard({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={`rounded-xl border border-orange-200 bg-gradient-to-br from-orange-50 to-amber-50 shadow-sm ${
        compact ? 'p-4' : 'p-5'
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-orange-500 text-white">
          <FaHeadset size={18} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-orange-800">Need help?</p>
          <h3 className="text-base font-bold text-slate-900 mt-0.5">Contact our team</h3>
          <p className="text-sm text-slate-600 mt-1">
            Message us about an order or open live chat for urgent questions.
          </p>
          <div className={`mt-3 flex flex-col ${compact ? 'gap-2' : 'sm:flex-row gap-2'}`}>
            <Link
              href="/dashboard/messages"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-purple-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-purple-700 transition"
            >
              <FaComments />
              Order messages
            </Link>
            <span className="inline-flex items-center justify-center gap-2 rounded-lg border border-orange-300 bg-white px-4 py-2.5 text-sm font-semibold text-orange-900">
              Use the live chat button (bottom-right) for urgent help
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
