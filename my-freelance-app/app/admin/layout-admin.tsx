import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AdminLayout from '@/components/admin/AdminLayout'

export const metadata = {
  title: 'Admin Dashboard',
}

export default async function AdminLayoutWrapper({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/admin/login')
  }

  const role = user.user_metadata?.role
  if (role !== 'admin') {
    redirect('/admin/login')
  }

  return <AdminLayout>{children}</AdminLayout>
}
