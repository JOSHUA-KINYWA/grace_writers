import { NextResponse, NextRequest } from 'next/server'
import { createClient as createSupabaseService } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    // Get current user from server client
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const contentType = req.headers.get('content-type') || ''

    // Support two caller types:
    // 1) JSON body callers (client already uploaded to storage and provides filePath/fileName)
    // 2) multipart/form-data callers (send file, revisionId, orderId)

    if (contentType.includes('application/json')) {
      const body = await req.json()
      const { revisionId, filePath, fileName, orderId } = body || {}

      if (!revisionId || !filePath || !fileName || !orderId) {
        return NextResponse.json({ error: 'Missing required fields in JSON: revisionId, filePath, fileName, orderId' }, { status: 400 })
      }

      // Verify revision exists
      const { data: revision, error: revError } = await supabase
        .from('revisions')
        .select('id, order_id')
        .eq('id', revisionId)
        .single()

      if (revError || !revision) {
        return NextResponse.json({ error: 'Revision not found' }, { status: 404 })
      }

      // Record the file in revision_files table
      const { data: revisionFile, error: insertError } = await supabase
        .from('revision_files')
        .insert({
          revision_id: revisionId,
          file_path: filePath,
          file_name: fileName,
          uploaded_by: user.id,
        })
        .select()
        .single()

      if (insertError) {
        console.error('Database insert error (JSON):', insertError)
        return NextResponse.json({ error: insertError.message }, { status: 500 })
      }

      // Send notification to client about revision upload
      try {
        await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/revision-uploaded-notification`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ revisionId }),
        })
      } catch (notifyErr) {
        console.error('Failed to send revision notification:', notifyErr)
      }

      return NextResponse.json({ success: true, revisionFile, fileName, filePath })
    }

    // multipart/form-data branch
    const formData = await req.formData()
    const file = formData.get('file') as File
    const revisionId = formData.get('revisionId') as string
    const orderId = formData.get('orderId') as string

    if (!file || !revisionId || !orderId) {
      return NextResponse.json(
        { error: 'Missing required fields: file, revisionId, orderId' },
        { status: 400 }
      )
    }

    const service = createSupabaseService(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Verify revision exists
    const { data: revision, error: revError } = await service
      .from('revisions')
      .select('id, order_id')
      .eq('id', revisionId)
      .single()

    if (revError || !revision) {
      return NextResponse.json(
        { error: 'Revision not found' },
        { status: 404 }
      )
    }

    // Upload file to storage

    const fileBuffer = await file.arrayBuffer()
    const fileName = `${Date.now()}_${file.name}`
    const filePath = `revision-${revisionId}/${fileName}`

    const { error: uploadError } = await service.storage
      .from('order-files')
      .upload(filePath, fileBuffer, {
        contentType: file.type,
        upsert: false,
      })

    if (uploadError) {
      console.error('Storage upload error:', uploadError)
      return NextResponse.json({ error: 'Failed to upload file to storage' }, { status: 500 })
    }

    // Record the file in revision_files table
    const { data: revisionFile, error: insertError } = await service
      .from('revision_files')
      .insert({
        revision_id: revisionId,
        file_path: filePath,
        file_name: file.name,
        uploaded_by: user.id,
      })
      .select()
      .single()

    if (insertError) {
      console.error('Database insert error:', insertError)
      return NextResponse.json(
        { error: insertError.message },
        { status: 500 }
      )
    }

    // Send notification to client about revision upload
    try {
      await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/revision-uploaded-notification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ revisionId }),
      })
    } catch (notifyErr) {
      console.error('Failed to send revision notification:', notifyErr)
    }

    return NextResponse.json({
      success: true,
      revisionFile,
      fileName: file.name,
      filePath
    })
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err))
    console.error('Upload revision file error:', error)
    return NextResponse.json(
      { error: error.message || 'Server error' },
      { status: 500 }
    )
  }
}
