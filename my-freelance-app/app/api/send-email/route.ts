import nodemailer from 'nodemailer'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { to, subject, text, html } = body || {}

    if (!to || !subject || (!text && !html)) {
      return NextResponse.json({ error: 'Missing to/subject/text/html' }, { status: 400 })
    }

    const user = process.env.GMAIL_USER
    const pass = process.env.GMAIL_PASS

    if (!user || !pass) {
      console.error('GMAIL_USER or GMAIL_PASS not set in environment')
      return NextResponse.json({ error: 'Email not configured on server' }, { status: 500 })
    }

    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: {
        user,
        pass,
      },
    })

    const info = await transporter.sendMail({
      from: `Grace Writers <${user}>`,
      to,
      subject,
      text,
      html,
    })

    return NextResponse.json({ success: true, messageId: info.messageId })
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err))
    console.error('Send email exception:', error)
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 })
  }
}
