import { getAppUrl } from '@/lib/app-url'

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

const DEFAULT_PAYPAL_TIMEOUT = 30000
const MAX_PAYPAL_DATE_RANGE_DAYS = 31

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function normalizeDateString(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
}

function validateDateRange(startDate: string, endDate: string) {
  const start = normalizeDateString(startDate)
  const end = normalizeDateString(endDate)
  const now = new Date()

  if (!start || !end) {
    throw new Error('Invalid startDate or endDate format')
  }

  if (start > end) {
    throw new Error('Start date must be before end date')
  }

  if (end > now) {
    throw new Error('End date cannot be in the future')
  }

  const maxRangeMs = MAX_PAYPAL_DATE_RANGE_DAYS * 24 * 60 * 60 * 1000
  if (end.getTime() - start.getTime() > maxRangeMs) {
    throw new Error(`Date range cannot exceed ${MAX_PAYPAL_DATE_RANGE_DAYS} days`) 
  }
}

function processPayPalTransactionSafely(transaction: any) {
  return {
    id: transaction?.transaction_id || 'UNKNOWN',
    amount: transaction?.transaction_amount?.value || '0.00',
    currency: transaction?.transaction_amount?.currency_code || 'USD',
    date: transaction?.transaction_initiation_date || new Date().toISOString(),
    status: transaction?.transaction_status || 'UNKNOWN',
    eventCode: transaction?.transaction_event_code || 'UNKNOWN',
    payerEmail: transaction?.payer_info?.email_address || transaction?.payer_info?.name?.given_name || 'UNKNOWN',
  }
}

function logPayPalError(error: unknown, requestDetails: { url: string; method: string; status?: number; requestId?: string }) {
  console.error('PayPal API Error:', {
    timestamp: new Date().toISOString(),
    endpoint: requestDetails.url,
    method: requestDetails.method,
    status: requestDetails.status,
    message: error instanceof Error ? error.message : String(error),
    requestId: requestDetails.requestId,
  })
}

async function fetchWithTimeout(url: string, options: RequestInit = {}, timeout = DEFAULT_PAYPAL_TIMEOUT) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeout)

  try {
    const response = await fetch(url, { ...options, signal: controller.signal })
    return response
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Request timeout')
    }
    throw error
  } finally {
    clearTimeout(timer)
  }
}

async function makePayPalRequest(url: string, options: RequestInit = {}, retries = 3) {
  let attempt = 0

  while (true) {
    attempt += 1

    try {
      const response = await fetchWithTimeout(url, options)
      if ([429, 502, 503, 504].includes(response.status) && attempt < retries) {
        const retryAfter = Number(response.headers.get('Retry-After') || '0')
        const delayMs = retryAfter > 0 ? retryAfter * 1000 : Math.pow(2, attempt) * 1000
        await delay(delayMs)
        continue
      }
      return response
    } catch (error: unknown) {
      const isRetryable =
        error instanceof Error &&
        (error.message === 'Request timeout' || error.message.includes('Failed to fetch') || error.message.includes('network'))

      if (attempt >= retries || !isRetryable) {
        throw error
      }

      const delayMs = Math.pow(2, attempt) * 1000
      await delay(delayMs)
    }
  }
}

export async function getPayPalAccessToken() {
  const response = await makePayPalRequest(`${getPayPalBaseUrl()}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: getBasicAuthHeader(),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  })

  const data = await response.json()
  if (!response.ok) {
    const message = data?.error_description || data?.error || 'Unable to fetch PayPal access token'
    logPayPalError(message, { url: `${getPayPalBaseUrl()}/v1/oauth2/token`, method: 'POST', status: response.status })
    throw new Error(message)
  }

  return data.access_token as string
}

export async function createPayPalBrowserSafeClientToken() {
  const response = await makePayPalRequest(`${getPayPalBaseUrl()}/v1/identity/generate-token`, {
    method: 'POST',
    headers: {
      Authorization: getBasicAuthHeader(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({}),
  })

  const data = await response.json()
  if (!response.ok) {
    const message = data?.error_description || data?.error || data?.message || JSON.stringify(data) || 'Unable to generate browser-safe client token'
    logPayPalError(message, { url: `${getPayPalBaseUrl()}/v1/identity/generate-token`, method: 'POST', status: response.status })
    throw new Error(message)
  }

  const accessToken = data?.accessToken || data?.access_token || data?.client_token || data?.clientToken
  if (!accessToken) {
    throw new Error('Unable to generate browser-safe client token')
  }

  return { accessToken }
}

export async function validatePayPalAccessToken(accessToken: string) {
  const response = await makePayPalRequest(`${getPayPalBaseUrl()}/v1/identity/oauth2/userinfo`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
  })

  const data = await response.json()
  if (!response.ok) {
    logPayPalError(data?.error || data?.error_description || 'PayPal token validation failed', {
      url: `${getPayPalBaseUrl()}/v1/identity/oauth2/userinfo`,
      method: 'GET',
      status: response.status,
    })
    throw new Error(data?.error_description || data?.error || 'PayPal token validation failed')
  }

  return data
}

export type PayPalOrderRiskData = {
  ipAddress?: string
  emailAddress?: string
  phoneNumber?: string
}

export type PayPalCardVerificationMethod = 'SCA_ALWAYS' | 'SCA_WHEN_REQUIRED'

export type PayPalCardExperienceContext = {
  returnUrl?: string
  cancelUrl?: string
}

export type PayPalOrderCreateParams = {
  amount: string
  intent?: 'AUTHORIZE' | 'CAPTURE'
  returnUrl?: string
  cancelUrl?: string
  paymentSource?: Record<string, any>
  riskData?: PayPalOrderRiskData
  purchaseUnit?: {
    description?: string
    invoiceId?: string
    shipping?: Record<string, any>
    breakdown?: Record<string, any>
    supplementaryData?: Record<string, any>
  }
  applicationContext?: Record<string, any>
}

export async function createPayPalOrder({
  amount,
  intent = 'AUTHORIZE',
  returnUrl,
  cancelUrl,
  paymentSource,
  riskData,
  purchaseUnit,
  applicationContext,
}: PayPalOrderCreateParams) {
  const accessToken = await getPayPalAccessToken()
  const purchaseUnitPayload: Record<string, any> = {
    amount: {
      currency_code: 'USD',
      value: amount,
    },
  }

  if (purchaseUnit?.description) {
    purchaseUnitPayload.description = purchaseUnit.description
  }

  if (purchaseUnit?.invoiceId) {
    purchaseUnitPayload.invoice_id = purchaseUnit.invoiceId
  }

  if (purchaseUnit?.shipping) {
    purchaseUnitPayload.shipping = purchaseUnit.shipping
  }

  if (purchaseUnit?.breakdown) {
    purchaseUnitPayload.breakdown = purchaseUnit.breakdown
  }

  if (purchaseUnit?.supplementaryData) {
    purchaseUnitPayload.supplementary_data = purchaseUnit.supplementaryData
  }

  if (riskData) {
    purchaseUnitPayload.supplementary_data = {
      ...purchaseUnitPayload.supplementary_data,
      risk: {
        customer: {
          ...(riskData.ipAddress ? { ip_address: riskData.ipAddress } : {}),
          ...(riskData.emailAddress ? { email_address: riskData.emailAddress } : {}),
          ...(riskData.phoneNumber ? { phone_number: riskData.phoneNumber } : {}),
        },
      },
    }
  }

  const requestBody: Record<string, any> = {
    intent,
    purchase_units: [purchaseUnitPayload],
    application_context: {
      shipping_preference: 'NO_SHIPPING',
      user_action: 'PAY_NOW',
      return_url: returnUrl || `${getAppUrl()}`,
      cancel_url: cancelUrl || `${getAppUrl()}`,
      ...applicationContext,
    },
  }

  if (paymentSource) {
    requestBody.payment_source = paymentSource
  }

  const response = await makePayPalRequest(`${getPayPalBaseUrl()}/v2/checkout/orders`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  })

  const data = await response.json()
  if (!response.ok) {
    const message = data?.message || JSON.stringify(data) || 'Unable to create PayPal order'
    logPayPalError(message, { url: `${getPayPalBaseUrl()}/v2/checkout/orders`, method: 'POST', status: response.status })
    throw new Error(message)
  }

  return data
}

export function buildPayPalCardPaymentSource({
  verificationMethod = 'SCA_WHEN_REQUIRED',
  experienceContext,
}: {
  verificationMethod?: PayPalCardVerificationMethod
  experienceContext?: PayPalCardExperienceContext
} = {}) {
  const card: Record<string, any> = {
    attributes: {
      verification: {
        method: verificationMethod,
      },
    },
  }

  if (experienceContext) {
    card.experience_context = {}
    if (experienceContext.returnUrl) {
      card.experience_context.return_url = experienceContext.returnUrl
    }
    if (experienceContext.cancelUrl) {
      card.experience_context.cancel_url = experienceContext.cancelUrl
    }
  }

  return { card }
}

export async function createPayPalSetupToken({
  verificationMethod = 'SCA_WHEN_REQUIRED',
  experienceContext,
}: {
  verificationMethod?: PayPalCardVerificationMethod
  experienceContext?: PayPalCardExperienceContext
}) {
  const accessToken = await getPayPalAccessToken()
  const response = await makePayPalRequest(`${getPayPalBaseUrl()}/v2/payments/setup-tokens`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      payment_source: buildPayPalCardPaymentSource({ verificationMethod, experienceContext }),
    }),
  })

  const data = await response.json()
  if (!response.ok) {
    const message = data?.message || JSON.stringify(data) || 'Unable to create PayPal setup token'
    logPayPalError(message, { url: `${getPayPalBaseUrl()}/v2/payments/setup-tokens`, method: 'POST', status: response.status })
    throw new Error(message)
  }

  return data
}

export async function authorizePayPalOrder(paypalOrderId: string) {
  const accessToken = await getPayPalAccessToken()
  const response = await makePayPalRequest(`${getPayPalBaseUrl()}/v2/checkout/orders/${encodeURIComponent(paypalOrderId)}/authorize`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  })

  const data = await response.json()
  if (!response.ok) {
    const message = data?.message || JSON.stringify(data) || 'Unable to authorize PayPal order'
    logPayPalError(message, { url: `${getPayPalBaseUrl()}/v2/checkout/orders/${encodeURIComponent(paypalOrderId)}/authorize`, method: 'POST', status: response.status })
    throw new Error(message)
  }

  return data
}

export async function getPayPalOrder(paypalOrderId: string) {
  const accessToken = await getPayPalAccessToken()
  const response = await makePayPalRequest(`${getPayPalBaseUrl()}/v2/checkout/orders/${encodeURIComponent(paypalOrderId)}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  })

  const data = await response.json()
  if (!response.ok) {
    const message = data?.message || JSON.stringify(data) || 'Unable to fetch PayPal order'
    logPayPalError(message, { url: `${getPayPalBaseUrl()}/v2/checkout/orders/${encodeURIComponent(paypalOrderId)}`, method: 'GET', status: response.status })
    throw new Error(message)
  }

  return data
}

export type PayPalPaymentLinkLineItem = {
  name: string
  description?: string
  product_id?: string
  collect_shipping_address?: boolean
  customer_notes?: Array<{ label: string; required: boolean }>
  unit_amount: { currency_code: string; value: string }
  taxes?: Array<{ name: string; type: string; value: string }>
  shipping?: Array<{ type: string; value: string; additional_unit_value?: string }>
  adjustable_quantity?: { maximum: number }
}

export type PayPalPaymentLinkCreateParams = {
  integrationMode?: 'LINK'
  type?: 'BUY_NOW' | 'DONATE' | string
  reusable?: 'MULTIPLE' | 'SINGLE'
  returnUrl: string
  line_items: PayPalPaymentLinkLineItem[]
}

export type PayPalPaymentLinkUpdateParams = {
  reusable?: 'MULTIPLE' | 'SINGLE'
  returnUrl?: string
  line_items?: PayPalPaymentLinkLineItem[]
  status?: string
}

export async function searchPayPalTransactions(params: Record<string, string | number | boolean>) {
  const startDate = String(params?.start_date || '').trim()
  const endDate = String(params?.end_date || '').trim()
  if (startDate && endDate) {
    validateDateRange(startDate, endDate)
  }

  const accessToken = await getPayPalAccessToken()
  const queryString = new URLSearchParams(
    Object.entries(params || {})
      .filter(([, value]) => value !== undefined && value !== null && value !== '')
      .map(([key, value]) => [key, String(value)])
  ).toString()

  const response = await makePayPalRequest(`${getPayPalBaseUrl()}/v1/reporting/transactions?${queryString}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  })

  const data = await response.json()
  if (!response.ok) {
    const message = data?.message || data?.error_description || JSON.stringify(data) || 'Unable to query PayPal transactions'
    logPayPalError(message, { url: `${getPayPalBaseUrl()}/v1/reporting/transactions`, method: 'GET', status: response.status })
    throw new Error(message)
  }

  return data
}

export async function createPayPalPaymentLink(params: PayPalPaymentLinkCreateParams) {
  const accessToken = await getPayPalAccessToken()
  const response = await makePayPalRequest(`${getPayPalBaseUrl()}/v1/checkout/payment-resources`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      integration_mode: params.integrationMode ?? 'LINK',
      type: params.type ?? 'BUY_NOW',
      reusable: params.reusable ?? 'MULTIPLE',
      return_url: params.returnUrl,
      line_items: params.line_items,
    }),
  })

  const data = await response.json()
  if (!response.ok) {
    const message = data?.message || data?.error_description || JSON.stringify(data) || 'Unable to create PayPal payment link'
    logPayPalError(message, { url: `${getPayPalBaseUrl()}/v1/checkout/payment-resources`, method: 'POST', status: response.status })
    throw new Error(message)
  }

  return data
}

export async function listPayPalPaymentLinks(query: Record<string, string | number | boolean> = {}) {
  const accessToken = await getPayPalAccessToken()
  const queryString = new URLSearchParams(
    Object.entries(query)
      .filter(([, value]) => value !== undefined && value !== null && value !== '')
      .map(([key, value]) => [key, String(value)])
  ).toString()

  const url = `${getPayPalBaseUrl()}/v1/checkout/payment-resources${queryString ? `?${queryString}` : ''}`
  const response = await makePayPalRequest(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
  })

  const data = await response.json()
  if (!response.ok) {
    const message = data?.message || data?.error_description || JSON.stringify(data) || 'Unable to list PayPal payment links'
    logPayPalError(message, { url, method: 'GET', status: response.status })
    throw new Error(message)
  }

  return data
}

export async function getPayPalPaymentLink(paymentResourceId: string) {
  const accessToken = await getPayPalAccessToken()
  const response = await makePayPalRequest(`${getPayPalBaseUrl()}/v1/checkout/payment-resources/${encodeURIComponent(paymentResourceId)}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
  })

  const data = await response.json()
  if (!response.ok) {
    const message = data?.message || data?.error_description || JSON.stringify(data) || 'Unable to get PayPal payment link details'
    logPayPalError(message, { url: `${getPayPalBaseUrl()}/v1/checkout/payment-resources/${encodeURIComponent(paymentResourceId)}`, method: 'GET', status: response.status })
    throw new Error(message)
  }

  return data
}

export async function updatePayPalPaymentLink(paymentResourceId: string, payload: PayPalPaymentLinkUpdateParams) {
  const accessToken = await getPayPalAccessToken()
  const response = await makePayPalRequest(`${getPayPalBaseUrl()}/v1/checkout/payment-resources/${encodeURIComponent(paymentResourceId)}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(payload),
  })

  if (response.status === 204) {
    return { ok: true }
  }

  const data = await response.json()
  if (!response.ok) {
    const message = data?.message || data?.error_description || JSON.stringify(data) || 'Unable to update PayPal payment link'
    logPayPalError(message, { url: `${getPayPalBaseUrl()}/v1/checkout/payment-resources/${encodeURIComponent(paymentResourceId)}`, method: 'PUT', status: response.status })
    throw new Error(message)
  }

  return data
}

export async function deletePayPalPaymentLink(paymentResourceId: string) {
  const accessToken = await getPayPalAccessToken()
  const response = await makePayPalRequest(`${getPayPalBaseUrl()}/v1/checkout/payment-resources/${encodeURIComponent(paymentResourceId)}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
  })

  if (response.status === 204) {
    return { ok: true }
  }

  const data = await response.json()
  if (!response.ok) {
    const message = data?.message || data?.error_description || JSON.stringify(data) || 'Unable to delete PayPal payment link'
    logPayPalError(message, { url: `${getPayPalBaseUrl()}/v1/checkout/payment-resources/${encodeURIComponent(paymentResourceId)}`, method: 'DELETE', status: response.status })
    throw new Error(message)
  }

  return data
}

export async function capturePayPalAuthorization(
  authorizationId: string,
  amount: string,
  finalCapture = true
) {
  const accessToken = await getPayPalAccessToken()
  const response = await makePayPalRequest(`${getPayPalBaseUrl()}/v2/payments/authorizations/${encodeURIComponent(authorizationId)}/capture`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      amount: {
        currency_code: 'USD',
        value: amount,
      },
      final_capture: finalCapture,
    }),
  })

  const data = await response.json()
  if (!response.ok) {
    const message = data?.message || JSON.stringify(data) || 'Unable to capture PayPal authorization'
    logPayPalError(message, { url: `${getPayPalBaseUrl()}/v2/payments/authorizations/${encodeURIComponent(authorizationId)}/capture`, method: 'POST', status: response.status })
    throw new Error(message)
  }

  return data
}

export async function capturePayPalOrder(paypalOrderId: string) {
  const accessToken = await getPayPalAccessToken()
  const response = await makePayPalRequest(`${getPayPalBaseUrl()}/v2/checkout/orders/${encodeURIComponent(paypalOrderId)}/capture`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  })

  const data = await response.json()
  if (!response.ok) {
    const message = data?.message || JSON.stringify(data) || 'Unable to capture PayPal order'
    logPayPalError(message, { url: `${getPayPalBaseUrl()}/v2/checkout/orders/${encodeURIComponent(paypalOrderId)}/capture`, method: 'POST', status: response.status })
    throw new Error(message)
  }

  return data
}

export type PayPalReportScheduleCreateParams = {
  templateId: string
  scheduleType: 'DAILY' | 'WEEKLY' | 'MONTHLY'
  deliveryMethod: 'SFTP'
  startDate: string
  frequency: number
}

export async function createPayPalReportSchedule(params: PayPalReportScheduleCreateParams) {
  const accessToken = await getPayPalAccessToken()
  const response = await makePayPalRequest(`${getPayPalBaseUrl()}/v1/reporting/templates/schedule`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      template_id: params.templateId,
      schedule_type: params.scheduleType,
      delivery_method: params.deliveryMethod,
      start_date: params.startDate,
      frequency: params.frequency,
    }),
  })

  const data = await response.json()
  if (!response.ok) {
    const message = data?.message || data?.error_description || JSON.stringify(data) || 'Unable to create PayPal report schedule'
    logPayPalError(message, { url: `${getPayPalBaseUrl()}/v1/reporting/templates/schedule`, method: 'POST', status: response.status })
    throw new Error(message)
  }

  return data
}

export async function fetchPayPalReportSchedules() {
  const accessToken = await getPayPalAccessToken()
  const response = await makePayPalRequest(`${getPayPalBaseUrl()}/v1/reporting/schedules`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  })

  const data = await response.json()
  if (!response.ok) {
    const message = data?.message || data?.error_description || JSON.stringify(data) || 'Unable to fetch PayPal report schedules'
    logPayPalError(message, { url: `${getPayPalBaseUrl()}/v1/reporting/schedules`, method: 'GET', status: response.status })
    throw new Error(message)
  }

  return data
}

export async function updatePayPalReportSchedule(scheduleId: string, updates: Record<string, any>) {
  const accessToken = await getPayPalAccessToken()
  const response = await makePayPalRequest(`${getPayPalBaseUrl()}/v1/reporting/schedules/${encodeURIComponent(scheduleId)}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(updates),
  })

  const data = await response.json()
  if (!response.ok) {
    const message = data?.message || data?.error_description || JSON.stringify(data) || 'Unable to update PayPal report schedule'
    logPayPalError(message, { url: `${getPayPalBaseUrl()}/v1/reporting/schedules/${encodeURIComponent(scheduleId)}`, method: 'PATCH', status: response.status })
    throw new Error(message)
  }

  return data
}

export async function deletePayPalReportSchedule(scheduleId: string) {
  const accessToken = await getPayPalAccessToken()
  const response = await makePayPalRequest(`${getPayPalBaseUrl()}/v1/reporting/schedules/${encodeURIComponent(scheduleId)}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    const data = await response.json()
    const message = data?.message || data?.error_description || JSON.stringify(data) || 'Unable to delete PayPal report schedule'
    logPayPalError(message, { url: `${getPayPalBaseUrl()}/v1/reporting/schedules/${encodeURIComponent(scheduleId)}`, method: 'DELETE', status: response.status })
    throw new Error(message)
  }

  return { success: true }
}

export async function testPayPalAuthentication() {
  const accessToken = await getPayPalAccessToken()
  await validatePayPalAccessToken(accessToken)
  return { ok: true, mode: PAYPAL_MODE, baseUrl: getPayPalBaseUrl() }
}

export async function testPayPalTransactionSearch() {
  const threeDaysAgo = new Date()
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)
  const startDate = `${threeDaysAgo.toISOString().slice(0, 10)}T00:00:00Z`
  const endDate = `${new Date().toISOString().slice(0, 10)}T23:59:59Z`

  const data = await searchPayPalTransactions({
    start_date: startDate,
    end_date: endDate,
    page_size: 1,
  })

  return {
    ok: true,
    recentTransactions: Array.isArray(data.transaction_details) ? data.transaction_details.length : 0,
    totalItems: Number(data.total_items || data.total_transactions || 0),
    rawResponse: {
      transaction_details: data.transaction_details?.slice(0, 1) || [],
      total_items: data.transaction_details?.length,
      total_transactions: data.total_transactions,
    },
  }
}
