import Link from 'next/link'
import PortfolioForm from '@/components/admin/PortfolioForm'

export default async function EditPortfolioPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  return (
    <div className="max-w-4xl">
      <Link
        href="/admin/portfolio"
        className="text-purple-600 hover:text-purple-800 font-semibold text-sm mb-4 inline-block"
      >
        ← Back to work samples
      </Link>
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Edit work sample</h1>
      <PortfolioForm itemId={id} />
    </div>
  )
}
