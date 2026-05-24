import { getSiteSettings } from '@/lib/utils/supabase-helpers'

export default async function AboutPage() {
  const settings = await getSiteSettings().catch(() => null)

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-xl shadow-lg p-8 md:p-12">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            About Grace Writers
          </h1>
          
          <div className="prose max-w-none text-gray-700 space-y-6">
            {settings?.about_me_text ? (
              <div dangerouslySetInnerHTML={{ __html: settings.about_me_text }} />
            ) : (
              <>
                <p className="text-lg">
                  Welcome to Grace Writers! I&apos;m a professional writer specializing in all types of content creation.
                </p>
                <p>
                  With years of experience in academic, business, technical, and creative writing, I&apos;ve helped hundreds of clients achieve their goals through high-quality, original content.
                </p>
                <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Why Choose Me?</h2>
                <ul className="list-disc list-inside space-y-2">
                  <li>Native English speaker with flawless grammar</li>
                  <li>Expert in 50+ industries and academic subjects</li>
                  <li>Fast turnaround - 24-48 hour delivery available</li>
                  <li>100% original content with plagiarism reports</li>
                  <li>Unlimited revisions until you&apos;re satisfied</li>
                  <li>Confidential and professional service</li>
                </ul>
                <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">My Specializations</h2>
                <p>
                  I write everything from academic research papers and business proposals to technical documentation and creative content. No project is too big or too small.
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
