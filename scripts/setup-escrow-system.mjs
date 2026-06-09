#!/usr/bin/env node

/**
 * PayPal Escrow System Setup Script
 * 
 * This script guides you through applying the escrow database migrations
 * to your Supabase instance.
 */

import fs from 'fs'
import path from 'path'

const MIGRATION_FILE = 'migrations/add_escrow_columns_to_orders.sql'

async function main() {
  console.log('\n' + '='.repeat(70))
  console.log('🔐 PayPal Escrow System - Database Setup')
  console.log('='.repeat(70) + '\n')

  // Check if migration file exists
  if (!fs.existsSync(MIGRATION_FILE)) {
    console.error(`❌ Migration file not found: ${MIGRATION_FILE}`)
    process.exit(1)
  }

  const migrationSQL = fs.readFileSync(MIGRATION_FILE, 'utf-8')

  console.log('📋 Migration Content:\n')
  console.log(migrationSQL)
  console.log('\n' + '='.repeat(70))

  console.log(`
✅ Next Steps to Apply the Migration:

1. **Open Supabase Dashboard**
   - Go to https://supabase.com/dashboard
   - Select your project
   - Navigate to SQL Editor

2. **Create New Query**
   - Click "New Query"
   - Copy the SQL above
   - Paste it into the query editor

3. **Run the Query**
   - Click "Run" button
   - Confirm the query completes successfully
   - You should see: "Query executed successfully"

4. **Verify New Columns**
   - Go to "Database" → "Tables" → "orders"
   - Scroll right to see new columns:
     • authorized_amount
     • approved_release_amount
     • captured_amount
     • escrow_status
     • order_completion_date
     • final_payment_released_at

5. **Restart Your Application**
   - npm run dev
   - The new escrow components are now active!

📚 Documentation: Read docs/ESCROW_SYSTEM.md for detailed implementation guide

⚠️  Important Notes:

   • The migration is backward compatible
   • Existing orders won't be affected
   • New columns default to NULL/0/'pending'
   • PayPal Sandbox is active for testing
   • Switch to PAYPAL_MODE=live in .env.local to go live

Questions? Check the docs/ESCROW_SYSTEM.md file for FAQs.
  `)

  console.log('='.repeat(70))
  console.log('💡 TIP: You can also run migrations via Supabase CLI:')
  console.log('   supabase migration up')
  console.log('='.repeat(70) + '\n')
}

main().catch(console.error)
