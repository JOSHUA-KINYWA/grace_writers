const PAYPAL_MODE = process.env.PAYPAL_MODE === 'live' ? 'live' : 'sandbox'
const PAYPAL_BASE_URL = PAYPAL_MODE === 'live' ? 'https://api.paypal.com' : 'https://api.sandbox.paypal.com'
const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID || process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID
const PAYPAL_SECRET = process.env.PAYPAL_SECRET

function getPayPalBaseUrl() {
  return PAYPAL_BASE_URL
}

function getBasicAuthHeader() {
  if (!PAYPAL_CLIENT_ID || !PAYPAL_SECRET) {
    throw new Error('PayPal environment variables are not configured.')
  }

  return `Basic ${Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_SECRET}`).toString('base64')}`
}

export async function getPayPalAccessToken() {
  const response = await fetch(`${getPayPalBaseUrl()}/v1/oauth2/token`, {
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

  return data.access_token as string
}

export async function createPayPalOrder(amount: string) {
  const accessToken = await getPayPalAccessToken()
  const response = await fetch(`${getPayPalBaseUrl()}/v2/checkout/orders`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      intent: 'CAPTURE',
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

export async function capturePayPalOrder(paypalOrderId: string) {
  const accessToken = await getPayPalAccessToken()
  const response = await fetch(`${getPayPalBaseUrl()}/v2/checkout/orders/${encodeURIComponent(paypalOrderId)}/capture`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  })

  const data = await response.json()
  if (!response.ok) {
    throw new Error(data?.message || JSON.stringify(data) || 'Unable to capture PayPal order')
  }

  return data
}
