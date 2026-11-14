-- Ensure read tracking columns exist and allow updating read status.

alter table order_messages
  add column if not exists read_at timestamp with time zone null;

-- Allow authenticated participants to mark messages as read.
-- (Uses same membership check as the select policy.)
drop policy if exists "Users can update order message read status" on order_messages;
create policy "Users can update order message read status" on order_messages
  for update
  using (
    exists (
      select 1 from orders o
      inner join clients c on o.client_id = c.id
      where o.id = order_messages.order_id
      and c.email = auth.jwt() ->> 'email'
    )
    or (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  )
  with check (
    exists (
      select 1 from orders o
      inner join clients c on o.client_id = c.id
      where o.id = order_messages.order_id
      and c.email = auth.jwt() ->> 'email'
    )
    or (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

