import { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AdminLayout from '@/components/admin/AdminLayout'
import { isAdminUser } from '@/lib/auth/admin'

export const metadata = {
  title: 'Admin Dashboard',
}

export default async function AdminDashboardLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/admin/login')
  }

  if (!isAdminUser(user)) {
    redirect('/admin/login')
  }

  return <AdminLayout>{children}</AdminLayout>
}
