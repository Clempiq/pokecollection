/**
 * ProductCombobox
 * Champ de recherche filtrant les produits depuis pokemon_products.
 * Affiche nom + set + prix. Quand un produit est sélectionné, appelle onSelect(product).
 *
 * Props :
 *   products     — liste de produits (usePokemonProducts)
 *   value        — valeur actuelle (string)
 *   onChange     — (val: string) => void — mise à jour libre du texte
 *   onSelect     — (product) => void — produit sélectionné depuis la liste
 *   placeholder  — placeholder du champ
 *   disabled     — désactiver le champ
 */
import { useState, useRef, useEffect } from 'react'

export default function ProductCombobox({
  products = [],
  value = '',
  onChange,
  onSelect,
  placeholder = 'Rechercher un produit…',
  disabled = false,
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState(value)
  const wrapRef = useRef(null)

  // Sync query si value change depuis l'extérieur (ex: reset)
  useEffect(() => { setQuery(value) }, [value])

  // Fermer si clic en dehors
  useEffect(() => {
    const handler = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Filtrer les produits selon la requête
  const filtered = query.length >= 1
    ? products.filter(p =>
        p.name?.toLowerCase().includes(query.toLowerCase()) ||
        p.set_name?.toLowerCase().includes(query.toLowerCase())
      ).slice(0, 20)
    : products.slice(0, 20)

  const handleInput = (e) => {
    const val = e.target.value
    setQuery(val)
    onChange?.(val)
    setOpen(true)
  }

  const handleSelect = (product) => {
    setQuery(product.name)
    onChange?.(product.name)
    onSelect?.(product)
    setOpen(false)
  }

  const handleClear = () => {
    setQuery('')
    onChange?.('')
    onSelect?.(null)
    setOpen(false)
  }

  const price = (p) => p.market_price_fr || p.market_price || null

  return (
    <div ref={wrapRef} className="relative">
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={handleInput}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          disabled={disabled}
          className="input-field pr-8 text-sm"
          autoComplete="off"
        />
        {query ? (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 text-sm leading-none"
          >✕</button>
        ) : (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 text-xs pointer-events-none">▾</span>
        )}
      </div>

      {open && products.length > 0 && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg max-h-56 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="px-4 py-3 text-sm text-gray-400 text-center">Aucun produit correspondant</div>
          ) : (
            filtered.map(p => (
              <button
                key={p.api_id || p.name}
                type="button"
                onMouseDown={(e) => { e.preventDefault(); handleSelect(p) }}
                className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-blue-50 transition-colors text-left border-b border-gray-50 last:border-0"
              >
                {/* Image miniature */}
                <div className="w-9 h-9 rounded-lg overflow-hidden bg-gray-50 shrink-0 flex items-center justify-center border border-gray-100">
                  {p.image_url
                    ? <img src={p.image_url} alt="" className="w-full h-full object-contain" />
                    : <span className="text-lg">📦</span>
                  }
                </div>
                {/* Infos */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate leading-snug">{p.name}</p>
                  {p.set_name && (
                    <p className="text-xs text-gray-400 truncate">{p.set_name}</p>
                  )}
                </div>
                {/* Prix */}
                {price(p) && (
                  <span className="text-xs font-bold text-blue-600 shrink-0">
                    {Number(price(p)).toFixed(2)} €
                  </span>
                )}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}
