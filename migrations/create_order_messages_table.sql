-- Create order_messages table for order-specific chat
create table order_messages (
  id uuid default gen_random_uuid() primary key,
  order_id uuid not null references orders(id) on delete cascade,
  sender_id uuid not null,
  sender_name text not null,
  content text not null,
  is_admin boolean default false,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Create index for faster queries
create index idx_order_messages_order_id on order_messages(order_id);
create index idx_order_messages_created_at on order_messages(created_at);

-- Enable RLS
alter table order_messages enable row level security;

-- RLS Policy: Users can read messages from their own orders or if admin
create policy "Users can read order messages" on order_messages
  for select
  using (
    auth.uid() = sender_id 
    or exists (
      select 1 from orders o
      inner join clients c on o.client_id = c.id
      where o.id = order_messages.order_id
      and c.email = auth.jwt() ->> 'email'
    )
    or (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

-- RLS Policy: Users can insert messages into their own orders or if admin
create policy "Users can insert order messages" on order_messages
  for insert
  with check (
    auth.uid() = sender_id
    and (
      exists (
        select 1 from orders o
        inner join clients c on o.client_id = c.id
        where o.id = order_messages.order_id
        and c.email = auth.jwt() ->> 'email'
      )
      or (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    )
  );

-- RLS Policy: Only admins can delete messages
create policy "Admins can delete order messages" on order_messages
  for delete
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
