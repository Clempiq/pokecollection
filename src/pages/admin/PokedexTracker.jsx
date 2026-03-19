import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { getAllPokemon, GENS, spriteUrl } from '../../lib/pokemonList'

const FILTER_OPTIONS = [
  { id: 'all',     label: 'Tous' },
  { id: 'owned',   label: 'Possédés ✅' },
  { id: 'missing', label: 'Manquants ❌' },
]

export default function PokedexTracker() {
  const { user } = useAuth()
  const [allPokemon, setAllPokemon]   = useState([])
  const [owned, setOwned]             = useState(new Set())
  const [loading, setLoading]         = useState(true)
  const [apiError, setApiError]       = useState(null)
  const [search, setSearch]           = useState('')
  const [filter, setFilter]           = useState('all')
  const [activeGen, setActiveGen]     = useState(0) // 0 = toutes
  const [toggling, setToggling]       = useState(new Set())

  // Chargement initial
  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const [list, { data: rows }] = await Promise.all([
          getAllPokemon(),
          supabase.from('pokemon_checklist').select('pokemon_number').eq('user_id', user.id),
        ])
        setAllPokemon(list)
        setOwned(new Set((rows || []).map(r => r.pokemon_number)))
      } catch (e) {
        setApiError(String(e))
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [user.id])

  const toggle = async (number) => {
    if (toggling.has(number)) return
    setToggling(prev => new Set(prev).add(number))

    const isOwned = owned.has(number)
    // Optimistic update
    setOwned(prev => {
      const next = new Set(prev)
      isOwned ? next.delete(number) : next.add(number)
      return next
    })

    if (isOwned) {
      await supabase.from('pokemon_checklist')
        .delete()
        .eq('user_id', user.id)
        .eq('pokemon_number', number)
    } else {
      await supabase.from('pokemon_checklist')
        .insert({ user_id: user.id, pokemon_number: number })
    }

    setToggling(prev => { const next = new Set(prev); next.delete(number); return next })
  }

  const visiblePokemon = useMemo(() => {
    let list = allPokemon
    if (activeGen > 0) {
      const gen = GENS.find(g => g.id === activeGen)
      if (gen) list = list.filter(p => p.number >= gen.start && p.number <= gen.end)
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      list = list.filter(p =>
        p.name.toLowerCase().includes(q) ||
        String(p.number).includes(q)
      )
    }
    if (filter === 'owned')   list = list.filter(p => owned.has(p.number))
    if (filter === 'missing') list = list.filter(p => !owned.has(p.number))
    return list
  }, [allPokemon, search, filter, activeGen, owned])

  // Stats par gen
  const genStats = useMemo(() => GENS.map(g => {
    const total = g.end - g.start + 1
    const have = [...owned].filter(n => n >= g.start && n <= g.end).length
    return { ...g, total, have, pct: Math.round((have / total) * 100) }
  }), [owned])

  const totalOwned = owned.size

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-16 gap-3">
      <div className="w-8 h-8 border-4 border-pokemon-red border-t-transparent rounded-full animate-spin" />
      <p className="text-sm text-gray-400">Chargement du Pokédex…</p>
    </div>
  )

  if (apiError) return (
    <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
      ❌ Impossible de charger la liste Pokémon : {apiError}
    </div>
  )

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold text-gray-900">🗂️ Mon Pokédex personnel</h2>
        <p className="text-sm text-gray-400 mt-0.5">Coche les Pokémon dont tu as au moins une carte, toutes séries confondues.</p>
      </div>

      {/* Barre de progression globale */}
      <div className="card p-4 space-y-2">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-3xl font-bold text-gray-900">{totalOwned}<span className="text-lg text-gray-400 font-normal"> / 1025</span></p>
            <p className="text-sm text-gray-500">Pokémon possédés</p>
          </div>
          <p className="text-2xl font-bold text-pokemon-red">{Math.round((totalOwned / 1025) * 100)}%</p>
        </div>
        <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-pokemon-red to-pokemon-yellow rounded-full transition-all duration-500"
            style={{ width: `${(totalOwned / 1025) * 100}%` }}
          />
        </div>
      </div>

      {/* Stats par génération */}
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
        {genStats.map(g => (
          <button
            key={g.id}
            onClick={() => setActiveGen(prev => prev === g.id ? 0 : g.id)}
            className={`p-2 rounded-xl text-center border transition-all ${
              activeGen === g.id
                ? 'bg-pokemon-red text-white border-pokemon-red'
                : 'bg-white border-gray-100 hover:border-gray-300'
            }`}
          >
            <p className={`text-[10px] font-semibold uppercase tracking-wide ${activeGen === g.id ? 'text-red-100' : 'text-gray-400'}`}>{g.label}</p>
            <p className={`text-sm font-bold mt-0.5 ${activeGen === g.id ? 'text-white' : 'text-gray-800'}`}>{g.have}/{g.total}</p>
            <div className={`mt-1 h-1 rounded-full overflow-hidden ${activeGen === g.id ? 'bg-red-300' : 'bg-gray-100'}`}>
              <div
                className={`h-full rounded-full ${activeGen === g.id ? 'bg-white' : 'bg-pokemon-red'}`}
                style={{ width: `${g.pct}%` }}
              />
            </div>
          </button>
        ))}
        {activeGen > 0 && (
          <button
            onClick={() => setActiveGen(0)}
            className="p-2 rounded-xl text-center border border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-500 text-xs font-medium"
          >
            ✕ Toutes
          </button>
        )}
      </div>

      {/* Barre de recherche + filtres */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Rechercher par nom ou n°…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input-field pl-9 text-sm"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">✕</button>
          )}
        </div>
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl shrink-0">
          {FILTER_OPTIONS.map(o => (
            <button
              key={o.id}
              onClick={() => setFilter(o.id)}
              className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
                filter === o.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {/* Résultat */}
      <p className="text-xs text-gray-400">{visiblePokemon.length} Pokémon affichés</p>

      {/* Grille de Pokémon */}
      <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-1.5">
        {visiblePokemon.map(p => {
          const isOwned = owned.has(p.number)
          const isLoading = toggling.has(p.number)
          return (
            <button
              key={p.number}
              onClick={() => toggle(p.number)}
              disabled={isLoading}
              title={`#${String(p.number).padStart(4, '0')} ${p.name}`}
              className={`relative flex flex-col items-center p-1 rounded-xl border-2 transition-all select-none ${
                isOwned
                  ? 'border-green-400 bg-green-50'
                  : 'border-gray-100 bg-white hover:border-gray-300'
              } ${isLoading ? 'opacity-60' : ''}`}
            >
              <img
                src={p.sprite}
                alt={p.name}
                className={`w-10 h-10 object-contain ${!isOwned ? 'grayscale opacity-40' : ''}`}
                loading="lazy"
              />
              <p className="text-[9px] text-gray-400 leading-tight mt-0.5">#{p.number}</p>
              {isOwned && (
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                  <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}
            </button>
          )
        })}
      </div>

      {visiblePokemon.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <p className="text-4xl mb-2">🔍</p>
          <p className="text-sm">Aucun Pokémon trouvé</p>
        </div>
      )}
    </div>
  )
}
