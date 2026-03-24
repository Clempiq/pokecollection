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
 * Uses AND-logic on each word + client-side relevance re-ranking.
 * Used for "Voir +" when cache is populated
 */
export async function searchProductsFromCache(query, offset = 0) {
  const words = query.trim().toLowerCase().split(/\s+/).filter(w => w.length > 0)
  if (words.length === 0) return []

  // Try searching on name_fr first (AND on all words), then fall back to English name
  // Build an OR across name and name_fr for each word using PostgREST
  // Strategy: fetch broadly then re-rank client-side
  const fetchLimit = Math.max(30, (offset + 6) * 3)

  // Build compound filter: each word must appear in (name OR name_fr)
  let q = supabase.from('pokemon_products').select('*')
  for (const word of words) {
    q = q.or(`name.ilike.%${word}%,name_fr.ilike.%${word}%`)
  }
  const { data } = await q.range(0, fetchLimit - 1)

  if (!data || data.length === 0) return []

  // Client-side relevance scoring — check both name and name_fr
  const normalQuery = query.trim().toLowerCase()
  const scored = data.map(row => {
    const name = (row.name || '').toLowerCase()
    const nameFr = (row.name_fr || '').toLowerCase()
    const bestName = nameFr || name  // prefer French for scoring
    let score = 0

    // Exact phrase match (highest priority) — check both FR and EN
    if (bestName === normalQuery || name === normalQuery) score += 1000
    else if (bestName.startsWith(normalQuery) || name.startsWith(normalQuery)) score += 500
    else if (bestName.includes(normalQuery) || name.includes(normalQuery)) score += 200

    // Strong bonus: ALL query words appear in name_fr (ensures French matches beat English partial matches)
    if (nameFr && words.every(w => nameFr.includes(w))) score += 300

    // Count how many query words appear in the best name
    const matchedWords = words.filter(w => bestName.includes(w) || name.includes(w))
    score += matchedWords.length * 10

    // Prefer shorter names (more specific match) — increased penalty for generic long names
    score -= Math.min(bestName.length, name.length) * 0.3

    // Bonus: words appear in the same order as the query (check FR name)
    let pos = 0
    let orderBonus = 0
    for (const w of words) {
      const idx = bestName.indexOf(w, pos)
      if (idx !== -1) { orderBonus += 5; pos = idx + w.length }
    }
    score += orderBonus

    return { row, score }
  })

  scored.sort((a, b) => b.score - a.score)

  // Apply offset + limit on re-ranked results
  const page = scored.slice(offset, offset + 6)
  return page.map(({ row }) => row.full_data).filter(Boolean)
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
