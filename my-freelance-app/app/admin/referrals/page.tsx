import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ReferralAdminPanel from '@/components/admin/ReferralAdminPanel'

type ReferralRow = {
  referrer_user_id: string
  status: string
}

const DEFAULT_SETTINGS = {
  confirmation_rule: 'paid_or_completed' as const,
  reward_per_confirmed: 5,
  reward_currency: 'USD',
  updated_at: null as string | null,
}

export default async function AdminReferralsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || user.user_metadata?.role !== 'admin') {
    redirect('/admin/login')
  }

  const { data: settingsRow } = await supabase
    .from('referral_settings')
    .select('confirmation_rule, reward_per_confirmed, reward_currency, updated_at')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const initialSettings = {
    confirmation_rule: (settingsRow?.confirmation_rule || DEFAULT_SETTINGS.confirmation_rule) as
      | 'paid_only'
      | 'completed_only'
      | 'paid_or_completed',
    reward_per_confirmed: Number(settingsRow?.reward_per_confirmed ?? DEFAULT_SETTINGS.reward_per_confirmed),
    reward_currency: settingsRow?.reward_currency || DEFAULT_SETTINGS.reward_currency,
    updated_at: settingsRow?.updated_at || null,
  }

  const { data: referrals } = await supabase
    .from('referrals')
    .select('referrer_user_id, status')
    .order('created_at', { ascending: false })
    .limit(500)

  const userIds = Array.from(
    new Set(((referrals || []) as ReferralRow[]).map((r) => r.referrer_user_id).filter(Boolean))
  )

  const { data: referrerClients } = userIds.length
    ? await supabase
        .from('clients')
        .select('auth_user_id, name, email')
        .in('auth_user_id', userIds)
    : { data: [] as any[] }

  const clientByUser = new Map<string, { name?: string; email?: string }>()
  ;(referrerClients || []).forEach((row: any) => {
    if (row?.auth_user_id) {
      clientByUser.set(String(row.auth_user_id), { name: row.name, email: row.email })
    }
  })

  const summaryMap = new Map<
    string,
    { referrerUserId: string; referrerName: string; referrerEmail: string; total: number; pending: number; confirmed: number; invalid: number }
  >()

  ;((referrals || []) as ReferralRow[]).forEach((row) => {
    const key = row.referrer_user_id
    if (!summaryMap.has(key)) {
      const profile = clientByUser.get(key)
      summaryMap.set(key, {
        referrerUserId: key,
        referrerName: profile?.name || 'User',
        referrerEmail: profile?.email || '',
        total: 0,
        pending: 0,
        confirmed: 0,
        invalid: 0,
      })
    }
    const acc = summaryMap.get(key)!
    acc.total += 1
    if (row.status === 'confirmed') acc.confirmed += 1
    else if (row.status === 'invalid') acc.invalid += 1
    else acc.pending += 1
  })

  const referrerSummaries = Array.from(summaryMap.values()).sort((a, b) => b.confirmed - a.confirmed || b.total - a.total)

  return (
    <div className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <h1 className="text-3xl font-bold text-gray-900">Referral Management</h1>
          <p className="text-sm text-gray-600 mt-2">
            Configure confirmation rules and review rewards from confirmed referrals.
          </p>
        </div>

        <ReferralAdminPanel
          initialSettings={initialSettings}
          referrerSummaries={referrerSummaries}
        />
      </div>
    </div>
  )
}

