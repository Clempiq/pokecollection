-- Table des badges disponibles
CREATE TABLE badges (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL,
  category TEXT NOT NULL, -- 'collection' | 'valeur' | 'social' | 'fidelite' | 'wishlist' | 'special'
  rarity TEXT NOT NULL DEFAULT 'common', -- 'common' | 'rare' | 'epic' | 'legendary'
  sort_order INT DEFAULT 0
);

-- Badges débloqués par utilisateur
CREATE TABLE user_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  badge_id TEXT REFERENCES badges(id) NOT NULL,
  unlocked_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, badge_id)
);

ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own badges" ON user_badges FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "System inserts badges" ON user_badges FOR INSERT WITH CHECK (true);

ALTER TABLE badges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone reads badges" ON badges FOR SELECT USING (true);

-- Catalogue complet de badges
INSERT INTO badges (id, label, description, icon, category, rarity, sort_order) VALUES
-- Collection : taille
('first_item',     'Premier Pas',      'Ajouter ton premier item scellé',           '📦', 'collection', 'common',    1),
('items_5',        'Collectionneur',   'Avoir 5 items dans ta collection',          '🎒', 'collection', 'common',    2),
('items_10',       'Sérieux',          'Avoir 10 items dans ta collection',         '📚', 'collection', 'common',    3),
('items_25',       'Passionné',        'Avoir 25 items dans ta collection',         '🔥', 'collection', 'rare',      4),
('items_50',       'Expert',           'Avoir 50 items dans ta collection',         '⭐', 'collection', 'rare',      5),
('items_100',      'Maître',           'Avoir 100 items dans ta collection',        '👑', 'collection', 'epic',      6),
('items_250',      'Légendaire',       'Avoir 250 items dans ta collection',        '💎', 'collection', 'legendary', 7),

-- Collection : diversité
('sets_3',         'Explorateur',      'Avoir des items de 3 extensions différentes','🗺️', 'collection', 'common',   10),
('sets_5',         'Voyageur',         'Avoir des items de 5 extensions différentes','🌍', 'collection', 'rare',     11),
('sets_10',        'Globe-Trotteur',   'Avoir des items de 10 extensions différentes','🌐','collection','epic',     12),

-- Valeur
('value_100',      'Investisseur',     'Collection estimée à plus de 100€',        '💰', 'valeur',     'common',   20),
('value_500',      'Grand Investisseur','Collection estimée à plus de 500€',       '💳', 'valeur',     'rare',     21),
('value_1000',     'Whale',            'Collection estimée à plus de 1 000€',      '🐋', 'valeur',     'epic',     22),
('value_5000',     'Diamond Hands',    'Collection estimée à plus de 5 000€',      '💎', 'valeur',     'legendary',23),
('pnl_positive',   'Dans le Vert',     'Avoir un P&L positif sur ta collection',   '📈', 'valeur',     'rare',     24),

-- Fidélité
('veteran_1y',     'Vétéran',          'Avoir un item depuis plus d''un an',        '⏳', 'fidelite',   'rare',     30),
('veteran_2y',     'Musée Vivant',     'Avoir un item depuis plus de 2 ans',        '🏛️', 'fidelite',  'epic',     31),
('member_1y',      'Fidèle',           'Être membre depuis plus d''un an',          '🎂', 'fidelite',  'rare',     32),

-- Social
('first_friend',   'Sociable',         'Ajouter ton premier ami',                   '👋', 'social',     'common',   40),
('friends_5',      'Réseau',           'Avoir 5 amis sur PokéCollection',           '👥', 'social',     'rare',     41),
('first_like',     'Apprécié',         'Recevoir un premier j''aime sur un item',   '❤️', 'social',    'common',   42),
('likes_10',       'Populaire',        'Recevoir 10 j''aimes au total',             '🌟', 'social',    'rare',     43),

-- Wishlist
('first_wish',     'Rêveur',           'Ajouter ton premier item en wishlist',      '✨', 'wishlist',   'common',   50),
('wish_5',         'Ambitieux',        'Avoir 5 items dans ta wishlist',            '🎯', 'wishlist',   'common',   51),
('wish_completed', 'Objectif Atteint', 'Avoir coché un item de ta wishlist',        '✅', 'wishlist',  'rare',     52),

-- Spéciaux
('early_adopter',  'Early Adopter',    'Faire partie des 50 premiers membres',     '🚀', 'special',    'legendary',60),
('complete_item',  'Méticuleux',       'Remplir tous les champs d''un item',        '🔍', 'special',   'rare',     61),
('night_owl',      'Chouette de Nuit', 'Ajouter un item entre minuit et 4h du matin','🦉','special',  'epic',     62);
