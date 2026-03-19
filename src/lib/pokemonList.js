const CACHE_KEY = 'pokedex_list_v2' // v2 : inclut les noms français
const CACHE_TTL = 7 * 24 * 60 * 60 * 1000 // 7 jours

export const GENS = [
  { id: 1, label: 'Gén. 1', start: 1,   end: 151  },
  { id: 2, label: 'Gén. 2', start: 152,  end: 251  },
  { id: 3, label: 'Gén. 3', start: 252,  end: 386  },
  { id: 4, label: 'Gén. 4', start: 387,  end: 493  },
  { id: 5, label: 'Gén. 5', start: 494,  end: 649  },
  { id: 6, label: 'Gén. 6', start: 650,  end: 721  },
  { id: 7, label: 'Gén. 7', start: 722,  end: 809  },
  { id: 8, label: 'Gén. 8', start: 810,  end: 905  },
  { id: 9, label: 'Gén. 9', start: 906,  end: 1025 },
]

function formatName(raw) {
  return raw
    .split('-')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join('-')
}

export function spriteUrl(number) {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${number}.png`
}

export function genOf(number) {
  return GENS.find(g => number >= g.start && number <= g.end)?.id ?? 1
}

/** Récupère les noms français via l'API GraphQL PokeAPI (1 seule requête) */
async function fetchFrenchNames() {
  try {
    const res = await fetch('https://beta.pokeapi.co/graphql/v1beta', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `{
          pokemon_v2_pokemonspeciesname(
            where: { pokemon_v2_language: { name: { _eq: "fr" } } }
            order_by: { pokemon_species_id: asc }
            limit: 1025
          ) {
            pokemon_species_id
            name
          }
        }`
      })
    })
    if (!res.ok) return {}
    const { data } = await res.json()
    const names = data?.pokemon_v2_pokemonspeciesname || []
    const map = {}
    names.forEach(({ pokemon_species_id, name }) => {
      map[pokemon_species_id] = name
    })
    return map
  } catch (_) {
    return {}
  }
}

export async function getAllPokemon() {
  try {
    const cached = localStorage.getItem(CACHE_KEY)
    if (cached) {
      const { data, ts } = JSON.parse(cached)
      if (Date.now() - ts < CACHE_TTL) return data
    }
  } catch (_) { /* ignore */ }

  // Fetch liste anglaise + noms français en parallèle
  const [enRes, frMap] = await Promise.all([
    fetch('https://pokeapi.co/api/v2/pokemon?limit=1025&offset=0'),
    fetchFrenchNames(),
  ])

  if (!enRes.ok) throw new Error('PokeAPI unavailable')
  const { results } = await enRes.json()

  const data = results.map((p, i) => {
    const number = i + 1
    const nameEn = formatName(p.name)
    const nameFr = frMap[number] || nameEn // fallback anglais si pas de traduction
    return {
      number,
      name: nameFr,       // nom affiché (français)
      name_en: nameEn,    // nom anglais (pour recherche compatibilité)
      raw: p.name,
      sprite: spriteUrl(number),
      gen: genOf(number),
    }
  })

  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ data, ts: Date.now() }))
  } catch (_) { /* quota exceeded, skip */ }

  return data
}
