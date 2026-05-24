'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { FaCircle, FaTimes } from 'react-icons/fa'

interface OnlineClient {
  id: string
  name: string
}

export default function AdminOnlineAlerts() {
  const prevOnlineIdsRef = useRef<Set<string>>(new Set())
  const initializedRef = useRef(false)
  const [popups, setPopups] = useState<OnlineClient[]>([])
  const [onlineNow, setOnlineNow] = useState<OnlineClient[]>([])

  useEffect(() => {
    let active = true

    async function poll() {
      try {
        const res = await fetch('/api/admin/clients-online', { cache: 'no-store' })
        if (!res.ok || !active) return
        const data = await res.json()
        const current: OnlineClient[] = data.onlineClients || []
        setOnlineNow(current)

        const currentIds = new Set(current.map((c) => c.id))

        if (!initializedRef.current) {
          initializedRef.current = true
          prevOnlineIdsRef.current = currentIds
          return
        }

        const newlyOnline = current.filter((c) => !prevOnlineIdsRef.current.has(c.id))
        prevOnlineIdsRef.current = currentIds

        if (newlyOnline.length > 0) {
          setPopups((prev) => {
            const merged = [...newlyOnline, ...prev]
            const seen = new Set<string>()
            return merged.filter((c) => {
              if (seen.has(c.id)) return false
              seen.add(c.id)
              return true
            }).slice(0, 3)
          })

          newlyOnline.forEach((client) => {
            setTimeout(() => {
              setPopups((prev) => prev.filter((p) => p.id !== client.id))
            }, 10000)
          })
        }
      } catch {
        // ignore
      }
    }

    poll()
    const interval = setInterval(poll, 8000)
    return () => {
      active = false
      clearInterval(interval)
    }
  }, [])

  return (
    <>
      {onlineNow.length > 0 && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[105] hidden md:flex items-center gap-2 bg-green-600 text-white text-sm font-semibold px-4 py-2 rounded-full shadow-lg">
          <FaCircle size={8} className="text-green-200" />
          {onlineNow.length} client{onlineNow.length === 1 ? '' : 's'} online
          <span className="text-green-100 font-normal truncate max-w-[240px]">
            — {onlineNow.map((c) => c.name).join(', ')}
          </span>
        </div>
      )}

      {popups.length > 0 && (
        <div className="fixed top-24 right-4 z-[110] flex flex-col gap-2 w-[min(100vw-2rem,320px)]">
          {popups.map((alert) => (
            <div
              key={alert.id}
              className="bg-white border-2 border-green-400 shadow-xl rounded-xl p-4 flex items-start gap-3"
            >
              <FaCircle className="text-green-500 mt-1 shrink-0 animate-pulse" size={10} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-slate-900">{alert.name} is online now</p>
                <p className="text-xs text-slate-600 mt-0.5">Client just became active</p>
                <Link
                  href={`/admin/clients/${alert.id}`}
                  className="text-xs font-semibold text-green-700 hover:text-green-900 mt-2 inline-block"
                >
                  View client →
                </Link>
              </div>
              <button
                type="button"
                onClick={() => setPopups((prev) => prev.filter((a) => a.id !== alert.id))}
                className="text-slate-400 hover:text-slate-600"
                aria-label="Dismiss"
              >
                <FaTimes size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
    </>
  )
}
