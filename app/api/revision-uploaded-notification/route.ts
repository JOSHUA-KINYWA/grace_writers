import { NextResponse } from 'next/server'
import { sendRevisionUploadedNotification } from '@/lib/notifications/revision-upload'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { revisionId, uploadedByUserId } = body

    if (!revisionId || !uploadedByUserId) {
      return NextResponse.json(
        { error: 'Missing revisionId or uploadedByUserId' },
        { status: 400 }
      )
    }

    try {
      await sendRevisionUploadedNotification(revisionId, uploadedByUserId)
    } catch (emailErr) {
      console.error('Error sending revision notification:', emailErr)
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err))
    console.error('Revision notification error:', error)
    return NextResponse.json(
      { error: error.message || 'Server error' },
      { status: 500 }
    )
  }
}
