'use strict'
// Quick script to inspect order escrow/payment fields
import { createRequire } from 'module'
const require = createRequire(import.meta.url)
const path = require('path')
const cwd = process.cwd()

// Use the server Supabase client from the repo
import('../lib/supabase/server.mjs').then(({ createClient }) => main(createClient)).catch(err=>{console.error('failed to load server client', err); process.exit(1)})

async function main(createClient){
  const argv = process.argv.slice(2)
  if (argv.length < 1){
    console.error('Usage: node scripts/inspect-order.js <ORDER_ID>')
    process.exit(1)
  }
  const orderId = argv[0]
  const supabase = await createClient()

  try{
    const { data: order, error } = await supabase
      .from('orders')
      .select('id, status, quote_amount, paid_amount, authorized_amount, captured_amount, escrow_status, paypal_authorization_id, payment_status')
      .eq('id', orderId)
      .single()

    if (error){
      console.error('Supabase error:', error)
      process.exit(1)
    }

    console.log('Order:', JSON.stringify(order, null, 2))
  }catch(err){
    console.error('Error:', err)
    process.exit(1)
  }
}
