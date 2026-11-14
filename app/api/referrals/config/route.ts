import { isAdminUser } from '@/lib/auth/admin'
import { NextResponse } from "next/server"
import { createClient as createServerClient } from "@/lib/supabase/server"

const DEFAULT_CONFIG = {
  confirmation_rule: "paid_or_completed",
  reward_per_confirmed: 5,
  reward_currency: "USD",
}

function isMissingSettingsTable(error: any) {
  const code = String(error?.code || "")
  const message = String(error?.message || "").toLowerCase()
  return code === "42P01" || code === "PGRST205" || message.includes("referral_settings")
}

async function requireAdmin() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { supabase, user: null, error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) }
  if (!isAdminUser(user)) {
    return { supabase, user, error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) }
  }
  return { supabase, user, error: null }
}

export async function GET() {
  const { supabase, error } = await requireAdmin()
  if (error) return error

  try {
    const { data, error: readErr } = await supabase
      .from("referral_settings")
      .select("confirmation_rule, reward_per_confirmed, reward_currency, updated_at")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    if (readErr) {
      // Safe fallback when table does not exist yet.
      if (isMissingSettingsTable(readErr)) {
        return NextResponse.json(
          {
            ...DEFAULT_CONFIG,
            updated_at: null,
            fallback: true,
            message: "Referral settings table is missing. Apply migration create_referral_settings.sql.",
          },
          { status: 200 }
        )
      }
      throw readErr
    }

    return NextResponse.json(
      {
        confirmation_rule: data?.confirmation_rule || DEFAULT_CONFIG.confirmation_rule,
        reward_per_confirmed: Number(data?.reward_per_confirmed ?? DEFAULT_CONFIG.reward_per_confirmed),
        reward_currency: data?.reward_currency || DEFAULT_CONFIG.reward_currency,
        updated_at: data?.updated_at || null,
      },
      { status: 200 }
    )
  } catch (err) {
    const errorObj = err instanceof Error ? err : new Error(String(err))
    return NextResponse.json({ error: errorObj.message || "Server error" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const { supabase, error } = await requireAdmin()
  if (error) return error

  try {
    const body = await req.json()
    const confirmationRule = String(body?.confirmation_rule || DEFAULT_CONFIG.confirmation_rule)
    const rewardPerConfirmed = Number(body?.reward_per_confirmed ?? DEFAULT_CONFIG.reward_per_confirmed)
    const rewardCurrency = String(body?.reward_currency || DEFAULT_CONFIG.reward_currency).toUpperCase().slice(0, 8)

    if (!["paid_only", "completed_only", "paid_or_completed"].includes(confirmationRule)) {
      return NextResponse.json({ error: "Invalid confirmation_rule" }, { status: 400 })
    }
    if (!Number.isFinite(rewardPerConfirmed) || rewardPerConfirmed < 0) {
      return NextResponse.json({ error: "Invalid reward_per_confirmed" }, { status: 400 })
    }

    const payload = {
      confirmation_rule: confirmationRule,
      reward_per_confirmed: rewardPerConfirmed,
      reward_currency: rewardCurrency || DEFAULT_CONFIG.reward_currency,
      updated_at: new Date().toISOString(),
    }

    const { data: existing } = await supabase
      .from("referral_settings")
      .select("id")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    if (existing?.id) {
      const { error: updateErr } = await supabase
        .from("referral_settings")
        .update(payload)
        .eq("id", existing.id)
      if (updateErr) {
        if (isMissingSettingsTable(updateErr)) {
          return NextResponse.json(
            { error: "Referral settings table missing. Run migration create_referral_settings.sql first." },
            { status: 503 }
          )
        }
        throw updateErr
      }
    } else {
      const { error: insertErr } = await supabase
        .from("referral_settings")
        .insert(payload as any)
      if (insertErr) {
        if (isMissingSettingsTable(insertErr)) {
          return NextResponse.json(
            { error: "Referral settings table missing. Run migration create_referral_settings.sql first." },
            { status: 503 }
          )
        }
        throw insertErr
      }
    }

    return NextResponse.json({ ok: true }, { status: 200 })
  } catch (err) {
    const errorObj = err instanceof Error ? err : new Error(String(err))
    return NextResponse.json({ error: errorObj.message || "Server error" }, { status: 500 })
  }
}

