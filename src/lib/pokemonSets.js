/**
 * Liste des séries Pokémon TCG
 * Source : Pokémon TCG API (api.pokemontcg.io) avec fallback manuel
 * Pour mettre à jour : appeler fetchSetsFromAPI() et remplacer FALLBACK_SETS
 */

// ─── Fallback manuel (mis à jour régulièrement) ────────────────────────────
export const FALLBACK_SETS = [
  // Écarlate et Violet (2023–présent)
  { series: 'Écarlate et Violet', name: 'Stellar Crown (EV7)' },
  { series: 'Écarlate et Violet', name: 'Fable Nébuleuse (EV6.5)' },
  { series: 'Écarlate et Violet', name: 'Forces Temporelles (EV5)' },
  { series: 'Écarlate et Violet', name: 'Mascarade Crépusculaire (EV6)' },
  { series: 'Écarlate et Violet', name: 'Feux Pâles (EV4.5)' },
  { series: 'Écarlate et Violet', name: 'Évolutions à Paldea (EV4)' },
  { series: 'Écarlate et Violet', name: 'Flammes Obsidiennes (EV3)' },
  { series: 'Écarlate et Violet', name: 'Carte à la Une – Paldea (EV2.5)' },
  { series: 'Écarlate et Violet', name: 'Évolution à Paldea (EV2)' },
  { series: 'Écarlate et Violet', name: 'Écarlate et Violet de Base (EV1)' },
  // Épée et Bouclier (2020–2023)
  { series: 'Épée et Bouclier', name: 'Couronne Stellaire (EB12.5)' },
  { series: 'Épée et Bouclier', name: 'Zénith Suprême (EB12)' },
  { series: 'Épée et Bouclier', name: 'Étoiles Radieuses (EB9)' },
  { series: 'Épée et Bouclier', name: 'Astres Radieux (EB10)' },
  { series: 'Épée et Bouclier', name: 'Origine Perdue (EB11)' },
  { series: 'Épée et Bouclier', name: 'Styles de Combat (EB5)' },
  { series: 'Épée et Bouclier', name: 'Règne de Glace (EB6)' },
  { series: 'Épée et Bouclier', name: 'Évolutions Célestes (EB7)' },
  { series: 'Épée et Bouclier', name: 'Poing de Fusion (EB8)' },
  { series: 'Épée et Bouclier', name: 'Voltage Éclatant (EB4)' },
  { series: 'Épée et Bouclier', name: 'Ténèbres Embrasées (EB3)' },
  { series: 'Épée et Bouclier', name: 'Rébellion Rebelle (EB2)' },
  { series: 'Épée et Bouclier', name: 'Épée et Bouclier de Base (EB1)' },
  // Soleil et Lune (2017–2019)
  { series: 'Soleil et Lune', name: 'Harmonie des Esprits (SL11)' },
  { series: 'Soleil et Lune', name: 'Duo de Choc (SL9)' },
  { series: 'Soleil et Lune', name: 'Tempête Céleste (SL7)' },
  { series: 'Soleil et Lune', name: 'Lumière Interdite (SL6)' },
  { series: 'Soleil et Lune', name: 'Ultra-Prisme (SL5)' },
  { series: 'Soleil et Lune', name: 'Invasion Carmin (SL4)' },
  { series: 'Soleil et Lune', name: 'Ombres Ardentes (SL3)' },
  { series: 'Soleil et Lune', name: 'Gardiens Ascendants (SL2)' },
  { series: 'Soleil et Lune', name: 'Soleil et Lune de Base (SL1)' },
  // XY (2014–2016)
  { series: 'XY', name: 'Évolutions (XY12)' },
  { series: 'XY', name: 'Steam Siege (XY11)' },
  { series: 'XY', name: 'Fates Collide (XY10)' },
  { series: 'XY', name: 'BREAKpoint (XY9)' },
  { series: 'XY', name: 'BREAKthrough (XY8)' },
  { series: 'XY', name: 'Origines Antiques (XY7)' },
  { series: 'XY', name: 'Primo Choc (XY6)' },
  { series: 'XY', name: 'Primal Clash (XY5)' },
  { series: 'XY', name: 'Phantom Forces (XY4)' },
  { series: 'XY', name: 'Furious Fists (XY3)' },
  { series: 'XY', name: 'Étincelles (XY2)' },
  { series: 'XY', name: 'XY de Base (XY1)' },
  // Spéciaux
  { series: 'Spécial', name: 'Celebrations (25 ans)' },
  { series: 'Spécial', name: 'Pokémon GO' },
  { series: 'Spécial', name: 'Crown Zenith' },
  { series: 'Spécial', name: 'Shining Fates' },
  { series: 'Spécial', name: 'Hidden Fates' },
  { series: 'Spécial', name: 'Dragon Majesty' },
  { series: 'Spécial', name: 'Autre / Personnalisé' },
]

// Grouper par série pour l'affichage en <optgroup>
export function groupSetsBySeries(sets) {
  return sets.reduce((acc, s) => {
    if (!acc[s.series]) acc[s.series] = []
    acc[s.series].push(s.name)
    return acc
  }, {})
}

// Tenter de récupérer les sets depuis l'API Pokémon TCG
export async function fetchSetsFromAPI() {
  try {
    const res = await fetch('https://api.pokemontcg.io/v2/sets?orderBy=-releaseDate&pageSize=250')
    if (!res.ok) throw new Error('API unavailable')
    const { data } = await res.json()
    // Transformer en format { series, name }
    return data.map(s => ({ series: s.series, name: `${s.name} (${s.ptcgoCode || s.id})` }))
  } catch {
    return null // Utiliser le fallback
  }
}

/**
 * Hook React : retourne la liste des sets (API ou fallback)
 */
import { useState, useEffect } from 'react'

export function usePokemonSets() {
  const [sets, setSets] = useState(FALLBACK_SETS)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchSetsFromAPI().then(apiSets => {
      if (apiSets && apiSets.length > 0) setSets(apiSets)
      setLoading(false)
    })
  }, [])

  return { sets, grouped: groupSetsBySeries(sets), loading }
}
