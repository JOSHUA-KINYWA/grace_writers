import fs from 'fs'
import path from 'path'
import { createClient } from '@supabase/supabase-js'

function loadEnv(file){
  const env = fs.readFileSync(file, 'utf8')
  env.split('\n').forEach(line=>{
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) return
    const idx = trimmed.indexOf('=')
    if (idx === -1) return
    const k = trimmed.slice(0, idx)
    let v = trimmed.slice(idx+1)
    // remove surrounding quotes
    if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1,-1)
    process.env[k] = v
  })
}

const envPath = path.resolve(process.cwd(), '.env.local')
if (fs.existsSync(envPath)) loadEnv(envPath)

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE
if (!SUPABASE_URL || !SUPABASE_KEY){
  console.error('Missing Supabase URL or service role key in .env.local')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

async function main(){
  const argv = process.argv.slice(2)
  if (argv.length < 1){
    console.error('Usage: node scripts/inspect-order-ssr.mjs <ORDER_ID>')
    process.exit(1)
  }
  const orderId = argv[0]
  const { data: order, error } = await supabase
    .from('orders')
    .select('id, status, quote_amount, paid_amount, authorized_amount, captured_amount, escrow_status, paypal_authorization_id, payment_status')
    .eq('id', orderId)
    .single()

  if (error){
    console.error('Error:', error)
    process.exit(1)
  }

  console.log(JSON.stringify(order, null, 2))
}

main().catch(err=>{console.error(err); process.exit(1)})
