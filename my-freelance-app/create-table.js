const fs = require('fs')
const path = require('path')
const { createClient } = require('@supabase/supabase-js')

// Load environment variables
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

const sql = `
-- Create order_ratings table for client ratings
create table if not exists order_ratings (
  id uuid default gen_random_uuid() primary key,
  order_id uuid not null references orders(id) on delete cascade,
  client_id uuid not null references clients(id) on delete cascade,
  rating integer not null check (rating >= 1 and rating <= 5),
  review_comment text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  unique(order_id) -- Only one rating per order
);

-- Create indexes
create index if not exists idx_order_ratings_order_id on order_ratings(order_id);
create index if not exists idx_order_ratings_client_id on order_ratings(client_id);

-- Enable RLS
alter table order_ratings enable row level security;

-- Drop existing policies if they exist
drop policy if exists "Clients can view their order ratings" on order_ratings;
drop policy if exists "Clients can create ratings for their orders" on order_ratings;
drop policy if exists "Clients can update their own ratings" on order_ratings;
drop policy if exists "Admins can delete ratings" on order_ratings;

-- RLS Policy: Clients can read ratings for their own orders
create policy "Clients can view their order ratings" on order_ratings
  for select
  using (
    exists (
      select 1 from orders o
      inner join clients c on o.client_id = c.id
      where o.id = order_ratings.order_id
      and c.auth_user_id = auth.uid()
    )
    or (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  );

-- RLS Policy: Clients can insert ratings for their own orders
create policy "Clients can create ratings for their orders" on order_ratings
  for insert
  with check (
    exists (
      select 1 from orders o
      inner join clients c on o.client_id = c.id
      where o.id = order_ratings.order_id
      and c.auth_user_id = auth.uid()
    )
  );

-- RLS Policy: Clients can update their own ratings
create policy "Clients can update their own ratings" on order_ratings
  for update
  using (
    exists (
      select 1 from orders o
      inner join clients c on o.client_id = c.id
      where o.id = order_ratings.order_id
      and c.auth_user_id = auth.uid()
    )
  );

-- RLS Policy: Admins can delete ratings
create policy "Admins can delete ratings" on order_ratings
  for delete
  using ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');
`

async function executeSQL() {
  try {
    console.log('Executing SQL to create order_ratings table...')

    const { data, error } = await supabase.rpc('exec_sql', { sql })

    if (error) {
      console.error('Failed to execute SQL:', error)
      return false
    }

    console.log('SQL executed successfully:', data)
    return true
  } catch (error) {
    console.error('Error executing SQL:', error)
    return false
  }
}

executeSQL()