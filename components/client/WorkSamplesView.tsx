'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { FaImages } from 'react-icons/fa'

interface WorkSample {
  id: string
  title: string
  slug: string
  description: string | null
  client_name: string | null
  technologies: string[] | null
  results: string | null
  images: string[]
  storagePaths?: string[]
  services?: { title?: string; category?: string } | null
}

function downloadHref(storagePath: string) {
  return `/api/signed-url?filePath=${encodeURIComponent(storagePath)}`
}

export default function WorkSamplesView() {
  const [items, setItems] = useState<WorkSample[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [activeCategory, setActiveCategory] = useState('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError('')
      try {
        const params = activeCategory !== 'all' ? `?category=${encodeURIComponent(activeCategory)}` : ''
        const res = await fetch(`/api/work-samples${params}`, { cache: 'no-store' })
        if (!res.ok) throw new Error('Failed to load work samples')
        const data = await res.json()
        setItems(data.items || [])
        if (activeCategory === 'all') {
          setCategories(data.categories || [])
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load samples')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [activeCategory])

  const navCategories = useMemo(() => {
    const merged = new Set(categories)
    items.forEach((item) => {
      if (item.services?.category) merged.add(item.services.category)
    })
    return Array.from(merged).sort()
  }, [categories, items])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Work Samples</h1>
        <p className="text-slate-600 mt-1">
          Browse our work across different fields — shared for all clients, not tied to your account.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setActiveCategory('all')}
          className={`px-4 py-2 rounded-full text-sm font-semibold transition ${
            activeCategory === 'all'
              ? 'bg-purple-600 text-white shadow-md'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          All Categories
        </button>
        {navCategories.map((category) => (
          <button
            key={category}
            type="button"
            onClick={() => setActiveCategory(category)}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition ${
              activeCategory === category
                ? 'bg-purple-600 text-white shadow-md'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            {category}
          </button>
        ))}
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700 text-sm">{error}</div>
      )}

      {loading ? (
        <p className="text-slate-600">Loading work samples...</p>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-10 text-center">
          <FaImages className="mx-auto text-slate-300 mb-3" size={36} />
          <p className="text-slate-600">No work samples in this category yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {items.map((item) => (
            <article key={item.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              {item.images?.[0] ? (
                <img
                  src={item.images[0]}
                  alt={item.title}
                  className="w-full h-44 object-cover"
                />
              ) : (
                <div className="h-44 bg-slate-100 flex items-center justify-center text-slate-400">
                  <FaImages size={28} />
                </div>
              )}
              <div className="p-5">
                {item.services?.category && (
                  <span className="inline-block text-xs font-bold uppercase tracking-wide text-purple-700 bg-purple-50 px-2 py-1 rounded mb-2">
                    {item.services.category}
                  </span>
                )}
                <h2 className="text-lg font-bold text-slate-900">{item.title}</h2>
                {item.description && (
                  <p className="text-sm text-slate-600 mt-2 line-clamp-3">{item.description}</p>
                )}
                {item.results && (
                  <p className="text-sm text-green-700 mt-2 font-medium">{item.results}</p>
                )}
                <div className="mt-4 flex flex-wrap gap-3">
                  <Link
                    href={`/portfolio/${item.slug}`}
                    className="text-sm font-semibold text-purple-600 hover:text-purple-800"
                  >
                    View sample →
                  </Link>
                  {(item.storagePaths || []).map((path, idx) =>
                    path && !path.startsWith('http') ? (
                      <a
                        key={path}
                        href={downloadHref(path)}
                        className="text-sm font-semibold text-slate-600 hover:text-slate-900 underline"
                      >
                        Download{item.storagePaths!.length > 1 ? ` ${idx + 1}` : ''}
                      </a>
                    ) : null
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
