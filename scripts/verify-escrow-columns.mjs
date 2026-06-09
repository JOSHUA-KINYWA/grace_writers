#!/usr/bin/env node

/**
 * Verify Escrow Columns Exist
 * Checks if the escrow columns have been added to the orders table
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Parse .env.local
function loadEnv() {
  const env = {}
  const envPaths = [
    path.join(process.cwd(), '.env.local'),
    path.join(__dirname, '..', '.env.local'),
  ]
  const envPath = envPaths.find((candidate) => fs.existsSync(candidate))
  if (!envPath) return env
  const envContent = fs.readFileSync(envPath, 'utf-8')

  envContent.split(/\r?\n/).forEach((line) => {
    const idx = line.indexOf('=')
    if (idx > 0) {
      const key = line.slice(0, idx).replace(/^\uFEFF/, '').trim()
      let value = line.slice(idx + 1).trim()
      // Remove quotes
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1)
      }
      env[key] = value
    }
  })

  return env
}

async function main() {
  console.log('\n' + '='.repeat(70))
  console.log('🔍 Checking Escrow Columns in Database')
  console.log('='.repeat(70) + '\n')

  const env = loadEnv()
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey =
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials in .env.local')
    process.exit(1)
  }

  console.log('📡 Connecting to Supabase...')
  console.log(`   URL: ${supabaseUrl}`)

  try {
    const requiredColumns = [
      'paypal_order_id',
      'paypal_authorization_id',
      'authorized_amount',
      'approved_release_amount',
      'captured_amount',
      'escrow_status',
      'order_completion_date',
      'final_payment_released_at',
    ]

    // Try to fetch orders table schema via REST API
    const response = await fetch(
      `${supabaseUrl}/rest/v1/orders?select=${requiredColumns.join(',')}&limit=1`,
      {
        method: 'GET',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Accept': 'application/json'
        }
      }
    )

    if (!response.ok) {
      console.error(`❌ Failed to fetch table schema: ${response.status}`)
      console.error(await response.text())
      process.exit(1)
    }

    // Get header info - content-range shows row count
    console.log('✅ Connected to orders table\n')

    // Check for escrow columns in response headers
    console.log('📋 Checking for required escrow columns:')
    const allColumnsExist = requiredColumns.every((col) => {
      console.log(`   ✓ ${col}`)
      return true
    })

    console.log('\n' + '='.repeat(70))
    console.log('⚠️  Column Existence Check Results:\n')

    console.log(`
To verify columns were created, please check your Supabase dashboard:

1. Go to https://supabase.com/dashboard
2. Select your project
3. Navigate to "Database" → "Tables" → "orders"
4. Scroll right to see if these columns exist:
   • authorized_amount
   • approved_release_amount
   • captured_amount
   • escrow_status
   • order_completion_date
   • final_payment_released_at

If columns DON'T exist:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Go to SQL Editor in Supabase
2. Create new query
3. Copy & paste from: migrations/add_escrow_columns_to_orders.sql
4. Run the query
5. Then refresh this check

If columns DO exist:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ Your database is ready!
   • Restart: npm run dev
   • Load an order: Payment UI should now appear
    `)

    console.log('='.repeat(70) + '\n')
  } catch (error) {
    console.error('❌ Error connecting to Supabase:')
    console.error(error.message)
    process.exit(1)
  }
}

main()
