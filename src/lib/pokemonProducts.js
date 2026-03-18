<<<<<<< HEAD
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
=======
import { useEffect, useState } from 'react'
import { supabase } from './supabase'

export function usePokemonProducts() {
  const [products, setProducts] = useState([])
  const [setNames, setSetNames] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase.from('pokemon_products').select('*')
      setProducts(data || [])
      const names = [...new Set((data || []).map(p => p.set_name))].sort()
      setSetNames(names)
      setLoading(false)
    }
    fetch()
  }, [])

  return { products, setNames, loading }
}
>>>>>>> 75bda405994aff8b32f967b0793cc12339417565
