"use client"

import { useEffect, useMemo, useState } from "react"

type Result =
  | { ok: true; status: number; bodyPreview: string }
  | { ok: false; error: string }

export default function SupabaseDebugPage() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

  const healthUrl = useMemo(() => {
    if (!url) return null
    return `${url.replace(/\/+$/, "")}/auth/v1/health`
  }, [url])

  const [result, setResult] = useState<Result | null>(null)

  useEffect(() => {
    let cancelled = false

    async function run() {
      if (!healthUrl) {
        setResult({ ok: false, error: "NEXT_PUBLIC_SUPABASE_URL is missing in client bundle" })
        return
      }
      if (!anonKey) {
        setResult({ ok: false, error: "NEXT_PUBLIC_SUPABASE_ANON_KEY or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY is missing in client bundle" })
        return
      }

      try {
        const res = await fetch(healthUrl, {
          method: "GET",
          headers: {
            apikey: anonKey,
          },
        })
        const txt = await res.text()
        if (!cancelled) {
          setResult({
            ok: true,
            status: res.status,
            bodyPreview: txt.slice(0, 500),
          })
        }
      } catch (e) {
        const msg = e instanceof Error ? `${e.name}: ${e.message}` : String(e)
        if (!cancelled) setResult({ ok: false, error: msg })
      }
    }

    run()
    return () => {
      cancelled = true
    }
  }, [healthUrl, anonKey])

  return (
    <main style={{ padding: 24, fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial" }}>
      <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>Supabase debug</h1>

      <div style={{ display: "grid", gap: 8, maxWidth: 900 }}>
        <div>
          <div style={{ fontWeight: 600 }}>NEXT_PUBLIC_SUPABASE_URL</div>
          <pre style={{ whiteSpace: "pre-wrap", wordBreak: "break-word", margin: 0 }}>{String(url)}</pre>
        </div>

        <div>
          <div style={{ fontWeight: 600 }}>Health URL</div>
          <pre style={{ whiteSpace: "pre-wrap", wordBreak: "break-word", margin: 0 }}>{String(healthUrl)}</pre>
        </div>

        <div>
          <div style={{ fontWeight: 600 }}>NEXT_PUBLIC_SUPABASE_ANON_KEY / NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY</div>
          <pre style={{ whiteSpace: "pre-wrap", wordBreak: "break-word", margin: 0 }}>
            {anonKey ? `${anonKey.slice(0, 16)}…${anonKey.slice(-8)}` : String(anonKey)}
          </pre>
        </div>

        <div>
          <div style={{ fontWeight: 600 }}>Fetch result</div>
          <pre style={{ whiteSpace: "pre-wrap", wordBreak: "break-word", margin: 0 }}>
            {result ? JSON.stringify(result, null, 2) : "Running…"}
          </pre>
        </div>
      </div>
    </main>
  )
}

