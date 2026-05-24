import Link from "next/link"
import { createClient as createServerClient } from "@/lib/supabase/server"

function generateCode(length = 8) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
  let out = ""
  for (let i = 0; i < length; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)]
  return out
}

export default async function ReferralsPage() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return (
      <div className="p-6">
        <p className="text-gray-700">Please sign in.</p>
        <Link href="/login" className="text-blue-600 underline">
          Go to login
        </Link>
      </div>
    )
  }

  // Ensure code exists (server-side insert allowed by RLS for owner)
  let codeRow = await supabase
    .from("referral_codes")
    .select("code")
    .eq("owner_user_id", user.id)
    .maybeSingle()

  if (!codeRow.data?.code) {
    // Create a code directly in this authenticated server context.
    const clientRow = await supabase
      .from("clients")
      .select("id")
      .eq("auth_user_id", user.id)
      .maybeSingle()

    for (let attempt = 0; attempt < 5 && !codeRow.data?.code; attempt++) {
      const candidate = generateCode()
      const { error: insertErr } = await supabase
        .from("referral_codes")
        .insert({
          code: candidate,
          owner_user_id: user.id,
          owner_client_id: clientRow?.data?.id ?? null,
          active: true,
        })
      if (!insertErr) {
        codeRow = { data: { code: candidate } } as any
      }
    }

    codeRow = await supabase
      .from("referral_codes")
      .select("code")
      .eq("owner_user_id", user.id)
      .maybeSingle()
  }

  const code = codeRow.data?.code || ""
  const { getAppUrl } = await import('@/lib/app-url')
  const signupUrl = `${getAppUrl()}/signup?ref=${encodeURIComponent(code)}`

  const { data: referrals } = await supabase
    .from("referrals")
    .select("id, status, created_at, referred_user_id, code_used")
    .eq("referrer_user_id", user.id)
    .order("created_at", { ascending: false })

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Referrals</h1>
        <p className="text-gray-600 text-sm mt-1">Invite clients with your link. We track signups separately from finance.</p>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <div className="flex flex-col gap-2">
          <div className="text-sm font-semibold text-gray-900">Your referral code</div>
          <div className="font-mono text-lg">{code || "—"}</div>

          <div className="text-sm font-semibold text-gray-900 mt-3">Your referral link</div>
          <div className="font-mono text-xs break-all bg-gray-50 border border-gray-200 rounded p-3">{signupUrl}</div>

          <p className="text-xs text-gray-500 mt-2">
            Tip: Send this link to clients. When they sign up, the referral will show as <span className="font-semibold">pending</span>.
          </p>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-200">
          <h2 className="font-bold text-gray-900">Your referred signups</h2>
        </div>

        {referrals && referrals.length > 0 ? (
          <div className="divide-y divide-gray-200">
            {referrals.map((r: any) => (
              (() => {
                const status = String(r.status || "pending")
                let badgeClass = "bg-yellow-100 text-yellow-800"
                if (status === "confirmed") badgeClass = "bg-green-100 text-green-800"
                if (status === "invalid") badgeClass = "bg-red-100 text-red-800"
                return (
              <div key={r.id} className="px-5 py-4 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-gray-900 truncate">Referred user: {String(r.referred_user_id).slice(0, 8)}…</div>
                  <div className="text-xs text-gray-500 mt-1">Code: {r.code_used}</div>
                  <div className="text-xs text-gray-500 mt-1">{new Date(r.created_at).toLocaleString()}</div>
                </div>
                <span
                  className={`text-xs font-bold px-2 py-1 rounded-full ${badgeClass}`}
                >
                  {status.toUpperCase()}
                </span>
              </div>
                )
              })()
            ))}
          </div>
        ) : (
          <div className="px-5 py-8 text-sm text-gray-500">No referrals yet.</div>
        )}
      </div>
    </div>
  )
}

