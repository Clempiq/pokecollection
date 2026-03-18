<<<<<<< HEAD
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

/**
 * Dérive le type d'item depuis le nom du produit.
 * Les valeurs retournées correspondent aux labels dans item_types (DEFAULT_ITEM_TYPES).
 */
export function deriveItemType(productName) {
  const n = (productName || '').toLowerCase()
  // Elite Trainer Box — priorité sur 'box' générique
  if (n.includes('elite trainer') || n.startsWith('etb ') || n === 'etb') return 'Elite Trainer Box (ETB)'
  // Display / Booster Box
  if (n.includes('booster box') || n.includes('display')) return 'Booster Box (Display)'
  // Bundle — avant 'booster' car "booster bundle" doit atterrir ici
  if (n.includes('bundle')) return 'Bundle'
  // Coffret Collection
  if (n.includes('collection box') || n.includes('coffret') || n.includes('collection premium')) return 'Coffret Collection'
  // Tin (métal) — "mini tin" inclus, "boîte métal" aussi
  if (n.includes('mini tin') || n.includes('tin') || n.includes('boîte métal') || n.includes('boite metal')) return 'Tin'
  // Blister / Pack
  if (n.includes('blister') || n.includes('blister pack')) return 'Blister / Pack'
  // Starter / Battle Deck
  if (n.includes('starter') || n.includes('battle deck') || n.includes('starter deck')) return 'Starter / Battle Deck'
  // Promo
  if (n.includes('promo') || n.includes('spécial') || n.includes('special')) return 'Promo / Spécial'
  // Défaut
  return 'Booster Box (Display)'
}
=======
import { supabase } from './supabase'

let cache = {}

export async function searchPokemonProducts(query) {
  if (cache[query]) return cache[query]

  try {
    const { data } = await supabase.functions.invoke('pokemon-price', { body: { query } })
    cache[query] = data
    return data
  } catch (err) {
    console.error('API error:', err)
    return []
  }
}

export function extractPrice(product) {
  return product.price_usd || product.price_eur || null
}

export function extractImage(product) {
  return product.image_url || product.image || null
}

export function deriveItemType(productName) {
  const name = productName.toLowerCase()
  if (name.includes('booster')) return 'booster'
  if (name.includes('deck')) return 'deck'
  if (name.includes('tin')) return 'tin'
  if (name.includes('box')) return 'box'
  return 'other'
}
>>>>>>> 75bda405994aff8b32f967b0793cc12339417565
