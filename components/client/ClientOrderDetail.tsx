'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { FaArrowLeft, FaClipboardList, FaFile, FaCheckCircle, FaComments, FaUpload } from 'react-icons/fa'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import OrderChatEnhanced from '@/components/OrderChatEnhanced'
import OrderRating from '@/components/OrderRating'
import ClientOrderLayout from '@/components/client/ClientOrderLayout'
import OrderFilesTable, { type OrderFileLink } from '@/components/client/OrderFilesTable'
import { formatDate, formatDateTime } from '@/lib/utils/formatDate'
import { formatOrderId } from '@/lib/utils/formatOrderId'

interface ClientOrderDetailProps {
  order: any
  clientId: string
}

export default function ClientOrderDetail({ order: initialOrder, clientId }: ClientOrderDetailProps) {
  const [order, setOrder] = useState(initialOrder)
  const [loading, setLoading] = useState(false)
  const [paypalLoaded, setPaypalLoaded] = useState(false)
  const [paypalError, setPaypalError] = useState<string | null>(null)
  const [paypalProcessing, setPaypalProcessing] = useState(false)
  const [paymentComplete, setPaymentComplete] = useState(false)
  const searchParams = useSearchParams()
  const selectedMessageId = searchParams?.get('messageId') ?? undefined
  const [showChat, setShowChat] = useState(Boolean(selectedMessageId))
  const [revisions, setRevisions] = useState<any[]>([])
  const [revisionReason, setRevisionReason] = useState('')
  const [revisionFiles, setRevisionFiles] = useState<File[]>([])
  const [requestingRevision, setRequestingRevision] = useState(false)
  const [uploadingRevisionFiles, setUploadingRevisionFiles] = useState(false)
  const [deliverableUrls, setDeliverableUrls] = useState<string[]>([])
  const [clientFileUrls, setClientFileUrls] = useState<string[]>([])
  const supabase = createClient()
  const router = useRouter()

  const quoteAmount = Number(order.quote_amount ?? 0)
  const paidAmount = Number(order.paid_amount ?? 0)
  const outstandingAmount = Math.max(quoteAmount - paidAmount, 0)
  const showPayPalSection = outstandingAmount > 0 && order.status !== 'cancelled'

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)

  useEffect(() => {
    if (!showPayPalSection) return

    const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID
    if (!clientId) {
      setPaypalError('PayPal client ID is not configured.')
      return
    }

    const scriptId = 'paypal-js'
    const existing = document.getElementById(scriptId)
    if (existing) {
      setPaypalLoaded(true)
      return
    }

    const script = document.createElement('script')
    script.id = scriptId
    script.src = `https://www.paypal.com/sdk/js?client-id=${clientId}&currency=USD`
    script.async = true
    script.onload = () => setPaypalLoaded(true)
    script.onerror = () => setPaypalError('Failed to load PayPal checkout.')
    document.body.appendChild(script)
  }, [showPayPalSection])

  useEffect(() => {
    if (!showPayPalSection || !paypalLoaded) return
    if (typeof window === 'undefined') return

    const container = document.getElementById('paypal-button-container')
    if (!container || container.children.length > 0) return

    const paypal = (window as any).paypal
    if (!paypal) {
      setPaypalError('PayPal checkout is unavailable.')
      return
    }

    paypal.Buttons({
      style: { layout: 'vertical', color: 'gold', shape: 'rect', label: 'pay' },
      createOrder: async () => {
        setPaypalError(null)

        const response = await fetch('/api/paypal/create-order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId: order.id }),
        })

        const data = await response.json()
        if (!response.ok) {
          throw new Error(data?.error || 'Unable to create PayPal order.')
        }

        return data.orderID
      },
      onApprove: async (data: any) => {
        setPaypalProcessing(true)
        setPaypalError(null)

        try {
          const response = await fetch('/api/paypal/capture-order', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orderId: order.id, paypalOrderId: data.orderID }),
          })

          const responseData = await response.json()
          if (!response.ok) {
            throw new Error(responseData?.error || 'Failed to capture payment.')
          }

          setOrder({
            ...order,
            paid_amount: responseData.paidAmount,
            payment_status: responseData.paymentStatus,
          })
          setPaymentComplete(true)
          setPaypalProcessing(false)
          setTimeout(() => setPaymentComplete(false), 4000)
        } catch (err: any) {
          setPaypalError(err?.message || 'Payment capture failed.')
          setPaypalProcessing(false)
        }
      },
      onError: (err: any) => {
        setPaypalError(String(err || 'PayPal checkout error'))
      },
      onCancel: () => {
        setPaypalError('PayPal payment was cancelled.')
      },
    }).render(container)
  }, [showPayPalSection, paypalLoaded, order.id])

  // Extract timestamp from filename
  function getFileUploadTime(url: string): string {
    const parts = url.split('/')
    const filename = parts[parts.length - 1]
    const timestampStr = filename.split('_')[0]
    const timestamp = parseInt(timestampStr)
    if (isNaN(timestamp)) return 'Unknown'
    try {
      return formatDateTime(new Date(timestamp))
    } catch {
      return 'Unknown'
    }
  }

  function getDisplayFileName(filePathOrUrl: string, fallback: string) {
    try {
      let raw = filePathOrUrl
      if (raw.includes('?')) raw = raw.split('?')[0]
      const last = raw.split('/').pop() || ''
      // Our uploads follow: <timestamp>_<rand>_<originalName>
      const parts = last.split('_')
      if (parts.length >= 3) return decodeURIComponent(parts.slice(2).join('_'))
      return decodeURIComponent(last) || fallback
    } catch {
      return fallback
    }
  }

  const normalizeStatus = (status: string) =>
    status === 'delivered' ? 'completed' : status

  const getProgressPercent = (status: string) => {
    const s = normalizeStatus(status)
    switch (s) {
      case 'pending':
      case 'quote_sent':
        return 20
      case 'in_progress':
        return 45
      case 'revision':
        return 60
      case 'completed':
        return 100
      default:
        return 0
    }
  }

  const getStatusSummary = (status: string) => {
    const s = normalizeStatus(status)
    switch (s) {
      case 'pending':
        return 'Your request is waiting for admin approval before work begins.'
      case 'quote_sent':
        return 'Our team has reviewed your request. Check messages for next steps.'
      case 'in_progress':
        return 'The writing team is working on your order right now.'
      case 'revision':
        return 'A revision request is active. We are updating your deliverables.'
      case 'completed':
        return 'This order is complete. Download files and leave feedback if you wish.'
      default:
        return 'Order status is being updated. Check back for the latest progress.'
    }
  }

  useEffect(() => {
    if (searchParams?.get('showChat') === 'true') {
      setShowChat(true)
    }

    // Generate signed URLs for deliverables
    if (order.deliverables && order.deliverables.length > 0) {
      generateSignedUrls(order.deliverables, setDeliverableUrls)
    }
    
    // Generate signed URLs for client files
    if (order.files_uploaded && order.files_uploaded.length > 0) {
      generateSignedUrls(order.files_uploaded, setClientFileUrls)
    }

    // Fetch revisions
    fetchRevisions()
  }, [order])

  async function fetchRevisions() {
    try {
      const { data, error } = await supabase
        .from('revisions')
        .select(`
          *,
          revision_files(*)
        `)
        .eq('order_id', order.id)
        .order('revision_number', { ascending: false })
      
      if (!error && data) {
        setRevisions(data)
      }
    } catch (err) {
      console.error('Error fetching revisions:', err)
    }
  }

  async function generateSignedUrls(urls: string[], setter: (urls: string[]) => void) {
    try {
      const signedUrls = await Promise.all(
        urls.map(async (url) => {
          try {
            let filePath = url
            if (url.includes('/order-files/')) {
              const urlParts = url.split('/order-files/')
              if (urlParts.length >= 2) {
                filePath = urlParts[1]
              }
            }
            
            const response = await fetch('/api/signed-url', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ filePath })
            })

            if (!response.ok) {
              console.error(`Failed to generate signed URL (${response.status}):`, filePath)
              return url
            }

            const data = await response.json()
            return data.signedUrl || url
          } catch (err) {
            console.error('Error creating signed URL:', err)
            return url
          }
        })
      )
      setter(signedUrls)
    } catch (error) {
      console.error('Error generating signed URLs:', error)
    }
  }

  async function requestRevisionSubmit() {
    if (!revisionReason.trim()) {
      alert('Please describe the revisions you need')
      return
    }

    setRequestingRevision(true)
    try {
      const response = await fetch('/api/request-revision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: order.id,
          reason: revisionReason
        })
      })

      const data = await response.json().catch(() => null)
      console.log('Revision response:', { status: response.ok, data })
      
      if (!response.ok) {
        const errorMsg = data?.error || `Failed to request revision (${response.status})`
        throw new Error(errorMsg)
      }

      // Verify revision ID was returned
      if (!data.revisionId) {
        throw new Error('Server did not return revision ID')
      }

      // Upload files if any were selected
      if (revisionFiles.length > 0) {
        setUploadingRevisionFiles(true)
        await uploadRevisionFiles(data.revisionId)
        setUploadingRevisionFiles(false)
      }

      alert(`✓ Revision #${data.revisionNumber} has been requested!`)
      setRevisionReason('')
      setRevisionFiles([])
      // Update order status to 'revision'
      setOrder({ ...order, status: 'revision' })
      await fetchRevisions()
      router.refresh()
    } catch (error: any) {
      const errorMsg = error?.message || error?.toString?.() || 'Failed to request revision'
      alert(`Error requesting revision: ${errorMsg}`)
      console.error('Revision request error:', error)
    } finally {
      setRequestingRevision(false)
      setUploadingRevisionFiles(false)
    }
  }

  async function uploadRevisionFiles(revisionId: string) {
    if (revisionFiles.length === 0) return

    try {
      for (const file of revisionFiles) {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('revisionId', revisionId)
        formData.append('orderId', order.id)

        const response = await fetch('/api/upload-revision-file', {
          method: 'POST',
          body: formData
        })

        if (!response.ok) {
          const data = await response.json().catch(() => null)
          throw new Error(data?.error || `Failed to upload file ${file.name} (${response.status})`)
        }
      }

      console.log('All revision files uploaded successfully')
    } catch (error) {
      console.error('Error uploading revision files:', error)
      throw error
    }
  }

  async function markAsCompleted() {
    if (!confirm('Mark this order as completed?')) {
      return
    }

    setLoading(true)
    try {
      const { error } = await supabase
        .from('orders')
        .update({ 
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', order.id)

      if (error) throw error

      setOrder({ ...order, status: 'completed', completed_at: new Date().toISOString() })
      alert('Order marked as completed!')
      router.refresh()
    } catch (error: any) {
      alert(`Error: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  function getStatusColor(status: string) {
    const colors: any = {
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

  const normalizedStatus = normalizeStatus(order.status)

  // Allow revision requests for any order with deliverables
  const canRequestRevision = order.deliverables && order.deliverables.length > 0 && order.status !== 'cancelled'

  const attachedFileLinks: OrderFileLink[] = clientFileUrls.map((url, idx) => {
    const original = order.files_uploaded?.[idx] || url
    return {
      href: url,
      name: getDisplayFileName(original, `Attachment ${idx + 1}`),
    }
  })

  const uploadedFileLinks: OrderFileLink[] = deliverableUrls.map((url, idx) => {
    const original = order.deliverables?.[idx] || url
    return {
      href: url,
      name: getDisplayFileName(original, `Deliverable ${idx + 1}`),
    }
  })

  const revisionFileLinks: OrderFileLink[] = revisions.flatMap((rev) =>
    (rev.revision_files || []).map((file: { id: string; file_path: string; file_name: string }) => ({
      href: `/api/signed-url?filePath=${encodeURIComponent(file.file_path)}`,
      name: file.file_name,
      onClick: (e: React.MouseEvent<HTMLAnchorElement>) => {
        e.preventDefault()
        import('@/lib/utils/downloadFile').then((m) => m.default(file.file_path, file.file_name))
      },
    }))
  )

  const hasAnyFiles =
    attachedFileLinks.length > 0 || uploadedFileLinks.length > 0 || revisionFileLinks.length > 0

  return (
    <div className="min-h-screen bg-gray-50 py-4 sm:py-8 px-3 sm:px-4 overflow-x-hidden">
      <div className="max-w-7xl mx-auto w-full min-w-0">
        <Link href="/dashboard" className="inline-flex items-center gap-2 text-purple-700 hover:text-purple-800 mb-6 font-bold">
          <FaArrowLeft /> Back to Dashboard
        </Link>

        <ClientOrderLayout revisionCount={revisions.length} orderStatus={order.status}>
          <div className="space-y-6">
            {/* Order Overview */}
            <div className="grid gap-4 sm:gap-6 grid-cols-1 xl:grid-cols-[1.6fr_0.9fr]">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 mb-2 break-words">{order.title}</h1>
                    <span className={`inline-flex items-center gap-2 px-3 py-1 text-sm rounded-full font-bold border-2 ${getStatusColor(order.status)}`}>
                      <FaClipboardList />
                      {order.status.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm sm:text-right">
                    <div>
                      <p className="text-gray-600">Service</p>
                      <p className="font-semibold text-gray-900">{order.services?.title || 'Custom'}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Deadline</p>
                      <p className="font-semibold text-gray-900">{order.deadline ? formatDate(order.deadline) : 'No deadline'}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Revisions</p>
                      <p className="font-semibold text-gray-900">{revisions.length}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Created</p>
                      <p className="font-semibold text-gray-900">{formatDate(order.created_at)}</p>
                    </div>
                  </div>
                </div>

                <div className="mt-6">
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <p className="text-sm uppercase tracking-wide text-slate-500">Project progress</p>
                    <p className="text-sm font-semibold text-slate-900">{getProgressPercent(order.status)}%</p>
                  </div>
                  <div className="h-3 rounded-full bg-slate-200 overflow-hidden">
                    <div className="h-full rounded-full bg-gradient-to-r from-purple-600 to-blue-500" style={{ width: `${getProgressPercent(order.status)}%` }} />
                  </div>
                  <p className="mt-3 text-sm text-slate-600">{getStatusSummary(order.status)}</p>
                </div>

                <div className="mt-6 grid gap-3 sm:grid-cols-3 text-sm">
                  <div className="rounded-lg border border-slate-200 p-4 bg-slate-50">
                    <p className="text-slate-500">Order number</p>
                    <p className="mt-1 font-semibold text-slate-900">{formatOrderId(order.id)}</p>
                  </div>
                  <div className="rounded-lg border border-slate-200 p-4 bg-slate-50">
                    <p className="text-slate-500">Current step</p>
                    <p className="mt-1 font-semibold text-slate-900">{order.status.replace(/_/g, ' ').replace(/\b\w/g, (char: string) => char.toUpperCase())}</p>
                  </div>
                  <div className="rounded-lg border border-slate-200 p-4 bg-slate-50">
                    <p className="text-slate-500">Last update</p>
                    <p className="mt-1 font-semibold text-slate-900">{formatDateTime(order.updated_at || order.created_at)}</p>
                  </div>
                </div>
              </div>

              <aside className="space-y-6">
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Project snapshot</h2>
                  <div className="space-y-3 text-sm text-slate-700">
                    <div className="flex items-center justify-between gap-2">
                      <span>Writer</span>
                      <span className="font-semibold text-slate-900">Grace Writers Team</span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span>Order type</span>
                      <span className="font-semibold text-slate-900">{order.services?.title || 'Custom Delivery'}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span>Word count</span>
                      <span className="font-semibold text-slate-900">{order.word_count ? order.word_count.toLocaleString() : 'N/A'}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Payment summary</h2>
                  <div className="space-y-3 text-sm text-slate-700">
                    <div className="flex items-center justify-between gap-2">
                      <span>Quote</span>
                      <span className="font-semibold text-slate-900">{formatCurrency(quoteAmount)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span>Paid</span>
                      <span className="font-semibold text-slate-900">{formatCurrency(paidAmount)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span>Outstanding</span>
                      <span className="font-semibold text-slate-900">{formatCurrency(outstandingAmount)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span>Status</span>
                      <span className="font-semibold text-slate-900">{order.payment_status || 'pending'}</span>
                    </div>
                  </div>
                </div>

                {showPayPalSection && (
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-3">Pay with PayPal</h2>
                    <p className="text-sm text-slate-600 mb-4">
                      Complete your payment securely for the remaining balance.
                    </p>
                    {paypalError && (
                      <p className="text-sm text-red-600 mb-3">{paypalError}</p>
                    )}
                    {paymentComplete && (
                      <p className="text-sm text-green-600 mb-3">Payment completed successfully.</p>
                    )}
                    <div id="paypal-button-container" className="w-full" />
                    {!paypalLoaded && !paypalError && (
                      <p className="text-sm text-slate-500 mt-3">Loading PayPal checkout...</p>
                    )}
                    {paypalProcessing && (
                      <p className="text-sm text-slate-700 mt-3">Processing payment...</p>
                    )}
                  </div>
                )}
              </aside>
            </div>

            {/* Order Details */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-4">
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Deadline</h3>
                <p className="text-gray-700">{order.deadline ? formatDate(order.deadline) : 'No deadline'}</p>
              </div>
              {order.description && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Description</h3>
                  <p className="text-gray-700 whitespace-pre-wrap">{order.description}</p>
                </div>
              )}
              {order.requirements && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Requirements</h3>
                  <p className="text-gray-700 whitespace-pre-wrap">{order.requirements}</p>
                </div>
              )}
            </div>

            {/* ACTION BUTTONS - PROMINENT SECTION */}
            {(normalizedStatus === 'completed' || normalizedStatus === 'revision') && (
              <div className="bg-gradient-to-r from-purple-50 to-orange-50 rounded-lg border-2 border-purple-300 p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-4">✨ What&apos;s Next?</h2>
                <div className="grid md:grid-cols-2 gap-4">
                  {canRequestRevision && (
                    <button
                      onClick={() => {
                        const element = document.getElementById('revision-section')
                        if (element) {
                          element.scrollIntoView({ behavior: 'smooth' })
                        }
                      }}
                      className="bg-orange-600 text-white py-4 rounded-lg font-bold hover:bg-orange-700 transition flex items-center justify-center gap-2 text-lg"
                    >
                      📝 Request Revision
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Files Section */}
            {hasAnyFiles && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <OrderFilesTable
                  attached={attachedFileLinks}
                  uploaded={uploadedFileLinks}
                  revision={revisionFileLinks}
                />
              </div>
            )}

            {/* Request Revision Panel */}
            {canRequestRevision && (
              <div id="revision-section" className="bg-orange-50 rounded-lg border-2 border-orange-200 p-6">
                <h3 className="font-semibold text-orange-900 mb-3">📝 Need Changes?</h3>
                <textarea
                  value={revisionReason}
                  onChange={(e) => setRevisionReason(e.target.value)}
                  placeholder="Describe the revisions you need..."
                  className="w-full px-3 py-2 border border-orange-300 rounded-lg text-sm mb-3 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  rows={4}
                />
                
                {/* File Upload Section */}
                <div className="mt-3 mb-3 border-2 border-dashed border-orange-300 rounded-lg p-4 bg-white">
                  <label htmlFor="revision-files" className="block text-sm font-semibold text-orange-900 mb-2 cursor-pointer">
                    <FaUpload className="inline mr-2" /> Attach Supporting Files (Optional)
                  </label>
                  <input
                    type="file"
                    id="revision-files"
                    multiple
                    onChange={(e) => setRevisionFiles(Array.from(e.target.files || []))}
                    className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-orange-600 file:text-white hover:file:bg-orange-700 transition"
                  />
                  {revisionFiles.length > 0 && (
                    <div className="mt-2 text-sm text-orange-700">
                      <strong>{revisionFiles.length}</strong> file(s) selected: {revisionFiles.map(f => f.name).join(', ')}
                    </div>
                  )}
                </div>
                
                <button
                  onClick={requestRevisionSubmit}
                  disabled={requestingRevision || !revisionReason.trim()}
                  className="w-full bg-orange-600 text-white py-2 rounded-lg font-bold hover:bg-orange-700 transition disabled:opacity-50"
                >
                  {requestingRevision ? (uploadingRevisionFiles ? 'Uploading Files...' : 'Sending...') : 'Submit Revision Request'}
                </button>
              </div>
            )}

            {/* Revision Info Section */}
            {revisions.length > 0 && (
              <div className="bg-orange-50 rounded-lg border border-orange-200 p-6">
                <h3 className="font-semibold text-orange-900 mb-4 text-lg">📋 Revision Info</h3>
                <div className="space-y-4">
                  {revisions.map((rev: any, idx: number) => (
                    <div key={rev.id} className="border-l-4 border-orange-400 pl-4 py-2 bg-white rounded p-3 border">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-bold text-orange-900">Revision #{rev.revision_number}</p>
                          <p className="text-xs text-orange-700 mt-1">{formatDateTime(rev.created_at)}</p>
                        </div>
                        <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                          rev.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          rev.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {rev.status.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 bg-gray-50 p-2 rounded border border-orange-100 mt-2"><strong>Request:</strong> {rev.requested_reason}</p>
                      
                      {/* Revision Files */}
                      {rev.revision_files && rev.revision_files.length > 0 && (
                        <div className="mt-3">
                          <p className="text-xs font-bold text-orange-700 uppercase mb-2">Uploaded Files:</p>
                          <div className="space-y-1">
                            {rev.revision_files.map((file: any) => (
                              <a 
                                key={file.id} 
                                href={`/api/signed-url?filePath=${encodeURIComponent(file.file_path)}`} 
                                download={file.file_name} 
                                className="text-blue-600 hover:text-blue-800 text-sm flex items-center gap-2"
                              >
                                <FaFile size={12} /> {file.file_name}
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Chat Section */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-blue-50">
                <button
                  onClick={() => setShowChat(!showChat)}
                  className="flex items-center gap-2 font-semibold text-gray-900 hover:text-purple-700 transition w-full justify-between"
                >
                  <span className="flex items-center gap-2">
                    <FaComments /> Messages & Support
                  </span>
                  <span className="text-sm">{showChat ? '▼' : '▶'}</span>
                </button>
              </div>
              {showChat && (
                <div className="p-6">
                  <OrderChatEnhanced key={order.id} orderId={order.id} selectedMessageId={selectedMessageId} />
                </div>
              )}
            </div>

            {/* Rating — available once work is delivered or the order is complete */}
            {['completed', 'revision'].includes(normalizedStatus) && (
              <OrderRating orderId={order.id} />
            )}

            {/* Info Panel */}
            <div className="bg-gray-50 rounded-lg border border-gray-200 p-6 text-sm text-gray-700 space-y-2">
              <p>📅 <strong>Created:</strong> {formatDate(order.created_at)}</p>
              {order.completed_at && <p>✓ <strong>Completed:</strong> {formatDate(order.completed_at)}</p>}
            </div>
          </div>
        </ClientOrderLayout>
      </div>
    </div>
  )
}
