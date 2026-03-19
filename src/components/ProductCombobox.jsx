import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'

export default function ProductCombobox({ value, onChange, placeholder = 'Chercher un produit...' }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const dropdownRef = useRef(null)

  useEffect(() => {
    if (!query.trim()) {
      setResults([])
      setShowDropdown(false)
      return
    }

    setLoading(true)
    const q = query.trim().toLowerCase()
    supabase
      .from('pokemon_products')
      .select('id, name, set_name, image_url, price')
      .or(`name.ilike.%${q}%,set_name.ilike.%${q}%`)
      .limit(10)
      .then(({ data }) => {
        setResults(data || [])
        setShowDropdown(true)
        setLoading(false)
      })
  }, [query])

  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div className="relative" ref={dropdownRef}>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => query && results.length > 0 && setShowDropdown(true)}
        placeholder={placeholder}
        className="input-field"
      />
      {showDropdown && (
        <div className="absolute z-10 left-0 right-0 mt-1 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 max-h-64 overflow-y-auto">
          {loading && <div className="p-4 text-center text-gray-400 text-sm">Chargement...</div>}
          {!loading && results.length === 0 && query && <div className="p-4 text-center text-gray-400 text-sm">Aucun résultat</div>}
          {results.map(product => (
            <button
              key={product.id}
              onClick={() => {
                onChange(product)
                setQuery('')
                setShowDropdown(false)
              }}
              className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-3 border-b border-gray-100 dark:border-gray-700 last:border-b-0 transition-colors"
            >
              {product.image_url && (
                <img src={product.image_url} alt={product.name} className="w-8 h-8 object-cover rounded" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{product.name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{product.set_name}</p>
              </div>
              {product.price && <span className="text-xs font-semibold text-gray-600 dark:text-gray-300 shrink-0">{product.price}€</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
