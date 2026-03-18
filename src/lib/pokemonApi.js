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
