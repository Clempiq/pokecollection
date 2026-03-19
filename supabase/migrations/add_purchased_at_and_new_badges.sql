-- ── 1. Champ date d'achat sur les items ──────────────────────────────────────
ALTER TABLE items ADD COLUMN IF NOT EXISTS purchased_at DATE;

-- ── 2. Nouveaux badges ───────────────────────────────────────────────────────
INSERT INTO badges (id, label, description, icon, category, rarity, sort_order) VALUES

-- Collection : diversité et quantité
('diversified',     'All-Rounder',      'Avoir des items de 5 types différents (ETB, Booster Box…)', '🎨', 'collection', 'rare',      13),
('hoarder',         'Accapareur',       'Posséder 5 exemplaires ou plus du même produit',            '🐉', 'collection', 'epic',      14),

-- Valeur
('big_spender',     'Gros Billet',      'Ajouter un item dont le prix d'achat dépasse 200 €',        '💸', 'valeur',     'rare',      25),
('the_vault',       'Fort Knox',        'Collection estimée à plus de 10 000 €',                     '🏦', 'valeur',     'legendary', 26),

-- Fidélité / temps
('nostalgia',       'Fossile Vivant',   'Posséder un item acheté il y a plus de 5 ans',              '🦕', 'fidelite',   'epic',      33),

-- Social
('social_butterfly','Papillon Social',  'Avoir 10 amis sur PokéCollection',                          '🦋', 'social',     'epic',      44),
('liked_50',        'Célébrité',        'Recevoir 50 j''aimes au total sur tes items',               '🌠', 'social',     'epic',      45),

-- Spéciaux
('collector_day',   'Flash Collector',  'Ajouter 5 items ou plus dans la même journée',              '⚡', 'special',    'rare',      63),
('photo_fan',       'Maniaque du Scan', 'Ajouter une image personnelle à 5 items',                   '📸', 'special',    'rare',      64),
('wish_completed',  'Objectif Atteint', 'Avoir coché un item de ta wishlist',                        '✅', 'wishlist',   'rare',      52)

ON CONFLICT (id) DO NOTHING;

-- ── 3. Mise à jour de la fonction check_and_award_badges ─────────────────────
CREATE OR REPLACE FUNCTION check_and_award_badges(p_user_id UUID)
RETURNS TEXT[]
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_item_count       INT;
  v_unique_sets      INT;
  v_total_value      NUMERIC;
  v_total_cost       NUMERIC;
  v_friend_count     INT;
  v_like_count       INT;
  v_wish_count       INT;
  v_has_old_item     BOOL;
  v_has_very_old_item BOOL;
  v_has_nostalgia    BOOL;
  v_member_since     TIMESTAMPTZ;
  v_user_rank        INT;
  v_new_badges       TEXT[] := '{}';
  v_badge            TEXT;
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

  -- Item ancien (1 an+ depuis ajout dans l'app)
  SELECT EXISTS(
    SELECT 1 FROM items WHERE user_id = p_user_id
    AND created_at < NOW() - INTERVAL '1 year'
  ) INTO v_has_old_item;

  -- Item très ancien (2 ans+)
  SELECT EXISTS(
    SELECT 1 FROM items WHERE user_id = p_user_id
    AND created_at < NOW() - INTERVAL '2 years'
  ) INTO v_has_very_old_item;

  -- Item acheté il y a 5+ ans (date d'achat renseignée)
  SELECT EXISTS(
    SELECT 1 FROM items WHERE user_id = p_user_id
    AND purchased_at IS NOT NULL
    AND purchased_at < CURRENT_DATE - INTERVAL '5 years'
  ) INTO v_has_nostalgia;

  -- Date d'inscription
  SELECT created_at INTO v_member_since FROM profiles WHERE id = p_user_id;

  -- Rang d'inscription
  SELECT COUNT(*) + 1 INTO v_user_rank FROM profiles
  WHERE created_at < v_member_since;

  -- Évaluer chaque badge
  FOR v_badge IN
    SELECT b.id FROM badges b
    WHERE b.id NOT IN (SELECT badge_id FROM user_badges WHERE user_id = p_user_id)
  LOOP
    DECLARE v_earned BOOL := FALSE;
    BEGIN
      v_earned := CASE v_badge
        WHEN 'first_item'        THEN v_item_count >= 1
        WHEN 'items_5'           THEN v_item_count >= 5
        WHEN 'items_10'          THEN v_item_count >= 10
        WHEN 'items_25'          THEN v_item_count >= 25
        WHEN 'items_50'          THEN v_item_count >= 50
        WHEN 'items_100'         THEN v_item_count >= 100
        WHEN 'items_250'         THEN v_item_count >= 250
        WHEN 'sets_3'            THEN v_unique_sets >= 3
        WHEN 'sets_5'            THEN v_unique_sets >= 5
        WHEN 'sets_10'           THEN v_unique_sets >= 10
        WHEN 'value_100'         THEN v_total_value >= 100
        WHEN 'value_500'         THEN v_total_value >= 500
        WHEN 'value_1000'        THEN v_total_value >= 1000
        WHEN 'value_5000'        THEN v_total_value >= 5000
        WHEN 'the_vault'         THEN v_total_value >= 10000
        WHEN 'pnl_positive'      THEN v_item_count > 0 AND v_total_value > v_total_cost
        WHEN 'big_spender'       THEN EXISTS(
                                   SELECT 1 FROM items WHERE user_id = p_user_id AND purchase_price >= 200
                                 )
        WHEN 'veteran_1y'        THEN v_has_old_item
        WHEN 'veteran_2y'        THEN v_has_very_old_item
        WHEN 'nostalgia'         THEN v_has_nostalgia
        WHEN 'member_1y'         THEN v_member_since < NOW() - INTERVAL '1 year'
        WHEN 'first_friend'      THEN v_friend_count >= 1
        WHEN 'friends_5'         THEN v_friend_count >= 5
        WHEN 'social_butterfly'  THEN v_friend_count >= 10
        WHEN 'first_like'        THEN v_like_count >= 1
        WHEN 'likes_10'          THEN v_like_count >= 10
        WHEN 'liked_50'          THEN v_like_count >= 50
        WHEN 'first_wish'        THEN v_wish_count >= 1
        WHEN 'wish_5'            THEN v_wish_count >= 5
        WHEN 'early_adopter'     THEN v_user_rank <= 50
        WHEN 'complete_item'     THEN EXISTS(
                                   SELECT 1 FROM items WHERE user_id = p_user_id
                                   AND name IS NOT NULL AND set_name IS NOT NULL
                                   AND item_type IS NOT NULL AND purchase_price IS NOT NULL
                                   AND current_value IS NOT NULL AND notes IS NOT NULL
                                 )
        WHEN 'night_owl'         THEN EXISTS(
                                   SELECT 1 FROM items WHERE user_id = p_user_id
                                   AND EXTRACT(HOUR FROM created_at AT TIME ZONE 'UTC') BETWEEN 0 AND 3
                                 )
        WHEN 'collector_day'     THEN EXISTS(
                                   SELECT 1 FROM (
                                     SELECT DATE(created_at) AS day, COUNT(*) AS cnt
                                     FROM items WHERE user_id = p_user_id
                                     GROUP BY DATE(created_at)
                                   ) daily WHERE cnt >= 5
                                 )
        WHEN 'diversified'       THEN (
                                   SELECT COUNT(DISTINCT item_type) FROM items
                                   WHERE user_id = p_user_id AND item_type IS NOT NULL AND item_type <> ''
                                 ) >= 5
        WHEN 'hoarder'           THEN EXISTS(
                                   SELECT 1 FROM (
                                     SELECT name, SUM(quantity) AS total
                                     FROM items WHERE user_id = p_user_id AND name IS NOT NULL
                                     GROUP BY name
                                   ) grouped WHERE total >= 5
                                 )
        WHEN 'photo_fan'         THEN (
                                   SELECT COUNT(*) FROM items WHERE user_id = p_user_id
                                   AND api_image_url IS NOT NULL
                                   AND api_image_url NOT LIKE 'https://images.pokemontcg.io%'
                                   AND api_image_url NOT LIKE 'https://ikrouqkiqacgpqdfjsnu%'
                                 ) >= 5
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
