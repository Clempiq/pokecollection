<<<<<<< HEAD
CREATE OR REPLACE FUNCTION check_and_award_badges(p_user_id UUID)
RETURNS TEXT[]
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_item_count INT;
  v_unique_sets INT;
  v_total_value NUMERIC;
  v_total_cost NUMERIC;
  v_friend_count INT;
  v_like_count INT;
  v_wish_count INT;
  v_has_old_item BOOL;
  v_has_very_old_item BOOL;
  v_member_since TIMESTAMPTZ;
  v_user_rank INT;
  v_new_badges TEXT[] := '{}';
  v_badge TEXT;
BEGIN
  -- Stats items
  SELECT
    COUNT(*),
    COUNT(DISTINCT set_name),
    COALESCE(SUM(current_value * quantity), 0),
    COALESCE(SUM(purchase_price * quantity), 0)
  INTO v_item_count, v_unique_sets, v_total_value, v_total_cost
  FROM items WHERE user_id = p_user_id;

  -- Amis acceptés
  SELECT COUNT(*) INTO v_friend_count FROM friendships
  WHERE (requester_id = p_user_id OR addressee_id = p_user_id) AND status = 'accepted';

  -- Likes reçus
  SELECT COALESCE(SUM(like_count), 0) INTO v_like_count FROM items WHERE user_id = p_user_id;

  -- Wishlist
  SELECT COUNT(*) INTO v_wish_count FROM wishlists WHERE user_id = p_user_id;

  -- Item ancien (1 an+)
  SELECT EXISTS(
    SELECT 1 FROM items WHERE user_id = p_user_id
    AND created_at < NOW() - INTERVAL '1 year'
  ) INTO v_has_old_item;

  -- Item très ancien (2 ans+)
  SELECT EXISTS(
    SELECT 1 FROM items WHERE user_id = p_user_id
    AND created_at < NOW() - INTERVAL '2 years'
  ) INTO v_has_very_old_item;

  -- Date d'inscription
  SELECT created_at INTO v_member_since FROM profiles WHERE id = p_user_id;

  -- Rang d'inscription (position parmi tous les users par date)
  SELECT COUNT(*) + 1 INTO v_user_rank FROM profiles
  WHERE created_at < v_member_since;

  -- Évaluer chaque badge et insérer si eligible
  FOR v_badge IN
    SELECT b.id FROM badges b
    WHERE b.id NOT IN (SELECT badge_id FROM user_badges WHERE user_id = p_user_id)
  LOOP
    DECLARE v_earned BOOL := FALSE;
    BEGIN
      v_earned := CASE v_badge
        WHEN 'first_item'     THEN v_item_count >= 1
        WHEN 'items_5'        THEN v_item_count >= 5
        WHEN 'items_10'       THEN v_item_count >= 10
        WHEN 'items_25'       THEN v_item_count >= 25
        WHEN 'items_50'       THEN v_item_count >= 50
        WHEN 'items_100'      THEN v_item_count >= 100
        WHEN 'items_250'      THEN v_item_count >= 250
        WHEN 'sets_3'         THEN v_unique_sets >= 3
        WHEN 'sets_5'         THEN v_unique_sets >= 5
        WHEN 'sets_10'        THEN v_unique_sets >= 10
        WHEN 'value_100'      THEN v_total_value >= 100
        WHEN 'value_500'      THEN v_total_value >= 500
        WHEN 'value_1000'     THEN v_total_value >= 1000
        WHEN 'value_5000'     THEN v_total_value >= 5000
        WHEN 'pnl_positive'   THEN v_item_count > 0 AND v_total_value > v_total_cost
        WHEN 'veteran_1y'     THEN v_has_old_item
        WHEN 'veteran_2y'     THEN v_has_very_old_item
        WHEN 'member_1y'      THEN v_member_since < NOW() - INTERVAL '1 year'
        WHEN 'first_friend'   THEN v_friend_count >= 1
        WHEN 'friends_5'      THEN v_friend_count >= 5
        WHEN 'first_like'     THEN v_like_count >= 1
        WHEN 'likes_10'       THEN v_like_count >= 10
        WHEN 'first_wish'     THEN v_wish_count >= 1
        WHEN 'wish_5'         THEN v_wish_count >= 5
        WHEN 'early_adopter'  THEN v_user_rank <= 50
        ELSE FALSE
      END;

      IF v_earned THEN
        INSERT INTO user_badges (user_id, badge_id) VALUES (p_user_id, v_badge)
        ON CONFLICT DO NOTHING;
        v_new_badges := array_append(v_new_badges, v_badge);
      END IF;
    END;
  END LOOP;

  RETURN v_new_badges;
END;
$$;
=======
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
>>>>>>> 75bda405994aff8b32f967b0793cc12339417565
