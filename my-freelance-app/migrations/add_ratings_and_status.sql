-- Create order_ratings table for client ratings
create table order_ratings (
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
create index idx_order_ratings_order_id on order_ratings(order_id);
create index idx_order_ratings_client_id on order_ratings(client_id);

-- Enable RLS
alter table order_ratings enable row level security;

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
    or auth.jwt() ->> 'user_metadata' ->> 'role' = 'admin'
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
  using (auth.jwt() ->> 'user_metadata' ->> 'role' = 'admin');

-- Create user_status table for online presence
create table user_status (
  user_id uuid primary key references auth.users(id) on delete cascade,
  is_online boolean default false,
  last_seen timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Create indexes
create index idx_user_status_is_online on user_status(is_online);
create index idx_user_status_last_seen on user_status(last_seen);

-- Enable RLS
alter table user_status enable row level security;

-- RLS Policy: Users can see if others are online (public visibility)
create policy "Users can view user status" on user_status
  for select
  using (true);

-- RLS Policy: Users can update their own status
create policy "Users can update own status" on user_status
  for insert
  with check (auth.uid() = user_id);

create policy "Users can update own status v2" on user_status
  for update
  using (auth.uid() = user_id);

-- Add online presence columns to order_messages if not exists
alter table order_messages add column if not exists read_status text default 'unread' check (read_status in ('read', 'unread'));
create index if not exists idx_order_messages_read_status on order_messages(read_status);

-- Update testimonials table if needed (may already exist)
alter table testimonials add column if not exists featured boolean default false;
alter table testimonials add column if not exists updated_at timestamp with time zone default now();
