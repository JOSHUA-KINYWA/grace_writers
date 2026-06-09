import fs from 'fs'
import path from 'path'

// Load .env.local if present (simple parser, avoids adding dotenv dependency)
try {
  const envPath = path.resolve(process.cwd(), '.env.local')
  if (fs.existsSync(envPath)) {
    const raw = fs.readFileSync(envPath, 'utf8')
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const idx = trimmed.indexOf('=')
      if (idx === -1) continue
      const key = trimmed.slice(0, idx)
      const val = trimmed.slice(idx + 1)
      // Preserve existing env values; strip surrounding quotes if any
      if (!process.env[key]) {
        process.env[key] = val.replace(/^\"|\"$/g, '')
      }
    }
  }
} catch (e) {
  // ignore
}

const PAYPAL_MODE = process.env.PAYPAL_MODE === 'live' ? 'live' : 'sandbox'
const PAYPAL_BASE_URL = PAYPAL_MODE === 'live' ? 'https://api.paypal.com' : 'https://api.sandbox.paypal.com'
const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID || process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID
const PAYPAL_SECRET = process.env.PAYPAL_SECRET

function getBasicAuthHeader() {
  if (!PAYPAL_CLIENT_ID || !PAYPAL_SECRET) {
    throw new Error('PayPal environment variables are not configured.')
  }
  return `Basic ${Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_SECRET}`).toString('base64')}`
}

async function getPayPalAccessToken() {
  const response = await fetch(`${PAYPAL_BASE_URL}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: getBasicAuthHeader(),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  })

  const data = await response.json()
  if (!response.ok) {
    throw new Error(data?.error_description || data?.error || 'Unable to fetch PayPal access token')
  }

  return data.access_token
}

async function createPayPalOrder(amount = '1.00') {
  const accessToken = await getPayPalAccessToken()
  const response = await fetch(`${PAYPAL_BASE_URL}/v2/checkout/orders`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      intent: 'AUTHORIZE',
      purchase_units: [
        {
          amount: {
            currency_code: 'USD',
            value: amount,
          },
        },
      ],
      application_context: {
        shipping_preference: 'NO_SHIPPING',
        user_action: 'PAY_NOW',
      },
    }),
  })

  const data = await response.json()
  if (!response.ok) {
    throw new Error(data?.message || JSON.stringify(data) || 'Unable to create PayPal order')
  }

  return data
}

(async () => {
  try {
    const amount = process.argv[2] || '1.00'
    console.log('Creating PayPal order for amount', amount)
    const order = await createPayPalOrder(amount)
    console.log('Order created:')
    console.log(JSON.stringify(order, null, 2))
  } catch (err) {
    console.error('Error:', err.message || err)
    process.exit(1)
  }
})()
