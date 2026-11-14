import { isAdminUser } from '@/lib/auth/admin'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getTestimonials } from '@/lib/utils/supabase-helpers'
import Link from 'next/link'
import LogoutButton from '@/components/admin/LogoutButton'

export default async function AdminTestimonialsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || !isAdminUser(user)) {
    redirect('/admin/login')
  }

  let testimonials: any[] = []
  try {
    const { data, error } = await supabase
      .from('testimonials')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (!error && data) {
      testimonials = data
    }
  } catch (error) {
    testimonials = []
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <Link href="/admin" className="text-gray-600 hover:text-gray-900">
                ← Dashboard
              </Link>
              <h1 className="text-2xl font-bold text-gray-900">⭐ Testimonials Management</h1>
            </div>
            <LogoutButton />
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">
            Total Reviews: {testimonials.length} | 
            Pending: {testimonials.filter((t: any) => !t.approved).length}
          </h2>
          <Link
            href="/admin/testimonials/new"
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition font-semibold"
          >
            + Add Testimonial
          </Link>
        </div>

        <div className="space-y-4">
          {testimonials.length > 0 ? (
            testimonials.map((testimonial: any) => (
              <div key={testimonial.id} className="bg-white rounded-lg shadow p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      {[...Array(testimonial.rating || 5)].map((_, i) => (
                        <span key={i} className="text-yellow-400">⭐</span>
                      ))}
                      <span className="font-bold">{testimonial.client_name}</span>
                      {testimonial.company && (
                        <span className="text-gray-600">- {testimonial.company}</span>
                      )}
                    </div>
                    <p className="text-gray-700 italic">&ldquo;{testimonial.comment}&rdquo;</p>
                  </div>
                  <div className="flex gap-2">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      testimonial.approved ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {testimonial.approved ? 'Approved' : 'Pending'}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Link
                    href={`/admin/testimonials/${testimonial.id}`}
                    className="text-purple-600 hover:text-purple-700 font-semibold text-sm"
                  >
                    Edit
                  </Link>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-12 text-gray-600">
              No testimonials yet. Add your first review!
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
