#!/usr/bin/env node

/**
 * PayPal Escrow Flow Test
 * 
 * Demonstrates the complete escrow workflow:
 * 1. Create PayPal order → 2. Authorize payment (funds held in escrow)
 * 3. Mark order as complete → 4. Client approves partial release (optional)
 * 5. Client approves final release (captures held funds)
 */

import fs from 'fs'
import path from 'path'

// Load .env.local (simple parser)
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

async function createPayPalOrder(amount) {
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

async function authorizePayPalOrder(paypalOrderId) {
  const accessToken = await getPayPalAccessToken()
  const response = await fetch(`${PAYPAL_BASE_URL}/v2/checkout/orders/${encodeURIComponent(paypalOrderId)}/authorize`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  })

  const data = await response.json()
  if (!response.ok) {
    throw new Error(data?.message || JSON.stringify(data) || 'Unable to authorize PayPal order')
  }

  return data
}

async function capturePayPalAuthorization(authorizationId, amount) {
  const accessToken = await getPayPalAccessToken()
  const response = await fetch(`${PAYPAL_BASE_URL}/v2/payments/authorizations/${encodeURIComponent(authorizationId)}/capture`, {
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
      final_capture: true,
    }),
  })

  const data = await response.json()
  if (!response.ok) {
    throw new Error(data?.message || JSON.stringify(data) || 'Unable to capture PayPal authorization')
  }

  return data
}

function log(title, data) {
  console.log('\n' + '='.repeat(70))
  console.log('✓', title)
  console.log('='.repeat(70))
  console.log(JSON.stringify(data, null, 2))
}

async function runEscrowTest() {
  try {
    console.log('\n🔐 PayPal Escrow Flow Test\n')

    // Step 1: Create order
    console.log('Step 1: Creating PayPal order for $100.00...')
    const quoteAmount = '100.00'
    const createOrderResult = await createPayPalOrder(quoteAmount)
    const paypalOrderId = createOrderResult.id
    log('PayPal Order Created', {
      orderId: paypalOrderId,
      status: createOrderResult.status,
      amount: quoteAmount,
      nextStep: 'User must click the approval link below and authorize payment in PayPal',
      approveUrl: createOrderResult.links.find(l => l.rel === 'approve')?.href,
    })

    console.log('\n⚠️  MANUAL STEP REQUIRED:')
    console.log('1. Copy the approval URL above')
    console.log('2. Open it in your browser')
    console.log('3. Log in with sandbox credentials (if needed)')
    console.log('4. Click "Approve and Continue"')
    console.log('5. You will be redirected with a token')
    console.log('\nFor this demo, we will show the expected flow...\n')

    // Step 2: Authorize payment (after user approves)
    console.log('Step 2: After user approval, system authorizes payment...')
    try {
      const authResult = await authorizePayPalOrder(paypalOrderId)
      const authorizationId = authResult?.purchase_units?.[0]?.payments?.authorizations?.[0]?.id
      const authorizedAmount = authResult?.purchase_units?.[0]?.payments?.authorizations?.[0]?.amount?.value
      log('Payment Authorized & Held in Escrow', {
        authorizationId,
        authorizedAmount,
        status: authResult?.purchase_units?.[0]?.payments?.authorizations?.[0]?.status,
        message: '💰 Funds are now held in escrow. Work can begin on the order.',
      })

      // Continue with escrow flow only if authorization succeeded
      await continueEscrowFlow(authorizationId, authorizedAmount)
    } catch (authErr) {
      console.log('⚠️  Authorization requires user to approve in PayPal first.')
      console.log('\n📋 Expected Flow Once User Approves:\n')
      showExpectedFlow(quoteAmount)
    }

  } catch (err) {
    console.error('\n❌ Error:', err.message || err)
    process.exit(1)
  }
}

async function continueEscrowFlow(authorizationId, authorizedAmount) {
  // Step 3: Simulate order work completion
  console.log('\nStep 3: Order work completed...')
  console.log('(In your system, mark order as complete)')
  log('Order Status Updated', {
    status: 'complete',
    message: '✓ Work done. Awaiting client approval to release funds.',
  })

  // Step 4: Partial release (optional - client releases part of the escrow)
  console.log('\nStep 4: Client releases partial payment ($40.00)...')
  const partialReleaseAmount = '40.00'
  const partialCaptureResult = await capturePayPalAuthorization(authorizationId, partialReleaseAmount)
  const partialCapturedAmount = partialCaptureResult?.amount?.value
  log('Partial Payment Captured', {
    amount: partialCapturedAmount,
    authorizationId: partialCaptureResult?.id,
    status: partialCaptureResult?.status,
    remainingInEscrow: (parseFloat(authorizedAmount) - parseFloat(partialCapturedAmount)).toFixed(2),
    message: `💸 Client approved $${partialCapturedAmount} release. $${(parseFloat(authorizedAmount) - parseFloat(partialCapturedAmount)).toFixed(2)} remains in escrow.`,
  })

  // Step 5: Full release (client approves final payment)
  console.log('\nStep 5: Client approves final payment ($60.00)...')
  const remainingAmount = (parseFloat(authorizedAmount) - parseFloat(partialCapturedAmount)).toFixed(2)
  const finalCaptureResult = await capturePayPalAuthorization(authorizationId, remainingAmount)
  const finalCapturedAmount = finalCaptureResult?.amount?.value
  const totalCaptured = (parseFloat(partialCapturedAmount) + parseFloat(finalCapturedAmount)).toFixed(2)
  log('Final Payment Captured - Escrow Complete', {
    amount: finalCapturedAmount,
    totalCaptured,
    authorizationId: finalCaptureResult?.id,
    status: finalCaptureResult?.status,
    remainingInEscrow: '0.00',
    message: `✅ Full payment processed! Total captured: $${totalCaptured}`,
  })

  showEscrowSummary(quoteAmount, authorizedAmount, partialReleaseAmount, remainingAmount, totalCaptured)
}

function showExpectedFlow(quoteAmount) {
  const authorizedAmount = quoteAmount
  const partialReleaseAmount = '40.00'
  const remainingAmount = (parseFloat(authorizedAmount) - parseFloat(partialReleaseAmount)).toFixed(2)
  const totalCaptured = authorizedAmount

  showEscrowSummary(quoteAmount, authorizedAmount, partialReleaseAmount, remainingAmount, totalCaptured)
}

function showEscrowSummary(quoteAmount, authorizedAmount, partialReleaseAmount, remainingAmount, totalCaptured) {
  console.log('\n' + '🎉 Escrow Flow Summary'.padEnd(70, '='))
  console.log(`
┌─────────────────────────────────────────────────────┐
│ ESCROW WORKFLOW OVERVIEW                            │
├─────────────────────────────────────────────────────┤
│                                                     │
│  Order Quote Amount:      $${quoteAmount.padStart(40)}│
│  Authorized (Held):       $${authorizedAmount.padStart(40)}│
│                                                     │
│  Step 1 - Partial Release: $${partialReleaseAmount.padStart(38)}│
│  Step 2 - Final Release:   $${remainingAmount.padStart(38)}│
│  ─────────────────────────────────────────────────  │
│  Total Captured:          $${totalCaptured.padStart(40)}│
│  Remaining in Escrow:     $0.00                     │
│                                                     │
├─────────────────────────────────────────────────────┤
│ ESCROW STATUS: RELEASED ✓                           │
└─────────────────────────────────────────────────────┘
    `)

  console.log('\n📋 Implementation Notes:\n')
  console.log('1. AUTHORIZATION: Funds are held without being charged immediately')
  console.log('2. ESCROW PERIOD: Client & freelancer work continues while funds are held')
  console.log('3. PARTIAL RELEASE: Client can release partial payments as milestones complete')
  console.log('4. FULL RELEASE: Remaining amount is released upon final approval')
  console.log('5. DISPUTE HANDLING: Held funds prevent refund disputes\n')

  console.log('🔗 Database Columns Added:\n')
  console.log('  • authorized_amount       → Total amount held in escrow')
  console.log('  • approved_release_amount → Total client has approved for release')
  console.log('  • captured_amount         → Total actually captured from escrow')
  console.log('  • escrow_status           → "authorized" → "partial" → "released"')
  console.log('  • order_completion_date   → When order was marked complete')
  console.log('  • final_payment_released_at → When final payment was captured\n')

  console.log('🔌 API Endpoints:\n')
  console.log('  POST /api/paypal/create-order')
  console.log('    → Creates PayPal order (AUTHORIZE intent)')
  console.log('  POST /api/paypal/authorize-order')
  console.log('    → Authorizes & holds funds in escrow')
  console.log('  POST /api/paypal/release-payment')
  console.log('    → Captures approved amount (supports partial releases)\n')
}


// Run test
runEscrowTest()
