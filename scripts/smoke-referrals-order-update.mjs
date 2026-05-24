const baseUrl = process.env.BASE_URL || 'http://localhost:3000'

async function assertStatus(path, method, expectedStatuses, body) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })

  if (!expectedStatuses.includes(response.status)) {
    const text = await response.text()
    throw new Error(
      `${method} ${path} expected [${expectedStatuses.join(', ')}], got ${response.status}. Body: ${text}`
    )
  }

  return response
}

async function main() {
  console.log(`Running smoke checks against ${baseUrl}`)

  // Unauthenticated access to admin routes should be rejected.
  await assertStatus('/api/admin/orders/update', 'POST', [401, 403], {
    orderId: 'dummy-id',
    status: 'completed',
  })
  console.log('PASS: admin order update rejects unauthenticated access')

  // Referral config should reject unauthenticated access.
  await assertStatus('/api/referrals/config', 'GET', [401, 403])
  console.log('PASS: referral config rejects unauthenticated access')

  console.log('Smoke checks passed.')
}

try {
  await main()
} catch (error) {
  const error_ = error instanceof Error ? error : new Error(String(error))
  console.error('Smoke checks failed:', error_.message)
  process.exit(1)
}
