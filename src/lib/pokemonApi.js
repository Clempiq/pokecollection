import { supabase } from './supabase'

async function callEdgeFunction(body) {
  const { data, error } = await supabase.functions.invoke('pokemon-price', { body })
  if (error) {
    const status = error.context?.status
    if (status === 429) throw new Error('daily_limit_reached')
    throw new Error(error.message || 'search_error')
  }
  return data
}

/**
 * Search sealed products. offset=0 for first page, 6 for "Voir +", etc.
 */
export async function searchProducts(query, offset = 0) {
  if (!query || query.trim().length < 2) return []
  const data = await callEdgeFunction({ search: query.trim(), offset })
  return data?.data || data?.results || []
}

/**
 * Refresh price for a single product by its API ID
 */
export async function refreshProductPrice(productId) {
  const data = await callEdgeFunction({ id: String(productId) })
  return data?.data || data
}

/**
 * Search products directly in Supabase cache (no API call, no rate limit)
 * Used for "Voir +" when cache is populated
 */
export async function searchProductsFromCache(query, offset = 0) {
  const { data } = await supabase
    .from('pokemon_products')
    .select('*')
    .ilike('name', `%${query}%`)
    .order('synced_at', { ascending: false })
    .range(offset, offset + 5)
  return (data || []).map(r => r.full_data).filter(Boolean)
}

/** Extract best EUR price (lowest_FR first, then lowest) */
export function extractPrice(product) {
  const cm = product?.prices?.cardmarket
  if (!cm) return null
  return cm.lowest_FR ?? cm.lowest ?? null
}

/** Extract product image URL */
export function extractImage(product) {
  return (
    product?.imageCdnUrl400 ||
    product?.imageCdnUrl200 ||
    product?.imageCdnUrl ||
    product?.imageUrl ||
    product?.image ||
    product?.img ||
    null
  )
}

/** Derive item_type from product name */
export function deriveItemType(productName) {
  const n = (productName || '').toLowerCase()
  if (n.includes('elite trainer') || n.includes('etb')) return 'ETB'
  if (n.includes('booster box') || n.includes('display')) return 'Booster Box'
  if (n.includes('collection box') || n.includes('coffret')) return 'Coffret'
  if (n.includes('tin')) return 'Tin'
  if (n.includes('blister')) return 'Blister'
  if (n.includes('starter') || n.includes('battle deck')) return 'Starter Deck'
  if (n.includes('booster bundle') || n.includes('blister pack')) return 'Blister'
  if (n.includes('mini tin')) return 'Tin'
  return 'Booster Box'
}
