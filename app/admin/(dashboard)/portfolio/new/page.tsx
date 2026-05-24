import React from 'react'
import PortfolioNewForm from '@/components/admin/PortfolioNewForm'
import LogoutButton from '@/components/admin/LogoutButton'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function NewPortfolioPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.user_metadata?.role !== 'admin') redirect('/admin/login')

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <a href="/admin/portfolio" className="text-gray-600 hover:text-gray-900">← Back</a>
              <h1 className="text-2xl font-bold text-gray-900">Add Portfolio Item</h1>
            </div>
            <LogoutButton />
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <PortfolioNewForm />
      </div>
    </div>
  )
}
