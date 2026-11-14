import { isAdminUser } from '@/lib/auth/admin'
import { NextResponse } from 'next/server'
import { createClient as createSupabaseService } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'

interface FileRecord {
  order_id: string
  file_path: string
  created_at: string
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { daysOld = 30 } = body || {}

    // Check admin authorization
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || !isAdminUser(user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.NEXT_PUBLIC_SUPABASE_URL) {
      return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 })
    }

    const service = createSupabaseService(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    // Calculate cutoff date
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - daysOld)
    const cutoffISO = cutoffDate.toISOString()

    // Find old files from order_messages and revision_files
    const { data: messageFiles, error: msgError } = await service
      .from('order_messages')
      .select('id, order_id, file_attachments, created_at')
      .lt('created_at', cutoffISO)
      .not('file_attachments', 'is', null)

    if (msgError) throw msgError

    const { data: revisionFiles, error: revError } = await service
      .from('revision_files')
      .select('id, revision_id, file_path, created_at')
      .lt('created_at', cutoffISO)

    if (revError) throw revError

    // Also check for old deliverables in orders
    const { data: oldOrders, error: ordersError } = await service
      .from('orders')
      .select('id, deliverables, created_at')
      .lt('created_at', cutoffISO)
      .not('deliverables', 'is', null)

    if (ordersError) throw ordersError

    const filesToDelete: string[] = []
    const recordsToUpdate: Array<{ table: string; id: string; column: string }> = []

    // Collect files from message attachments
    messageFiles?.forEach((msg: any) => {
      if (msg.file_attachments && Array.isArray(msg.file_attachments)) {
        msg.file_attachments.forEach((filePath: string) => {
          filesToDelete.push(filePath)
          recordsToUpdate.push({
            table: 'order_messages',
            id: msg.id,
            column: 'file_attachments'
          })
        })
      }
    })

    // Collect files from revision_files
    revisionFiles?.forEach((rev: any) => {
      if (rev.file_path) {
        filesToDelete.push(rev.file_path)
        recordsToUpdate.push({
          table: 'revision_files',
          id: rev.id,
          column: 'file_path'
        })
      }
    })

    // Collect files from old deliverables
    oldOrders?.forEach((order: any) => {
      if (order.deliverables && Array.isArray(order.deliverables)) {
        order.deliverables.forEach((filePath: string) => {
          filesToDelete.push(filePath)
          recordsToUpdate.push({
            table: 'orders',
            id: order.id,
            column: 'deliverables'
          })
        })
      }
    })

    // Remove duplicates
    const uniqueFiles = Array.from(new Set(filesToDelete))

    // Delete files from storage
    let deletedCount = 0
    const deleteErrors: string[] = []

    for (const filePath of uniqueFiles) {
      try {
        const { error } = await service.storage
          .from('order-files')
          .remove([filePath])
        
        if (error) {
          deleteErrors.push(`${filePath}: ${error.message}`)
        } else {
          deletedCount++
        }
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : 'Unknown error'
        deleteErrors.push(`${filePath}: ${errMsg}`)
      }
    }

    // Update database records to remove file references
    let updatedRecords = 0

    // Update message files (clear file_attachments for old messages)
    if (messageFiles && messageFiles.length > 0) {
      const { error } = await service
        .from('order_messages')
        .update({ file_attachments: null })
        .lt('created_at', cutoffISO)
        .not('file_attachments', 'is', null)
      
      if (!error) updatedRecords += messageFiles.length
    }

    // Delete old revision files (they're references to deleted files)
    if (revisionFiles && revisionFiles.length > 0) {
      const { error } = await service
        .from('revision_files')
        .delete()
        .lt('created_at', cutoffISO)
      
      if (!error) updatedRecords += revisionFiles.length
    }

    // Update old orders to remove deliverables
    if (oldOrders && oldOrders.length > 0) {
      const { error } = await service
        .from('orders')
        .update({ deliverables: null })
        .lt('created_at', cutoffISO)
        .not('deliverables', 'is', null)
      
      if (!error) updatedRecords += oldOrders.length
    }

    return NextResponse.json({
      success: true,
      summary: {
        filesDeleted: deletedCount,
        totalFiles: uniqueFiles.length,
        recordsUpdated: updatedRecords,
        cutoffDate: cutoffISO,
        daysOld,
        errors: deleteErrors.length > 0 ? deleteErrors : undefined
      }
    })
  } catch (err: any) {
    console.error('Delete old files error:', err)
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 })
  }
}

// GET endpoint to preview what files would be deleted
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const daysOld = parseInt(searchParams.get('daysOld') || '30', 10)

    // Check admin authorization
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || !isAdminUser(user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.NEXT_PUBLIC_SUPABASE_URL) {
      return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 })
    }

    const service = createSupabaseService(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    // Calculate cutoff date
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - daysOld)
    const cutoffISO = cutoffDate.toISOString()

    // Preview files that would be deleted
    const { data: messageFiles } = await service
      .from('order_messages')
      .select('id, order_id, file_attachments, created_at')
      .lt('created_at', cutoffISO)
      .not('file_attachments', 'is', null)
      .limit(100)

    const { data: revisionFiles } = await service
      .from('revision_files')
      .select('id, revision_id, file_path, created_at')
      .lt('created_at', cutoffISO)
      .limit(100)

    const { data: oldOrders } = await service
      .from('orders')
      .select('id, deliverables, created_at')
      .lt('created_at', cutoffISO)
      .not('deliverables', 'is', null)
      .limit(100)

    const filePaths: string[] = []
    
    messageFiles?.forEach((msg: any) => {
      if (msg.file_attachments && Array.isArray(msg.file_attachments)) {
        msg.file_attachments.forEach((fp: string) => filePaths.push(fp))
      }
    })

    revisionFiles?.forEach((rev: any) => {
      if (rev.file_path) filePaths.push(rev.file_path)
    })

    oldOrders?.forEach((order: any) => {
      if (order.deliverables && Array.isArray(order.deliverables)) {
        order.deliverables.forEach((fp: string) => filePaths.push(fp))
      }
    })

    const uniqueFiles = Array.from(new Set(filePaths))

    return NextResponse.json({
      cutoffDate: cutoffISO,
      daysOld,
      preview: {
        messageFilesCount: messageFiles?.length || 0,
        revisionFilesCount: revisionFiles?.length || 0,
        orderDeliverableRecords: oldOrders?.length || 0,
        totalUniqueFiles: uniqueFiles.length,
        sampleFiles: uniqueFiles.slice(0, 10)
      }
    })
  } catch (err: any) {
    console.error('Preview old files error:', err)
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 })
  }
}
