create or replace function check_and_award_badges(p_user_id uuid)
returns uuid[] as $$
declare
  v_new_badges uuid[] := '{}';
  v_item_count integer;
  v_total_value numeric;
  v_friend_count integer;
  v_like_count integer;
  v_account_age_days integer;
begin
  -- Get stats
  select count(*) into v_item_count from items where user_id = p_user_id;
  select coalesce(sum(current_value), 0) into v_total_value from items where user_id = p_user_id;
  select count(*) into v_friend_count from friendships where (requester_id = p_user_id or addressee_id = p_user_id) and status = 'accepted';
  select count(*) into v_like_count from likes where user_id = p_user_id;
  select extract(day from now() - (select created_at from auth.users where id = p_user_id)) into v_account_age_days;

  -- Award collection badges
  if v_item_count >= 10 and not exists(select 1 from user_badges where user_id = p_user_id and badge_id = (select id from badges where label = 'Collection Starter')) then
    v_new_badges := array_append(v_new_badges, (select id from badges where label = 'Collection Starter'));
  end if;

  if v_item_count >= 50 and not exists(select 1 from user_badges where user_id = p_user_id and badge_id = (select id from badges where label = 'Collection Enthusiast')) then
    v_new_badges := array_append(v_new_badges, (select id from badges where label = 'Collection Enthusiast'));
  end if;

  -- Award value badges
  if v_total_value >= 1000 and not exists(select 1 from user_badges where user_id = p_user_id and badge_id = (select id from badges where label = 'Treasure Seeker')) then
    v_new_badges := array_append(v_new_badges, (select id from badges where label = 'Treasure Seeker'));
  end if;

  -- Award social badges
  if v_friend_count >= 5 and not exists(select 1 from user_badges where user_id = p_user_id and badge_id = (select id from badges where label = 'Social Butterfly')) then
    v_new_badges := array_append(v_new_badges, (select id from badges where label = 'Social Butterfly'));
  end if;

  -- Award loyalty badges
  if v_account_age_days >= 30 and not exists(select 1 from user_badges where user_id = p_user_id and badge_id = (select id from badges where label = 'Loyal Member')) then
    v_new_badges := array_append(v_new_badges, (select id from badges where label = 'Loyal Member'));
  end if;

  -- Award like badges
  if v_like_count >= 10 and not exists(select 1 from user_badges where user_id = p_user_id and badge_id = (select id from badges where label = 'Appreciated')) then
    v_new_badges := array_append(v_new_badges, (select id from badges where label = 'Appreciated'));
  end if;

  -- Insert new badges
  insert into user_badges (user_id, badge_id)
  select p_user_id, unnest(v_new_badges)
  on conflict do nothing;

  return v_new_badges;
end;
$$ language plpgsql security definer;
