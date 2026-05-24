'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { FaFile, FaUpload, FaDownload, FaSave, FaTrash } from 'react-icons/fa'
import RevisionsPanel from './RevisionsPanel'
import AdminOrderChat from './AdminOrderChat'
import AdminOrderRating from './AdminOrderRating'
import { showAppToast } from '@/lib/app-toast'

interface OrderManageFormProps {
  order: any
}

async function notifyClientAboutUpload(
  supabase: ReturnType<typeof createClient>,
  clientUser: any,
  uploadedUrls: string[],
  order: any
) {
  if (!clientUser) return

  const { data: clientRecord } = await supabase
    .from('clients')
    .select('id, auth_user_id')
    .eq('email', clientUser.email)
    .single()

  if (!clientRecord) return

  const notifyUserId = clientRecord.auth_user_id || clientRecord.id
  try {
    const { error } = await supabase
      .from('notifications')
      .insert({
        user_id: notifyUserId,
        order_id: order.id,
        type: 'file_upload',
        title: 'New Deliverables Available',
        message: `Admin has uploaded ${uploadedUrls.length} file(s) for your order: ${order.title}`,
        read: false,
      })
    
    if (error) console.error('Notification send failed:', error)
  } catch (error_) {
    console.error('Notification send failed:', error_)
  }

  if (!clientUser?.email) return
  void fetch('/api/send-email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      kind: 'deliverable_upload',
      to: clientUser.email,
      subject: `New deliverables for your order: ${order.title}`,
      text: `Admin uploaded ${uploadedUrls.length} file(s) for your order. Please sign in to your dashboard to view and download the files.`,
      html: `<p>Admin uploaded ${uploadedUrls.length} file(s) for your order <strong>${order.title}</strong>.</p><p><a href="${typeof window !== 'undefined' ? window.location.origin : ''}/dashboard/orders/${order.id}">View order and download files</a></p>`,
    }),
  }).catch((error_) => {
    console.error('Send email to client failed:', error_)
  })
}

async function parseApiError(response: Response, fallback: string) {
  try {
    const data = await response.json()
    return String(data.error || fallback)
  } catch {
    const text = await response.text().catch(() => '')
    return text || fallback
  }
}

async function generateSignedUrls(urls: string[], setter: (urls: string[]) => void) {
  try {
    const signed = await Promise.all(
      urls.map(async (url) => {
        try {
          // Check if this is already a bucket-relative path (order-*/*)
          let filePath = url

          // If it's a full URL with /order-files/, extract the path
          if (url.includes('/order-files/')) {
            const parts = url.split('/order-files/')
            if (parts.length >= 2) {
              filePath = parts[1]
            }
          }

          const res = await fetch('/api/signed-url', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ filePath })
          })

          const json = await res.json()
          if (res.ok && json.signedUrl) return json.signedUrl
          console.error('Signed URL fetch failed:', json.error || json)
          return url
        } catch (error_) {
          console.error('Fetch signed URL error:', error_)
          return url
        }
      })
    )
    setter(signed)
  } catch (error_) {
    console.error('Error generating signed URLs:', error_)
  }
}

function getStatusColor(status: string) {
  const colors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    quote_sent: 'bg-blue-100 text-blue-800 border-blue-300',
    in_progress: 'bg-purple-100 text-purple-800 border-purple-300',
    revision: 'bg-orange-100 text-orange-800 border-orange-300',
    delivered: 'bg-teal-100 text-teal-800 border-teal-300',
    completed: 'bg-green-100 text-green-800 border-green-300',
    cancelled: 'bg-red-100 text-red-800 border-red-300',
  }
  return colors[status] || 'bg-gray-100 text-gray-800 border-gray-300'
}

export default function OrderManageForm({ order: initialOrder }: Readonly<OrderManageFormProps>) {
  const [order, setOrder] = useState(initialOrder)
  const [loading, setLoading] = useState(false)
  const [uploadingFiles, setUploadingFiles] = useState(false)
  const supabase = createClient()
  const router = useRouter()

  // Client user info attached to the order (if present)
  const clientUser = order?.clients || null

  const [formData, setFormData] = useState({
    status: order.status,
    quote_amount: order.quote_amount || '',
    paid_amount: order.paid_amount || '',
    payment_status: order.payment_status || 'pending',
    admin_notes: order.admin_notes || '',
  })

  const [clientFileUrls, setClientFileUrls] = useState<string[]>([])
  const [deliverableUrls, setDeliverableUrls] = useState<string[]>([])
  const [deletingFile, setDeletingFile] = useState<string | null>(null)

  // Extract timestamp from filename (format: timestamp_random.ext)
  function getFileUploadTime(url: string): string {
    const parts = url.split('/')
    const filename = parts.at(-1) || ''
    const timestampStr = filename.split('_')[0]
    const timestamp = Number.parseInt(timestampStr, 10)
    if (Number.isNaN(timestamp)) return 'Unknown'
    try {
      const date = new Date(timestamp)
      if (Number.isNaN(date.getTime())) return 'Unknown'
      return new Intl.DateTimeFormat('en-US', {
        month: '2-digit',
        day: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      }).format(date)
    } catch {
      return 'Unknown'
    }
  }

  async function handleDeleteFile(url: string) {
    if (!confirm('Are you sure you want to delete this file?')) return

    setDeletingFile(url)
    try {
      let filePath = url
      
      // If it's a full URL, extract the bucket-relative path
      if (url.includes('/order-files/')) {
        const parts = url.split('/order-files/')
        if (parts.length < 2) throw new Error('Invalid file URL')
        filePath = parts[1]
      }

      const res = await fetch('/api/delete-file', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath })
      })

      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to delete file')

      const updatedDeliverables = (order.deliverables || []).filter((u: string) => u !== url)
      const { error } = await supabase
        .from('orders')
        .update({ deliverables: updatedDeliverables })
        .eq('id', order.id)

      if (error) throw error

      setOrder({ ...order, deliverables: updatedDeliverables })
      showAppToast('File deleted successfully', 'success')
      router.refresh()
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Delete failed'
      showAppToast(`Error deleting file: ${message}`, 'error')
    } finally {
      setDeletingFile(null)
    }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    setUploadingFiles(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const uploadedUrls: string[] = []
      
      for (const file of files) {
        const fileExt = file.name.split('.').pop()
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`
        const filePath = `order-${order.id}/${fileName}`

        const { error: uploadError } = await supabase.storage
          .from('order-files')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false
          })

        if (uploadError) throw uploadError

        // Store the bucket-relative path, NOT the public URL (for private bucket)
        // The path format will be: order-<id>/<filename>
        uploadedUrls.push(filePath)
      }

      // Update order with new deliverables
      const updatedDeliverables = [...(order.deliverables || []), ...uploadedUrls]
      
      const { error: updateError } = await supabase
        .from('orders')
        .update({ 
          deliverables: updatedDeliverables,
          updated_at: new Date().toISOString()
        })
        .eq('id', order.id)

      if (updateError) throw updateError
      await notifyClientAboutUpload(supabase, clientUser, uploadedUrls, order)

      setOrder({ ...order, deliverables: updatedDeliverables })
      showAppToast(
        `${uploadedUrls.length} file(s) uploaded — client notified`,
        'success'
      )
      router.refresh()
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Upload failed'
      showAppToast(`Error uploading files: ${message}`, 'error')
    } finally {
      setUploadingFiles(false)
    }
  }

  // Create signed URLs when order changes
  useEffect(() => {
    if (order.files_uploaded && order.files_uploaded.length > 0) {
      generateSignedUrls(order.files_uploaded, setClientFileUrls)
    }
    if (order.deliverables && order.deliverables.length > 0) {
      generateSignedUrls(order.deliverables, setDeliverableUrls)
    }
  }, [order])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch('/api/admin/orders/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: order.id,
          status: formData.status,
          quote_amount: formData.quote_amount ? Number.parseFloat(formData.quote_amount) : null,
          paid_amount: formData.paid_amount ? Number.parseFloat(formData.paid_amount) : null,
          payment_status: formData.payment_status,
          admin_notes: formData.admin_notes,
        }),
      })

      if (!response.ok) {
        throw new Error(await parseApiError(response, 'Failed to update order'))
      }

      showAppToast('Order saved — client notified in dashboard', 'success')
      router.refresh()
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Save failed'
      showAppToast(`Could not save order: ${message}`, 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      {/* Order Details */}
      <div className="lg:col-span-2 space-y-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Order Details</h2>
          
          <div className="space-y-4">
            <div>
              <div className="text-sm font-bold text-gray-700 mb-1">Client</div>
              <div className="text-gray-900 font-semibold">
                {order.clients?.name} ({order.clients?.email})
              </div>
              {order.clients?.phone && (
                <div className="text-gray-600 text-sm">{order.clients.phone}</div>
              )}
            </div>

            <div>
              <div className="text-sm font-bold text-gray-700 mb-1">Service</div>
              <div className="text-gray-900">{order.services?.title || 'Custom Order'}</div>
            </div>

            <div>
              <div className="text-sm font-bold text-gray-700 mb-1">Title</div>
              <div className="text-gray-900 font-semibold">{order.title}</div>
            </div>

            {order.description && (
              <div>
                <div className="text-sm font-bold text-gray-700 mb-1">Description</div>
                <div className="text-gray-600 whitespace-pre-wrap">{order.description}</div>
              </div>
            )}

            {order.requirements && (
              <div>
                <div className="text-sm font-bold text-gray-700 mb-1">Requirements</div>
                <div className="text-gray-600 whitespace-pre-wrap">{order.requirements}</div>
              </div>
            )}

            <div className="grid md:grid-cols-2 gap-4">
              {order.word_count && (
                <div>
                  <div className="text-sm font-bold text-gray-700 mb-1">Word Count</div>
                  <div className="text-gray-900">
                    {order.word_count ? new Intl.NumberFormat('en-US').format(order.word_count) : '0'}
                  </div>
                </div>
              )}
              {order.deadline && (
                <div>
                  <div className="text-sm font-bold text-gray-700 mb-1">Deadline</div>
                  <div className="text-gray-900">
                    {order.deadline ? new Intl.DateTimeFormat('en-US', {
                      month: '2-digit',
                      day: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                      hour12: true,
                    }).format(new Date(order.deadline)) : 'N/A'}
                  </div>
                </div>
              )}
            </div>

            {/* Client Uploaded Files */}
            {clientFileUrls && clientFileUrls.length > 0 && (
              <div>
                <div className="text-sm font-bold text-gray-700 mb-2">Client Files</div>
                <div className="space-y-2">
                  {clientFileUrls.map((url: string, index: number) => (
                    <a
                      key={url}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-purple-700 hover:text-purple-800 font-semibold"
                    >
                      <FaFile /> Client File {index + 1}
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Deliverables */}
            {deliverableUrls && deliverableUrls.length > 0 && (
              <div className="bg-green-50 border-2 border-green-300 rounded-lg p-4">
                <div className="text-sm font-bold text-green-900 mb-3 flex items-center gap-2">
                  <FaDownload /> Delivered Files ({deliverableUrls.length})
                </div>
                <div className="space-y-3">
                  {deliverableUrls.map((url: string, index: number) => {
                    // Handle both signed URLs and bucket paths
                    let filename = `Deliverable ${index + 1}`
                    let uploadTime = 'Unknown'
                    let filePath = url

                    // Extract filename from signed URL or path
                    if (url.includes('?token=')) {
                      // Signed URL - extract path before token
                      const pathPart = url.split('?')[0]
                      const parts = pathPart.split('/order-files/')
                      if (parts[1]) {
                        filePath = parts[1]
                        const filenamePart = filePath.split('/').pop()
                        if (filenamePart) filename = filenamePart.split('_').slice(1).join('_') || filenamePart
                        uploadTime = getFileUploadTime(filePath)
                      }
                    } else if (url.startsWith('order-') || url.startsWith('revision-')) {
                      // Bucket-relative path
                      filePath = url
                      const filenamePart = filePath.split('/').pop()
                      if (filenamePart) filename = filenamePart.split('_').slice(1).join('_') || filenamePart
                      uploadTime = getFileUploadTime(filePath)
                    }

                    return (
                      <div
                        key={filePath || url}
                        className="bg-white px-4 py-3 rounded border border-green-300 flex items-center justify-between hover:shadow-md transition"
                      >
                        <div className="flex-1 min-w-0">
                          <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-green-700 hover:text-green-800 font-semibold text-sm block truncate"
                            title={filename}
                          >
                            📄 {filename}
                          </a>
                          <div className="text-xs text-gray-600 mt-1">
                            Uploaded: {uploadTime}
                          </div>
                        </div>
                        <button
                          onClick={() => handleDeleteFile(url)}
                          disabled={deletingFile === url}
                          className="ml-4 text-red-600 hover:text-red-700 disabled:opacity-50 p-2"
                          title="Delete file"
                        >
                          <FaTrash size={16} />
                        </button>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Upload Deliverables */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Upload Deliverables</h3>
          <div className="border-2 border-dashed border-purple-300 rounded-lg p-6 text-center">
            <input
              type="file"
              id="delivery-upload"
              multiple
              onChange={handleFileUpload}
              className="hidden"
              disabled={uploadingFiles}
            />
            <label
              htmlFor="delivery-upload"
              className="cursor-pointer inline-flex items-center gap-2 bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition font-semibold"
            >
              <FaUpload /> {uploadingFiles ? 'Uploading...' : 'Upload Files'}
            </label>
            <p className="text-sm text-gray-600 mt-3 font-medium">
              Upload completed work files for the client
            </p>
          </div>
        </div>

        {/* Revisions Panel */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Revision Requests</h3>
          <RevisionsPanel 
            orderId={order.id} 
            orderTitle={order.title}
            onUpdate={() => router.refresh()}
          />
        </div>

        {/* Client Messages */}
        <div>
          <AdminOrderChat 
            orderId={order.id}
            clientName={order.clients?.name || 'Client'}
          />
        </div>
      </div>

      {/* Management Form */}
      <div className="lg:col-span-1 space-y-4">
        <div className="bg-white rounded-lg shadow p-6">
          <AdminOrderRating orderId={order.id} />
        </div>
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 sticky top-4">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Manage Order: {order.title.length > 20 ? order.title.substring(0, 20) + '...' : order.title}</h2>

          <div className="space-y-4">
            <div>
              <label htmlFor="order-status" className="block text-sm font-bold text-gray-700 mb-2">
                Status *
              </label>
              <select
                id="order-status"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-gray-900 font-semibold"
              >
                <option value="pending">Pending</option>
                <option value="quote_sent">Quote Sent</option>
                <option value="in_progress">In Progress</option>
                <option value="revision">Revision</option>
                <option value="delivered">Delivered</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            <div>
              <label htmlFor="order-quote-amount" className="block text-sm font-bold text-gray-700 mb-2">
                Quote Amount ($)
              </label>
              <input
                id="order-quote-amount"
                type="number"
                step="0.01"
                value={formData.quote_amount}
                onChange={(e) => setFormData({ ...formData, quote_amount: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-gray-900 font-semibold"
                placeholder="0.00"
              />
            </div>

            <div>
              <label htmlFor="order-paid-amount" className="block text-sm font-bold text-gray-700 mb-2">
                Paid Amount ($)
              </label>
              <input
                id="order-paid-amount"
                type="number"
                step="0.01"
                value={formData.paid_amount}
                onChange={(e) => setFormData({ ...formData, paid_amount: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-gray-900 font-semibold"
                placeholder="0.00"
              />
            </div>

            <div>
              <label htmlFor="order-payment-status" className="block text-sm font-bold text-gray-700 mb-2">
                Payment Status
              </label>
              <select
                id="order-payment-status"
                value={formData.payment_status}
                onChange={(e) => setFormData({ ...formData, payment_status: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-gray-900 font-semibold"
              >
                <option value="pending">Pending</option>
                <option value="partial">Partially Paid</option>
                <option value="paid">Paid in Full</option>
              </select>
            </div>

            <div>
              <label htmlFor="order-admin-notes" className="block text-sm font-bold text-gray-700 mb-2">
                Admin Notes
              </label>
              <textarea
                id="order-admin-notes"
                rows={4}
                value={formData.admin_notes}
                onChange={(e) => setFormData({ ...formData, admin_notes: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-gray-900"
                placeholder="Internal notes about this order..."
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-purple-600 text-white py-3 rounded-lg font-semibold hover:bg-purple-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <FaSave /> {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
