import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import WorkSamplesView from '@/components/client/WorkSamplesView'

export default async function DashboardSamplesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login?next=/dashboard/samples')
  }

  return <WorkSamplesView />
}
