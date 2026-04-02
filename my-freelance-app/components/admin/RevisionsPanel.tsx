'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { FaDownload, FaCheckCircle, FaClock, FaExclamationCircle, FaUpload } from 'react-icons/fa'
import { formatDate, formatDateTime } from '@/lib/utils/formatDate'
import downloadFile from '@/lib/utils/downloadFile'

interface RevisionsProps {
  orderId: string
  orderTitle: string
  onUpdate?: () => void
}

export default function RevisionsPanel({ orderId, onUpdate }: RevisionsProps) {
  type RevisionType = { id: string; order_id: string; revision_number: number; status: string; requested_reason?: string; revision_files: Array<{ id: string; file_path?: string; file_url?: string; file_name?: string; uploaded_at?: string }>; created_at: string; updated_at: string; completed_at?: string }
  const [revisions, setRevisions] = useState<RevisionType[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)
  const [expandedRevision, setExpandedRevision] = useState<string | null>(null)
  const [uploadingRevisionId, setUploadingRevisionId] = useState<string | null>(null)
  const [revisionFiles, setRevisionFiles] = useState<{ [key: string]: File[] }>({})

  const fetchRevisions = useCallback(async () => {
    try {
      setLoading(true)
      const supabase = createClient()
      const { data, error } = await supabase
        .from('revisions')
        .select(`
          *,
          revision_files(*)
        `)
        .eq('order_id', orderId)
        .order('revision_number', { ascending: false })

      if (error) throw error
      setRevisions(data || [])
    } catch (error: Error | unknown) {
      console.error('Error fetching revisions:', error)
    } finally {
      setLoading(false)
    }
  }, [orderId])

  async function handleDownload(filePath: string, fileName?: string) {
    await downloadFile(filePath, fileName)
  }

  useEffect(() => {
    fetchRevisions()
  }, [fetchRevisions])

  async function updateRevisionStatus(revisionId: string, newStatus: string) {
    setUpdating(revisionId)
    try {
      const response = await fetch('/api/update-revision-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          revisionId,
          status: newStatus,
        }),
      })

      if (!response.ok) throw new Error('Failed to update revision')

      // Refresh revisions
      await fetchRevisions()
      onUpdate?.()
    } catch (error: Error | unknown) {
      alert(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setUpdating(null)
    }
  }

  async function uploadRevisionFiles(revisionId: string, files: File[]) {
    if (!files.length) return

    setUploadingRevisionId(revisionId)
    try {
      const supabase = createClient()

      for (const file of files) {
        const fileExt = file.name.split('.').pop()
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`
        const filePath = `revision-${revisionId}/${fileName}`

        // Upload to storage
        const { error: uploadError } = await supabase.storage
          .from('order-files')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false,
          })

        if (uploadError) throw uploadError

        // Record in revision_files
        const { error: recordError } = await fetch('/api/upload-revision-file', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            revisionId,
            filePath,
            fileName: file.name,
            orderId,
          }),
        }).then((res) => res.json())

        if (recordError) throw new Error(recordError)
      }

      alert('Revision files uploaded successfully!')
      setRevisionFiles({ ...revisionFiles, [revisionId]: [] })
      await fetchRevisions()
      onUpdate?.()
    } catch (error: Error | unknown) {
      alert(`Error uploading files: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setUploadingRevisionId(null)
    }
  }

  function getStatusIcon(status: string) {
    switch (status) {
      case 'completed':
        return <FaCheckCircle className="text-green-600" />
      case 'in_progress':
        return <FaClock className="text-blue-600" />
      default:
        return <FaExclamationCircle className="text-yellow-600" />
    }
  }

  function getStatusColor(status: string) {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800'
      case 'in_progress':
        return 'bg-blue-100 text-blue-800'
      default:
        return 'bg-yellow-100 text-yellow-800'
    }
  }

  // Use shared formatter
  // formatDate / formatDateTime imported from lib

  if (loading) {
    return <div className="text-center py-4 text-gray-600">Loading revisions...</div>
  }

  if (revisions.length === 0) {
    return <div className="text-center py-4 text-gray-600">No revisions requested yet</div>
  }

  return (
    <div className="space-y-4">
      {revisions.map((revision) => (
        <div key={revision.id} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div
            className="flex items-center justify-between cursor-pointer hover:bg-gray-100 p-2 rounded transition"
            onClick={() => setExpandedRevision(
              expandedRevision === revision.id ? null : revision.id
            )}
          >
            <div className="flex items-center gap-3 flex-1">
              {getStatusIcon(revision.status)}
              <div>
                <h4 className="font-bold text-gray-900">
                  Revision #{revision.revision_number}
                </h4>
                <p className="text-sm text-gray-600">
                  Requested {formatDate(revision.created_at)}
                </p>
              </div>
            </div>

            <span className={`px-3 py-1 rounded-full text-sm font-bold ${getStatusColor(revision.status)}`}>
              {revision.status.replace('_', ' ').toUpperCase()}
            </span>
          </div>

          {expandedRevision === revision.id && (
            <div className="mt-4 pl-8 border-l-2 border-gray-300 space-y-3">
              <div>
                <label className="text-xs font-bold text-gray-600 uppercase">Reason</label>
                <p className="text-gray-700 mt-1">{revision.requested_reason}</p>
              </div>

              {revision.revision_files && revision.revision_files.length > 0 && (
                <div>
                  <label className="text-xs font-bold text-gray-600 uppercase">Uploaded Files</label>
                  <div className="mt-2 space-y-2">
                    {revision.revision_files.map((file: any) => (
                      <div key={file.id} className="flex items-center justify-between bg-white p-2 rounded border border-gray-200">
                        <span className="text-sm text-gray-700">{file.file_name}</span>
                        <a
                          href={`/api/signed-url?filePath=${encodeURIComponent(file.file_path)}`}
                          onClick={(e) => { e.preventDefault(); handleDownload(file.file_path, file.file_name) }}
                          download={file.file_name}
                          className="text-blue-600 hover:text-blue-800 flex items-center gap-1 text-sm"
                        >
                          <FaDownload /> Download
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Upload Revision Files */}
              {revision.status !== 'completed' && (
                <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-3 mt-3">
                  <label className="text-xs font-bold text-blue-700 uppercase mb-2 block">Upload Revision Files</label>
                  <input
                    type="file"
                    id={`revision-upload-${revision.id}`}
                    multiple
                    onChange={(e) => {
                      const files = Array.from(e.currentTarget.files || [])
                      setRevisionFiles({ ...revisionFiles, [revision.id]: files })
                    }}
                    className="hidden"
                    disabled={uploadingRevisionId === revision.id}
                  />
                  <div className="flex gap-2">
                    <label
                      htmlFor={`revision-upload-${revision.id}`}
                      className="cursor-pointer flex items-center gap-2 bg-blue-600 text-white px-3 py-2 rounded hover:bg-blue-700 transition font-semibold text-sm"
                    >
                      <FaUpload size={14} /> Choose Files
                    </label>
                    {revisionFiles[revision.id] && revisionFiles[revision.id].length > 0 && (
                      <>
                        <span className="text-sm text-blue-700 flex items-center">
                          {revisionFiles[revision.id].length} file(s) selected
                        </span>
                        <button
                          onClick={() => uploadRevisionFiles(revision.id, revisionFiles[revision.id])}
                          disabled={uploadingRevisionId === revision.id}
                          className="bg-green-600 text-white px-3 py-2 rounded hover:bg-green-700 disabled:opacity-50 font-semibold text-sm"
                        >
                          {uploadingRevisionId === revision.id ? 'Uploading...' : 'Upload'}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )}

              {revision.status !== 'completed' && (
                <div className="flex gap-2 mt-4">
                  {revision.status === 'pending' && (
                    <button
                      onClick={() => updateRevisionStatus(revision.id, 'in_progress')}
                      disabled={updating === revision.id}
                      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 text-sm font-bold"
                    >
                      {updating === revision.id ? 'Updating...' : 'Start Work'}
                    </button>
                  )}

                  <button
                    onClick={() => updateRevisionStatus(revision.id, 'completed')}
                    disabled={updating === revision.id}
                    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 text-sm font-bold flex items-center gap-2"
                  >
                    {updating === revision.id ? 'Updating...' : (
                      <>
                        <FaCheckCircle /> Mark Complete
                      </>
                    )}
                  </button>
                </div>
              )}

              {revision.completed_at && (
                <div className="text-xs text-green-600 font-bold">
                  ✓ Completed on {formatDate(revision.completed_at)}
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
