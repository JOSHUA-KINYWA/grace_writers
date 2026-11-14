import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ComprehensiveAdminDashboard from '@/components/admin/ComprehensiveAdminDashboard'
import { isAdminUser } from '@/lib/auth/admin'

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/admin/login')
  }

  if (!isAdminUser(user)) {
    redirect('/admin/login')
  }

  return <ComprehensiveAdminDashboard />
}
