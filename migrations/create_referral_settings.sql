-- Referral settings/configuration for confirmation + rewards.
create table if not exists referral_settings (
  id uuid default gen_random_uuid() primary key,
  confirmation_rule text not null default 'paid_or_completed'
    check (confirmation_rule in ('paid_only', 'completed_only', 'paid_or_completed')),
  reward_per_confirmed numeric(12,2) not null default 5.00,
  reward_currency text not null default 'USD',
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table referral_settings enable row level security;

drop policy if exists "Referral settings readable by admins" on referral_settings;
create policy "Referral settings readable by admins" on referral_settings
  for select
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

drop policy if exists "Referral settings writable by admins" on referral_settings;
create policy "Referral settings writable by admins" on referral_settings
  for all
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

