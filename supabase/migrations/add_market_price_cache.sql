-- Migration: add market price cache columns to wishlists
-- Run this in the Supabase SQL editor

ALTER TABLE wishlists
  ADD COLUMN IF NOT EXISTS market_price         NUMERIC,
  ADD COLUMN IF NOT EXISTS market_price_updated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS api_product_id       TEXT,
  ADD COLUMN IF NOT EXISTS api_image_url        TEXT;

-- Table for daily API call counting (used by Edge Function)
CREATE TABLE IF NOT EXISTS api_daily_counts (
  date        DATE PRIMARY KEY DEFAULT CURRENT_DATE,
  count       INTEGER NOT NULL DEFAULT 0,
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE api_daily_counts ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read the count (to show remaining calls in UI)
CREATE POLICY "Authenticated can read api counts"
  ON api_daily_counts FOR SELECT
  USING (auth.role() = 'authenticated');

-- Service role only for writes (edge function uses service role key)
-- No INSERT/UPDATE policy needed — service role bypasses RLS
