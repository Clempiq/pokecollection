-- Create badges table
create table if not exists badges (
  id uuid primary key default gen_random_uuid(),
  label text not null unique,
  description text not null,
  icon text not null,
  category text not null check (category in ('collection', 'valeur', 'social', 'fidelite', 'wishlist', 'special')),
  rarity text not null check (rarity in ('common', 'rare', 'epic', 'legendary')),
  sort_order integer default 0,
  created_at timestamp default now()
);

-- Create user_badges junction table
create table if not exists user_badges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  badge_id uuid not null references badges(id) on delete cascade,
  unlocked_at timestamp default now(),
  unique(user_id, badge_id)
);

-- RLS policies
alter table badges enable row level security;
alter table user_badges enable row level security;

create policy "Badges are public" on badges for select to authenticated using (true);
create policy "Users can see their badges" on user_badges for select to authenticated using (user_id = auth.uid());
create policy "Users can manage their badges" on user_badges for insert, update, delete to authenticated using (user_id = auth.uid());
