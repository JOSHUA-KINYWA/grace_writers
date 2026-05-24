const fs = require('fs')
const path = require('path')
const { createClient } = require('@supabase/supabase-js')
const http = require('http')

function parseEnv(file) {
  const txt = fs.readFileSync(file, 'utf8')
  const lines = txt.split(/\r?\n/)
  const out = {}
  for (const l of lines) {
    const m = l.match(/^\s*([A-Za-z0-9_]+)=(.*)$/)
    if (m) out[m[1]] = m[2].replace(/^"|"$/g, '')
  }
  return out
}

async function main() {
  const envFile = path.resolve(__dirname, '..', '.env.local')
  if (!fs.existsSync(envFile)) {
    console.error('.env.local not found')
    process.exit(1)
  }
  const env = parseEnv(envFile)
  const url = env.NEXT_PUBLIC_SUPABASE_URL
  const anon = env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anon) {
    console.error('Missing Supabase URL or anon key in .env.local')
    process.exit(1)
  }

  const supabase = createClient(url, anon)

  const timestamp = Date.now()
  // Build test email using the domain part of the configured GMAIL_USER if available
  const gmail = env.GMAIL_USER || ''
  const domain = gmail.includes('@') ? gmail.split('@')[1] : 'example.com'
  const testEmail = `e2e+${timestamp}@${domain}`
  const origPwd = 'TestPass123!'
  const newPwd = 'NewPass123!'

  console.log('Creating test user:', testEmail)
  try {
    const signUpRes = await supabase.auth.signUp({ email: testEmail, password: origPwd })
    console.log('signUp:', signUpRes.error || 'ok')

    // Sign in
    const signIn = await supabase.auth.signInWithPassword({ email: testEmail, password: origPwd })
    if (signIn.error) throw signIn.error
    console.log('signIn ok')

    // Update password
    const update = await supabase.auth.updateUser({ password: newPwd })
    if (update.error) throw update.error
    console.log('updateUser ok')

    // Trigger server email endpoint
    const payload = JSON.stringify({ to: testEmail, subject: 'E2E Password Changed', text: 'Your password changed', html: '<p>Your password changed</p>' })
    const opts = {
      hostname: 'localhost', port: 3000, path: '/api/send-email', method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) }
    }
    await new Promise((resolve, reject) => {
      const req = http.request(opts, (res) => {
        let body = ''
        res.on('data', (c) => body += c)
        res.on('end', () => {
          console.log('send-email status', res.statusCode, 'body', body)
          resolve()
        })
      })
      req.on('error', reject)
      req.write(payload)
      req.end()
    })

    console.log('E2E script finished')
  } catch (e) {
    console.error('E2E failed:', e)
    process.exit(1)
  }
}

main()
