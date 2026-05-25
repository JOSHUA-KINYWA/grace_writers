'use client'

import { useState } from 'react'
import { FaTrash, FaEye, FaSpinner } from 'react-icons/fa'

export default function DeleteOldFilesPanel() {
  const [daysOld, setDaysOld] = useState(30)
  const [loading, setLoading] = useState(false)
  const [previewing, setPreviewing] = useState(false)
  const [preview, setPreview] = useState<any>(null)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState('')

  async function handlePreview() {
    if (daysOld < 1) {
      setError('Days must be at least 1')
      return
    }

    setPreviewing(true)
    setError('')
    setResult(null)
    setPreview(null)

    try {
      const res = await fetch(`/api/admin/delete-old-files?daysOld=${daysOld}`)
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to preview files')
      }

      const data = await res.json()
      setPreview(data)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Preview failed'
      setError(message)
    } finally {
      setPreviewing(false)
    }
  }

  async function handleDelete() {
    if (!preview) {
      setError('Please preview first')
      return
    }

    if (!confirm(`Delete ${preview.preview?.totalUniqueFiles || 0} old files? This cannot be undone.`)) {
      return
    }

    setLoading(true)
    setError('')
    setResult(null)

    try {
      const res = await fetch('/api/admin/delete-old-files', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ daysOld })
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to delete files')
      }

      const data = await res.json()
      setResult(data.summary)
      setPreview(null)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Delete failed'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white border border-red-300 rounded-lg p-6 shadow-md">
      <div className="mb-4">
        <h2 className="text-2xl font-bold text-red-900 mb-2">🗑️ Delete Old Order Files</h2>
        <p className="text-gray-700">Permanently delete order files older than a specified number of days from storage and database.</p>
      </div>

      {/* Input Section */}
      <div className="bg-gray-50 rounded-lg p-4 mb-4">
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Delete files older than (days):
        </label>
        <div className="flex gap-3">
          <input
            type="number"
            min="1"
            max="3650"
            value={daysOld}
            onChange={(e) => setDaysOld(Math.max(1, parseInt(e.target.value) || 1))}
            disabled={loading || previewing}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
          />
          <button
            onClick={handlePreview}
            disabled={loading || previewing}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition"
          >
            {previewing ? <FaSpinner className="animate-spin" /> : <FaEye />}
            {previewing ? 'Previewing...' : 'Preview'}
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-400 text-red-900 px-4 py-3 rounded-lg mb-4">
          {error}
        </div>
      )}

      {/* Preview Results */}
      {preview && (
        <div className="bg-blue-50 border border-blue-300 rounded-lg p-4 mb-4">
          <h3 className="font-bold text-blue-900 mb-2">Preview Results</h3>
          <dl className="space-y-2 text-sm text-blue-900">
            <div className="flex justify-between">
              <dt>Cutoff Date:</dt>
              <dd>{new Date(preview.cutoffDate).toLocaleDateString()}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Message Files Count:</dt>
              <dd>{preview.preview?.messageFilesCount || 0}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Revision Files Count:</dt>
              <dd>{preview.preview?.revisionFilesCount || 0}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Order Deliverable Records:</dt>
              <dd>{preview.preview?.orderDeliverableRecords || 0}</dd>
            </div>
            <div className="flex justify-between font-bold border-t border-blue-300 pt-2 mt-2">
              <dt>Total Unique Files:</dt>
              <dd>{preview.preview?.totalUniqueFiles || 0}</dd>
            </div>
          </dl>

          {preview.preview?.sampleFiles && preview.preview.sampleFiles.length > 0 && (
            <div className="mt-4 pt-4 border-t border-blue-300">
              <p className="text-xs font-semibold mb-2 text-blue-900">Sample Files (max 10):</p>
              <ul className="text-xs space-y-1 max-h-40 overflow-y-auto">
                {preview.preview.sampleFiles.map((file: string, idx: number) => (
                  <li key={idx} className="text-blue-700 truncate">
                    • {file}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Delete Button */}
      {preview && !result && (
        <button
          onClick={handleDelete}
          disabled={loading}
          className="w-full bg-red-600 text-white px-4 py-3 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition font-semibold"
        >
          {loading ? <FaSpinner className="animate-spin" /> : <FaTrash />}
          {loading ? 'Deleting...' : 'Delete All Old Files'}
        </button>
      )}

      {/* Success Results */}
      {result && (
        <div className="bg-green-50 border border-green-300 rounded-lg p-4">
          <h3 className="font-bold text-green-900 mb-2">✓ Deletion Complete</h3>
          <dl className="space-y-2 text-sm text-green-900">
            <div className="flex justify-between">
              <dt>Files Deleted from Storage:</dt>
              <dd className="font-bold">{result.filesDeleted}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Total Files Found:</dt>
              <dd>{result.totalFiles}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Database Records Updated:</dt>
              <dd className="font-bold">{result.recordsUpdated}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Cutoff Date:</dt>
              <dd>{new Date(result.cutoffDate).toLocaleDateString()}</dd>
            </div>
          </dl>

          {result.errors && result.errors.length > 0 && (
            <div className="mt-4 pt-4 border-t border-green-300">
              <p className="text-xs font-semibold mb-2 text-amber-900">Issues Encountered:</p>
              <ul className="text-xs space-y-1 max-h-32 overflow-y-auto bg-amber-50 p-2 rounded border border-amber-200">
                {result.errors.map((err: string, idx: number) => (
                  <li key={idx} className="text-amber-700">
                    • {err}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <button
            onClick={() => {
              setResult(null)
              setPreview(null)
              setDaysOld(30)
            }}
            className="w-full mt-4 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition"
          >
            Start Over
          </button>
        </div>
      )}
    </div>
  )
}
