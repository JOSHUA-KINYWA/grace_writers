import { NextResponse } from "next/server"
import { createClient as createServerClient } from "@/lib/supabase/server"

function generateCode(length = 8) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
  let out = ""
  for (let i = 0; i < length; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)]
  return out
}

export async function POST() {
  const supabase = await createServerClient()
  const { data: { user }, error: userErr } = await supabase.auth.getUser()
  if (userErr || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  // If already exists, return it
  const existing = await supabase
    .from("referral_codes")
    .select("code")
    .eq("owner_user_id", user.id)
    .maybeSingle()

  if (existing?.data?.code) {
    return NextResponse.json({ code: existing.data.code })
  }

  // Link to client if present
  const clientRow = await supabase
    .from("clients")
    .select("id")
    .eq("auth_user_id", user.id)
    .maybeSingle()

  // Retry a few times in case of collisions
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateCode()
    const { error } = await supabase
      .from("referral_codes")
      .insert({
        code,
        owner_user_id: user.id,
        owner_client_id: clientRow?.data?.id ?? null,
        active: true,
      })

    if (!error) return NextResponse.json({ code })
  }

  return NextResponse.json({ error: "Failed to create referral code" }, { status: 500 })
}

