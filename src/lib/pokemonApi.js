import { supabase } from './supabase'

/**
 * Search sealed products by name (partial match)
 * Uses supabase.functions.invoke() for automatic JWT auth
 */
export async function searchProducts(query) {
  if (!query || query.trim().length < 2) return []

  const { data, error } = await supabase.functions.invoke('pokemon-price', {
    body: { search: query.trim() },
  })

  if (error) {
    if (error.message?.includes('429') || error.context?.status === 429) {
      throw new Error('daily_limit_reached')
    }
    throw new Error(error.message || 'search_error')
  }

  return data?.data || data?.results || []
}

/**
 * Refresh price for a single product by its API ID
 */
export async function refreshProductPrice(productId) {
  const { data, error } = await supabase.functions.invoke('pokemon-price', {
    body: { id: String(productId) },
  })

  if (error) throw new Error(error.message || 'refresh_error')
  return data?.data || data
}

/**
 * Extract best EUR price from a product (lowest_FR first, then lowest)
 */
export function extractPrice(product) {
  const cm = product?.prices?.cardmarket
  if (!cm) return null
  return cm.lowest_FR ?? cm.lowest ?? null
}

/**
 * Extract product image URL (tries multiple known field names)
 */
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
