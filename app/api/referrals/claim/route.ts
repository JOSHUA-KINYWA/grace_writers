import { NextResponse } from "next/server"
import { createClient as createServerClient } from "@/lib/supabase/server"

export async function POST(req: Request) {
  try {
    const { code } = await req.json()
    if (!code || typeof code !== "string") {
      return NextResponse.json({ error: "Invalid code" }, { status: 400 })
    }

    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const normalized = code.trim().toUpperCase()

    // Get code owner
    const { data: refCode, error: codeErr } = await supabase
      .from("referral_codes")
      .select("code, owner_user_id, owner_client_id, active")
      .eq("code", normalized)
      .maybeSingle()

    if (codeErr) throw codeErr
    if (!refCode || refCode.active === false) {
      return NextResponse.json({ ok: false, status: "invalid" }, { status: 200 })
    }

    if (refCode.owner_user_id === user.id) {
      return NextResponse.json({ ok: false, status: "self" }, { status: 200 })
    }

    // If referral already exists for this referred user, do not duplicate
    const existing = await supabase
      .from("referrals")
      .select("id,status")
      .eq("referred_user_id", user.id)
      .maybeSingle()

    if (existing?.data?.id) {
      return NextResponse.json({ ok: true, status: existing.data.status, already: true }, { status: 200 })
    }

    const referredClient = await supabase
      .from("clients")
      .select("id")
      .eq("auth_user_id", user.id)
      .maybeSingle()

    const { error: insertErr } = await supabase
      .from("referrals")
      .insert({
        code_used: refCode.code,
        referrer_user_id: refCode.owner_user_id,
        referrer_client_id: refCode.owner_client_id ?? null,
        referred_user_id: user.id,
        referred_client_id: referredClient?.data?.id ?? null,
        status: "pending",
      })

    if (insertErr) throw insertErr

    return NextResponse.json({ ok: true, status: "pending" }, { status: 200 })
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err))
    console.error("Referral claim error:", error)
    return NextResponse.json({ error: error.message || "Server error" }, { status: 500 })
  }
}

