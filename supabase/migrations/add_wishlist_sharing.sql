-- Migration: add wishlist public sharing
-- Run this in the Supabase SQL editor

-- 1. Add share token column to profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS wishlist_share_token TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS wishlist_public       BOOLEAN NOT NULL DEFAULT FALSE;

-- 2. RPC function: get public wishlist by share token (SECURITY DEFINER bypasses RLS)
CREATE OR REPLACE FUNCTION get_public_wishlist(p_token TEXT)
RETURNS TABLE (
  id                     UUID,
  name                   TEXT,
  set_name               TEXT,
  item_type              TEXT,
  priority               INTEGER,
  target_price           NUMERIC,
  market_price           NUMERIC,
  market_price_updated_at TIMESTAMPTZ,
  api_image_url          TEXT,
  api_product_id         TEXT,
  notes                  TEXT,
  variant_notes          TEXT,
  created_at             TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Lookup owner by token
  SELECT profiles.id INTO v_user_id
  FROM profiles
  WHERE profiles.wishlist_share_token = p_token
    AND profiles.wishlist_public = TRUE;

  -- Return nothing if token not found or sharing disabled
  IF v_user_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    w.id, w.name, w.set_name, w.item_type, w.priority,
    w.target_price, w.market_price, w.market_price_updated_at,
    w.api_image_url, w.api_product_id, w.notes, w.variant_notes, w.created_at
  FROM wishlists w
  WHERE w.user_id = v_user_id
  ORDER BY w.priority ASC, w.created_at DESC;
END;
$$;

-- 3. RPC function: get owner profile info for a share token
CREATE OR REPLACE FUNCTION get_wishlist_owner(p_token TEXT)
RETURNS TABLE (username TEXT, email TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT profiles.username, profiles.email
  FROM profiles
  WHERE profiles.wishlist_share_token = p_token
    AND profiles.wishlist_public = TRUE;
END;
$$;

-- 4. Allow authenticated users to update their own share_token / wishlist_public
-- (RLS on profiles should already allow users to update their own row)
-- No additional policy needed if profiles has: UPDATE USING (auth.uid() = id)
