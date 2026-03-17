import { useState, useEffect, useRef } from 'react'
import { useItemOptions } from '../lib/itemOptions'
import { searchProducts, extractPrice, extractImage } from '../lib/pokemonApi'

const PRIORITIES = [
  { value: 1, label: 'Urgent',  emoji: '🔴', color: 'bg-red-100 text-red-700 border-red-200' },
  { value: 2, label: 'Normal',  emoji: '🟡', color: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  { value: 3, label: 'Un jour', emoji: '🟢', color: 'bg-green-100 text-green-700 border-green-200' },
]

const EMPTY = {
  name: '',
  set_name: '',
  item_type: '',
  variant_notes: '',
  target_price: '',
  priority: 2,
  notes: '',
  api_product_id: null,
  api_image_url: null,
  market_price: null,
  market_price_updated_at: null,
}

export default function WishlistFormModal({ item, onClose, onSave }) {
  const [form, setForm]               = useState(EMPTY)
  const [saving, setSaving]           = useState(false)
  const { types } = useItemOptions()

  // ── Product search state ───────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searching, setSearching]     = useState(false)
  const [searchError, setSearchError] = useState('')
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [showResults, setShowResults] = useState(false)
  const debounceRef = useRef(null)

  useEffect(() => {
    if (item) {
      setForm({
        name: item.name || '',
        set_name: item.set_name || '',
        item_type: item.item_type || '',
        variant_notes: item.variant_notes || '',
        target_price: item.target_price ?? '',
        priority: item.priority ?? 2,
        notes: item.notes || '',
        api_product_id: item.api_product_id || null,
        api_image_url: item.api_image_url || null,
        market_price: item.market_price || null,
        market_price_updated_at: item.market_price_updated_at || null,
      })
      if (item.api_product_id) {
        setSelectedProduct({ name: item.name || item.set_name, api_image_url: item.api_image_url })
      }
    } else {
      setForm(EMPTY)
      setSelectedProduct(null)
    }
  }, [item])

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  // ── Debounced search ───────────────────────────────────────────────────
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!searchQuery.trim() || searchQuery.trim().length < 2) {
      setSearchResults([])
      setShowResults(false)
      return
    }
    debounceRef.current = setTimeout(async () => {
      setSearching(true)
      setSearchError('')
      try {
        const results = await searchProducts(searchQuery)
        setSearchResults(results)
        setShowResults(true)
      } catch (e) {
        setSearchError(
          e.message === 'daily_limit_reached'
            ? 'Limite de 90 requêtes/jour atteinte. Réessaie demain.'
            : 'Erreur de recherche. Vérifie ta connexion.'
        )
      } finally {
        setSearching(false)
      }
    }, 600)
    return () => clearTimeout(debounceRef.current)
  }, [searchQuery])

  // ── Select a product from results ─────────────────────────────────────
  const handleSelectProduct = (product) => {
    const price = extractPrice(product)
    const imageUrl = extractImage(product)
    const productName = product.name || ''
    const setName = product.episode?.name || product.set?.name || product.setName || ''

    setSelectedProduct(product)
    setForm(p => ({
      ...p,
      name: productName,
      set_name: setName || p.set_name,
      target_price: price ? price.toFixed(2) : p.target_price,
      api_product_id: String(product.id || product.cardmarket_id || ''),
      api_image_url: imageUrl,
      market_price: price,
      market_price_updated_at: new Date().toISOString(),
    }))
    setShowResults(false)
    setSearchQuery('')
  }

  const handleClearProduct = () => {
    setSelectedProduct(null)
    setForm(p => ({ ...p, api_product_id: null, api_image_url: null, market_price: null, market_price_updated_at: null }))
  }

  // ── Submit ─────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.set_name.trim() && !form.name.trim()) return
    setSaving(true)
    await onSave({
      name: form.name.trim() || null,
      set_name: form.set_name.trim(),
      item_type: form.item_type,
      variant_notes: form.variant_notes.trim() || null,
      target_price: form.target_price !== '' ? parseFloat(form.target_price) : null,
      priority: Number(form.priority),
      notes: form.notes.trim() || null,
      api_product_id: form.api_product_id,
      api_image_url: form.api_image_url,
      market_price: form.market_price,
      market_price_updated_at: form.market_price_updated_at,
    })
    setSaving(false)
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 sm:p-4"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl w-full sm:max-w-lg flex flex-col max-h-[92vh]">

        {/* Drag handle */}
        <div className="sm:hidden flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 bg-gray-200 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-4 pb-4 border-b border-gray-100 shrink-0">
          <h2 className="font-bold text-gray-900 text-lg">
            {item ? '✏️ Modifier le souhait' : '✨ Ajouter à la wishlist'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
        </div>

        {/* Body */}
        <form id="wishlist-form" onSubmit={handleSubmit} className="overflow-y-auto flex-1 px-6 py-5 space-y-5">

          {/* ── Product search ──────────────────────────────────────────── */}
          <div className="bg-blue-50 rounded-2xl p-4 border border-blue-100">
            <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-3">
              🔍 Rechercher sur Cardmarket
            </p>

            {selectedProduct ? (
              /* Selected product badge */
              <div className="flex items-center gap-3 bg-white rounded-xl p-3 border border-blue-200">
                {extractImage(selectedProduct) && (
                  <img src={extractImage(selectedProduct)} alt="" className="w-12 h-12 object-contain rounded-lg bg-gray-50" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{selectedProduct.name}</p>
                  {form.market_price && (
                    <p className="text-xs text-blue-600 font-medium">
                      Prix Cardmarket FR : <span className="font-bold">{Number(form.market_price).toFixed(2)} €</span>
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={handleClearProduct}
                  className="text-gray-400 hover:text-red-500 text-lg leading-none shrink-0"
                >✕</button>
              </div>
            ) : (
              /* Search input */
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="ex: Obsidian Flames ETB, Paradox Rift booster box…"
                  className="input-field pr-10 text-sm"
                />
                {searching && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                )}
              </div>
            )}

            {searchError && (
              <p className="text-xs text-red-500 mt-2">{searchError}</p>
            )}

            {/* Results list */}
            {showResults && searchResults.length > 0 && !selectedProduct && (
              <div className="mt-2 space-y-1.5 max-h-48 overflow-y-auto">
                {searchResults.map((p, i) => {
                  const price = extractPrice(p)
                  const img = extractImage(p)
                  return (
                    <button
                      key={p.id || p.cardmarket_id || i}
                      type="button"
                      onClick={() => handleSelectProduct(p)}
                      className="w-full flex items-center gap-3 bg-white hover:bg-blue-50 rounded-xl px-3 py-2.5 text-left transition-colors border border-gray-100 hover:border-blue-200"
                    >
                      {img ? (
                        <img src={img} alt="" className="w-10 h-10 object-contain rounded-lg bg-gray-50 shrink-0" />
                      ) : (
                        <div className="w-10 h-10 bg-gray-100 rounded-lg shrink-0 flex items-center justify-center text-gray-300 text-lg">📦</div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{p.name}</p>
                        <p className="text-xs text-gray-400 truncate">{p.episode?.name || p.setName || ''}</p>
                      </div>
                      {price && (
                        <span className="text-xs font-bold text-blue-600 shrink-0">{price.toFixed(2)} €</span>
                      )}
                    </button>
                  )
                })}
              </div>
            )}

            {showResults && searchResults.length === 0 && !searching && !selectedProduct && (
              <p className="text-xs text-gray-400 mt-2 text-center py-2">Aucun résultat — remplis les champs manuellement</p>
            )}
          </div>

          {/* ── Priority ────────────────────────────────────────────────── */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Priorité</label>
            <div className="flex gap-2">
              {PRIORITIES.map(p => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => set('priority', p.value)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-sm font-medium border transition-all ${
                    form.priority === p.value
                      ? p.color + ' ring-2 ring-offset-1 ring-current shadow-sm'
                      : 'bg-gray-50 text-gray-400 border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  {p.emoji} {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* ── Name ────────────────────────────────────────────────────── */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nom <span className="text-gray-400 font-normal text-xs">(facultatif)</span>
            </label>
            <input
              value={form.name}
              onChange={e => set('name', e.target.value)}
              className="input-field"
              placeholder="ex: Coffret Dresseur d'Élite"
            />
          </div>

          {/* ── Set + Type ──────────────────────────────────────────────── */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Extension *</label>
              <input
                value={form.set_name}
                onChange={e => set('set_name', e.target.value)}
                className="input-field"
                placeholder="ex: Scarlet & Violet"
                required={!form.name.trim()}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select value={form.item_type} onChange={e => set('item_type', e.target.value)} className="input-field">
                <option value="">Sélectionner</option>
                {types.map(t => <option key={t.label} value={t.label}>{t.label}</option>)}
              </select>
            </div>
          </div>

          {/* ── Prices ──────────────────────────────────────────────────── */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Prix cible (€)
                {form.market_price && (
                  <span className="ml-1 text-[10px] font-normal text-blue-500">
                    CM : {Number(form.market_price).toFixed(2)} €
                  </span>
                )}
              </label>
              <input
                type="number" step="0.01" min="0"
                value={form.target_price}
                onChange={e => set('target_price', e.target.value)}
                className="input-field"
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Variante</label>
              <input
                value={form.variant_notes}
                onChange={e => set('variant_notes', e.target.value)}
                className="input-field"
                placeholder="Japonais, 1st ed…"
              />
            </div>
          </div>

          {/* ── Notes ───────────────────────────────────────────────────── */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes <span className="text-gray-400 font-normal text-xs">(facultatif)</span>
            </label>
            <textarea
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
              className="input-field resize-none"
              rows={2}
              placeholder="Où le trouver, budget max, remarques…"
            />
          </div>
        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex gap-3 shrink-0">
          <button type="button" onClick={onClose} className="btn-secondary flex-1">Annuler</button>
          <button type="submit" form="wishlist-form" className="btn-primary flex-1" disabled={saving}>
            {saving ? 'Sauvegarde...' : item ? 'Modifier' : 'Ajouter'}
          </button>
        </div>
      </div>
    </div>
  )
}
