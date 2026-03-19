-- Add market price columns to wishlists
alter table wishlists add column if not exists market_price numeric;
alter table wishlists add column if not exists market_price_updated_at timestamp;

-- Create API daily counts table for rate limiting
create table if not exists api_daily_counts (
  id uuid primary key default gen_random_uuid(),
  date text not null unique,
  count integer default 0,
  created_at timestamp default now()
);

-- Create sync state table
create table if not exists sync_state (
  id uuid primary key default gen_random_uuid(),
  date text not null unique,
  synced_count integer default 0,
  last_sync timestamp,
  created_at timestamp default now()
);

alter table api_daily_counts enable row level security;
alter table sync_state enable row level security;

-- Only service role can access
create policy "Service role only" on api_daily_counts for all using (false) with check (false);
create policy "Service role only" on sync_state for all using (false) with check (false);
