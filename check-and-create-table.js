const fs = require('fs')
const path = require('path')
const { createClient } = require('@supabase/supabase-js')

// Load environment variables from .env.local
const envPath = path.join(__dirname, '.env.local')
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8')
  envContent.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=')
    if (key && valueParts.length > 0) {
      const value = valueParts.join('=').trim()
      if (value.startsWith('"') && value.endsWith('"')) {
        process.env[key.trim()] = value.slice(1, -1)
      } else {
        process.env[key.trim()] = value
      }
    }
  })
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function checkTable() {
  try {
    console.log('Checking if order_ratings table exists...')

    // Try to select from the table
    const { data, error } = await supabase
      .from('order_ratings')
      .select('*')
      .limit(1)

    if (error) {
      if (error.code === 'PGRST116') {
        console.log('Table does not exist')
        return false
      }
      throw error
    }

    console.log('Table exists!')
    return true
  } catch (error) {
    console.error('Error checking table:', error)
    return false
  }
}

async function createTable() {
  try {
    console.log('Creating order_ratings table...')

    // Use raw SQL via REST API
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${serviceRoleKey}`,
        'apikey': serviceRoleKey
      },
      body: JSON.stringify({
        sql: `
          CREATE TABLE IF NOT EXISTS order_ratings (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
            client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
            rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
            review_comment TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            UNIQUE(order_id)
          );

          CREATE INDEX IF NOT EXISTS idx_order_ratings_order_id ON order_ratings(order_id);
          CREATE INDEX IF NOT EXISTS idx_order_ratings_client_id ON order_ratings(client_id);

          ALTER TABLE order_ratings ENABLE ROW LEVEL SECURITY;

          DROP POLICY IF EXISTS "Clients can view their order ratings" ON order_ratings;
          CREATE POLICY "Clients can view their order ratings" ON order_ratings
            FOR SELECT
            USING (
              EXISTS (
                SELECT 1 FROM orders o
                INNER JOIN clients c ON o.client_id = c.id
                WHERE o.id = order_ratings.order_id
                AND c.auth_user_id = auth.uid()
              )
              OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
            );

          DROP POLICY IF EXISTS "Clients can create ratings for their orders" ON order_ratings;
          CREATE POLICY "Clients can create ratings for their orders" ON order_ratings
            FOR INSERT
            WITH CHECK (
              EXISTS (
                SELECT 1 FROM orders o
                INNER JOIN clients c ON o.client_id = c.id
                WHERE o.id = order_ratings.order_id
                AND c.auth_user_id = auth.uid()
              )
            );

          DROP POLICY IF EXISTS "Clients can update their own ratings" ON order_ratings;
          CREATE POLICY "Clients can update their own ratings" ON order_ratings
            FOR UPDATE
            USING (
              EXISTS (
                SELECT 1 FROM orders o
                INNER JOIN clients c ON o.client_id = c.id
                WHERE o.id = order_ratings.order_id
                AND c.auth_user_id = auth.uid()
              )
            );
        `
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Failed to create table:', response.status, errorText)
      return false
    }

    console.log('Table created successfully!')
    return true
  } catch (error) {
    console.error('Error creating table:', error)
    return false
  }
}

async function main() {
  const exists = await checkTable()
  if (!exists) {
    const created = await createTable()
    if (created) {
      console.log('Migration completed!')
    } else {
      console.log('Migration failed!')
      process.exit(1)
    }
  } else {
    console.log('Table already exists.')
  }
}

main()