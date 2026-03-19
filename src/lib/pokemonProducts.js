/**
 * Hook usePokemonProducts
 * Charge tous les produits depuis la table Supabase `pokemon_products`
 * (cache local de l'API RapidAPI) et expose les noms de sets uniques.
 *
 * Les données sont mises en cache en mémoire pour ne pas refaire la requête
 * à chaque ouverture de modal.
 */
import { useState, useEffect } from 'react'
import { supabase } from './supabase'

let _cache = null // cache mémoire inter-renders

export function usePokemonProducts() {
  const [products, setProducts] = useState(_cache || [])
  const [loading, setLoading]   = useState(!_cache)

  useEffect(() => {
    if (_cache) return // déjà chargé
    supabase
      .from('pokemon_products')
      .select('api_id, name, set_name, image_url, market_price, market_price_fr')
      .order('name', { ascending: true })
      .then(({ data, error }) => {
        if (!error) {
          _cache = data || []
          setProducts(_cache)
        }
        setLoading(false)
      })
  }, [])

  // Noms de sets uniques triés alphabétiquement (pour le dropdown Extension)
  const sets = [...new Set(
    products.map(p => p.set_name).filter(Boolean)
  )].sort((a, b) => a.localeCompare(b))

  return { products, sets, loading }
}

/** Vide le cache (à appeler après une synchro admin) */
export function invalidatePokemonProductsCache() {
  _cache = null
}
