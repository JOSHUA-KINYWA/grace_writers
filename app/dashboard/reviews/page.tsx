import PublicReviewsPanel from '@/components/client/PublicReviewsPanel'
import PlatformRatingCard from '@/components/client/PlatformRatingCard'

export default function ClientReviewsPage() {
  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Reviews & ratings</h1>
        <p className="text-sm text-slate-600 mt-1">
          See what other clients say about Grace Tutors and share your own experience.
        </p>
      </div>

      <PublicReviewsPanel />

      <div className="bg-white rounded-xl border border-slate-200 p-5 sm:p-6 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900 mb-1">Rate our platform</h2>
        <p className="text-sm text-slate-600 mb-4">
          Your overall rating helps other clients and our team improve the service.
        </p>
        <PlatformRatingCard />
      </div>
    </div>
  )
}
