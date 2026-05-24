import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ComprehensiveAdminDashboard from '@/components/admin/ComprehensiveAdminDashboard'

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/admin/login')
  }

  const role = user.user_metadata?.role
  if (role !== 'admin') {
    redirect('/admin/login')
  }

  return <ComprehensiveAdminDashboard />
}
