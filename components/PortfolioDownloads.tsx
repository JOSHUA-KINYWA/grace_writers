'use client'

type PortfolioDownloadsProps = {
  storagePaths: string[]
  title: string
}

export default function PortfolioDownloads({ storagePaths, title }: PortfolioDownloadsProps) {
  const paths = storagePaths.filter((p) => p && !p.startsWith('http'))

  if (paths.length === 0) return null

  return (
    <div className="mb-8">
      <h2 className="text-lg font-bold text-gray-900 mb-3">Download samples</h2>
      <div className="flex flex-wrap gap-2">
        {paths.map((path, index) => (
          <a
            key={path}
            href={`/api/signed-url?filePath=${encodeURIComponent(path)}`}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-semibold hover:bg-purple-700"
          >
            Download {paths.length > 1 ? `${title} — file ${index + 1}` : title}
          </a>
        ))}
      </div>
    </div>
  )
}
