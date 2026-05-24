/**
 * Creates order_ratings table on remote Supabase.
 * Usage: node scripts/ensure-order-ratings-table.mjs
 * Requires DATABASE_URL or SUPABASE_DB_URL in .env.local
 */
import { readFileSync, existsSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import pg from 'pg'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')

function loadEnv() {
  const envPath = resolve(root, '.env.local')
  if (!existsSync(envPath)) return
  const text = readFileSync(envPath, 'utf8')
  for (const line of text.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    const key = trimmed.slice(0, eq).trim()
    let val = trimmed.slice(eq + 1).trim()
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1)
    }
    if (!process.env[key]) process.env[key] = val
  }
}

loadEnv()

const connectionString = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL

if (!connectionString) {
  console.error('Missing DATABASE_URL or SUPABASE_DB_URL in .env.local')
  console.error('Add your Supabase connection string (Project Settings → Database → URI) and re-run.')
  process.exit(1)
}

const sql = readFileSync(resolve(root, 'migrations/create_order_ratings_table.sql'), 'utf8')

const client = new pg.Client({ connectionString, ssl: { rejectUnauthorized: false } })

try {
  await client.connect()
  await client.query(sql)
  console.log('order_ratings table is ready.')
} catch (err) {
  console.error('Migration failed:', err.message)
  process.exit(1)
} finally {
  await client.end()
}
