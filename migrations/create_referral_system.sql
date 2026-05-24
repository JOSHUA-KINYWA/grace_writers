-- Referral system (codes + relationships)

-- A client/user can have one referral code.
create table if not exists referral_codes (
  id uuid default gen_random_uuid() primary key,
  code text not null unique,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  owner_client_id uuid references clients(id) on delete set null,
  active boolean default true,
  created_at timestamptz default now()
);

create unique index if not exists idx_referral_codes_owner_user on referral_codes(owner_user_id);
create index if not exists idx_referral_codes_owner_client on referral_codes(owner_client_id);

-- A referral row is created when a user signs up with a code.
create table if not exists referrals (
  id uuid default gen_random_uuid() primary key,
  code_used text not null references referral_codes(code) on delete restrict,
  referrer_user_id uuid not null references auth.users(id) on delete restrict,
  referrer_client_id uuid references clients(id) on delete set null,
  referred_user_id uuid not null references auth.users(id) on delete cascade,
  referred_client_id uuid references clients(id) on delete set null,
  status text not null default 'pending' check (status in ('pending','confirmed','invalid')),
  created_at timestamptz default now(),
  confirmed_at timestamptz null
);

create unique index if not exists idx_referrals_referred_user on referrals(referred_user_id);
create index if not exists idx_referrals_referrer_user on referrals(referrer_user_id);
create index if not exists idx_referrals_status on referrals(status);

-- Enable RLS (policies below are intentionally minimal; server routes can still use service role)
alter table referral_codes enable row level security;
alter table referrals enable row level security;

-- Referral code visibility
drop policy if exists "Referral codes readable by owner" on referral_codes;
create policy "Referral codes readable by owner" on referral_codes
  for select
  using (auth.uid() = owner_user_id);

drop policy if exists "Referral codes insertable by owner" on referral_codes;
create policy "Referral codes insertable by owner" on referral_codes
  for insert
  with check (auth.uid() = owner_user_id);

drop policy if exists "Referral codes updatable by owner" on referral_codes;
create policy "Referral codes updatable by owner" on referral_codes
  for update
  using (auth.uid() = owner_user_id)
  with check (auth.uid() = owner_user_id);

-- Referrals visibility (either side can read)
drop policy if exists "Referrals readable by participants" on referrals;
create policy "Referrals readable by participants" on referrals
  for select
  using (auth.uid() = referrer_user_id or auth.uid() = referred_user_id);

