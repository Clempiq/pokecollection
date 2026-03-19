import { useState, useEffect, useRef } from 'react'
import { getAllPokemon } from '../lib/pokemonList'

export default function PokemonSearchInput({ value, onChange, placeholder = 'ex: Dracaufeu' }) {
  const [query, setQuery]             = useState(value || '')
  const [results, setResults]         = useState([])
  const [allPokemon, setAllPokemon]   = useState([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [sprite, setSprite]           = useState(null)
  const ref = useRef(null)

  // Load pokémon list (cached)
  useEffect(() => {
    getAllPokemon().then(list => {
      setAllPokemon(list)
      // Pre-fill sprite if value already set
      if (value) {
        const match = list.find(p => p.name.toLowerCase() === value.toLowerCase())
        if (match) setSprite(match.sprite)
      }
    }).catch(() => {})
  }, [])

  // Sync if parent changes value
  useEffect(() => {
    setQuery(value || '')
    if (!value) setSprite(null)
  }, [value])

  // Outside click
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setShowDropdown(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleInput = (val) => {
    setQuery(val)
    onChange(val)
    if (!val.trim()) {
      setResults([])
      setShowDropdown(false)
      setSprite(null)
      return
    }
    const q = val.toLowerCase()
    const filtered = allPokemon.filter(p =>
      p.name.toLowerCase().includes(q) || String(p.number).startsWith(q)
    ).slice(0, 8)
    setResults(filtered)
    setShowDropdown(filtered.length > 0)
    // Update sprite if exact match
    const exact = allPokemon.find(p => p.name.toLowerCase() === q)
    setSprite(exact ? exact.sprite : null)
  }

  const handleSelect = (pokemon) => {
    setQuery(pokemon.name)
    onChange(pokemon.name)
    setSprite(pokemon.sprite)
    setShowDropdown(false)
    setResults([])
  }

  return (
    <div className="relative" ref={ref}>
      <div className={`flex items-center gap-2 input-field text-sm p-0 overflow-hidden ${showDropdown ? 'ring-2 ring-pokemon-red/30 border-pokemon-red/50' : ''}`}>
        {sprite && (
          <img src={sprite} alt={query} className="w-9 h-9 object-contain shrink-0 ml-1" />
        )}
        {!sprite && (
          <span className="text-lg ml-2 shrink-0">🔴</span>
        )}
        <input
          value={query}
          onChange={e => handleInput(e.target.value)}
          onFocus={() => query.trim() && results.length > 0 && setShowDropdown(true)}
          className="flex-1 bg-transparent outline-none py-2 pr-3 text-sm"
          placeholder={placeholder}
          autoComplete="off"
        />
        {query && (
          <button
            type="button"
            onClick={() => { setQuery(''); onChange(''); setSprite(null); setShowDropdown(false) }}
            className="mr-2 text-gray-300 hover:text-gray-500 shrink-0"
          >✕</button>
        )}
      </div>

      {showDropdown && results.length > 0 && (
        <div className="absolute z-50 top-full mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden max-h-60 overflow-y-auto">
          {results.map(p => (
            <button
              key={p.number}
              type="button"
              onClick={() => handleSelect(p)}
              className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-red-50 text-left transition-colors"
            >
              <img src={p.sprite} alt={p.name} className="w-8 h-8 object-contain shrink-0" />
              <span className="text-sm font-medium text-gray-800">{p.name}</span>
              <span className="text-xs text-gray-400 ml-auto">#{String(p.number).padStart(4, '0')}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
