/**
 * Liste des séries Pokémon TCG
 * Source : table Supabase `pokemon_sets` (gérable via le dashboard Admin)
 */

import { useState, useEffect } from 'react'
import { supabase } from './supabase'

// Grouper par série en respectant series_order puis sort_order
export function groupSetsBySeries(sets) {
  // Construire un map série → { order, names[] }
  const map = {}
  sets.forEach(s => {
    if (!map[s.series]) map[s.series] = { series_order: s.series_order ?? 100, names: [] }
    map[s.series].names.push(s.name)
  })
  // Retourner un objet ordonné par series_order
  return Object.fromEntries(
    Object.entries(map)
      .sort((a, b) => a[1].series_order - b[1].series_order)
      .map(([series, { names }]) => [series, names])
  )
}

/**
 * Hook React : retourne la liste des sets depuis Supabase
 */
export function usePokemonSets() {
  const [sets, setSets] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('pokemon_sets')
      .select('series, name, series_order, sort_order')
      .order('series_order')
      .order('sort_order')
      .then(({ data }) => {
        setSets(data || [])
        setLoading(false)
      })
  }, [])

  return { sets, grouped: groupSetsBySeries(sets), loading }
}
