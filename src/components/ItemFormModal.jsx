import { useState, useEffect, useRef } from 'react'
import { usePokemonSets } from '../lib/pokemonSets'
import { useItemOptions } from '../lib/itemOptions'
import { searchProducts, extractPrice, extractImage } from '../lib/pokemonApi'

const EMPTY_FORM = {
  name: '',
  set_name: '',
  item_type: '',
  quantity: 1,
  condition: '',
  purchase_price: '',
  current_value: '',
  notes: '',
  variant_notes: '',
}

export default function ItemFormModal({ item, onClose, onSave, title }) {
  const isEdit = !!item
  const [step, setStep]               = useState(isEdit ? 'form' : 'search') // 'search' | 'form'
  const [form, setForm]               = useState(EMPTY_FORM)
  const [loading, setLoading]         = useState(false)
  const [error, setError]             = useState('')
  const [customSet, setCustomSet]     = useState(false)
  const { grouped, loading: setsLoading } = usePokemonSets()
  const { types, conditions, loading: optionsLoading } = useItemOptions()

  // Search state
  const [searchQuery, setSearchQuery]     = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searching, setSearching]         = useState(false)
  const [searchError, setSearchError]     = useState('')
  const [marketPrice, setMarketPrice]     = useState(null)
  const debounceRef = useRef(null)

  // Set defaults once options load
  useEffect(() => {
    if (!item && types.length > 0 && !form.item_type) {
      setForm(prev => ({ ...prev, item_type: types[0].label }))
    }
    if (!item && conditions.length > 0 && !form.condition) {
      setForm(prev => ({ ...prev, condition: conditions[0].label }))
    }
  }, [types, conditions])

  // Pre-fill when editing
  useEffect(() => {
    if (item) {
      setForm({
        name: item.name || '',
        set_name: item.set_name || '',
        item_type: item.item_type || '',
        quantity: item.quantity || 1,
        condition: item.condition || '',
        purchase_price: item.purchase_price ?? '',
        current_value: item.current_value ?? '',
        notes: item.notes || '',
        variant_notes: item.variant_notes || '',
      })
      if (item.set_name) setCustomSet(true)
    }
  }, [item])

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
  }

  // Debounced search
  useEffect(() => {
    if (step !== 'search') return
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!searchQuery.trim() || searchQuery.trim().length < 2) {
      setSearchResults([])
      return
    }
    debounceRef.current = setTimeout(async () => {
      setSearching(true)
      setSearchError('')
      try {
        const results = await searchProducts(searchQuery)
        setSearchResults(results)
      } catch (e) {
        setSearchError(
          e.message === 'daily_limit_reached'
            ? 'Limite journalière atteinte (90/jour). Remplis manuellement.'
            : 'Erreur de recherche. Vérifie ta connexion.'
        )
      } finally {
        setSearching(false)
      }
    }, 600)
    return () => clearTimeout(debounceRef.current)
  }, [searchQuery, step])

  // Select a product → go to form
  const handleSelectProduct = (product) => {
    const price = extractPrice(product)
    const setName = product.episode?.name || product.set?.name || product.setName || ''
    setMarketPrice(price)
    setForm(prev => ({
      ...prev,
      name: product.name || '',
      set_name: setName || prev.set_name,
      current_value: price ? price.toFixed(2) : prev.current_value,
    }))
    setCustomSet(true)
    setStep('form')
  }

  // Skip search → go directly to form
  const handleSkipSearch = () => {
    setStep('form')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!form.set_name.trim()) {
      setError("L'extension (set) est obligatoire.")
      return
    }
    setLoading(true)
    await onSave({
      ...form,
      quantity: parseInt(form.quantity) || 1,
      purchase_price: form.purchase_price !== '' ? parseFloat(form.purchase_price) : null,
      current_value: form.current_value !== '' ? parseFloat(form.current_value) : null,
      notes: form.notes || null,
      variant_notes: form.variant_notes || null,
    })
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 sm:p-4">
      <div className="bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl w-full sm:max-w-lg flex flex-col max-h-[92vh]">

        {/* Drag handle */}
        <div className="sm:hidden flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 bg-gray-200 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-3">
            {step === 'form' && !isEdit && (
              <button
                onClick={() => setStep('search')}
                className="text-gray-400 hover:text-gray-600 text-lg leading-none"
              >←</button>
            )}
            <h2 className="text-lg font-bold text-gray-900">
              {title || (isEdit ? '✏️ Modifier' : step === 'search' ? '🔍 Rechercher un produit' : '➕ Détails')}
            </h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
        </div>

        {/* ── STEP 1 : Search ─────────────────────────────────────────── */}
        {step === 'search' && (
          <div className="flex flex-col flex-1 overflow-hidden">
            <div className="px-6 pt-5 pb-3 shrink-0">
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-300 text-base">🔍</span>
                <input
                  autoFocus
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Obsidian Flames ETB, Paradox Rift booster box…"
                  className="input-field pl-9 pr-10 text-sm"
                />
                {searching && (
                  <div className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-pokemon-blue border-t-transparent rounded-full animate-spin" />
                )}
                {searchQuery && !searching && (
                  <button
                    onClick={() => { setSearchQuery(''); setSearchResults([]) }}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500"
                  >✕</button>
                )}
              </div>
              {searchError && <p className="text-xs text-red-500 mt-2">{searchError}</p>}
            </div>

            {/* Results */}
            <div className="flex-1 overflow-y-auto px-6 pb-4">
              {searchResults.length > 0 && (
                <div className="space-y-2">
                  {searchResults.map((p, i) => {
                    const price = extractPrice(p)
                    const img = extractImage(p)
                    return (
                      <button
                        key={p.id || p.cardmarket_id || i}
                        onClick={() => handleSelectProduct(p)}
                        className="w-full flex items-center gap-3 bg-gray-50 hover:bg-blue-50 rounded-2xl px-4 py-3 text-left transition-colors border border-transparent hover:border-blue-200"
                      >
                        <div className="w-14 h-14 rounded-xl overflow-hidden bg-gray-100 shrink-0 flex items-center justify-center">
                          {img
                            ? <img src={img} alt="" className="w-full h-full object-cover" />
                            : <span className="text-2xl">📦</span>
                          }
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 leading-snug">{p.name}</p>
                          <p className="text-xs text-gray-400 mt-0.5 truncate">{p.episode?.name || p.setName || ''}</p>
                        </div>
                        <div className="text-right shrink-0">
                          {price && <p className="text-sm font-bold text-blue-600">{price.toFixed(2)} €</p>}
                          <p className="text-[10px] text-gray-300">CM FR</p>
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}

              {!searching && !searchError && searchResults.length === 0 && searchQuery.length >= 2 && (
                <div className="text-center py-8 text-gray-400">
                  <p className="text-3xl mb-2">🔎</p>
                  <p className="text-sm">Aucun produit trouvé</p>
                </div>
              )}

              {!searchQuery && (
                <div className="text-center py-8 text-gray-300">
                  <p className="text-4xl mb-3">📦</p>
                  <p className="text-sm text-gray-400">Recherche un produit pour récupérer<br/>le prix Cardmarket automatiquement</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-100 shrink-0">
              <button
                onClick={handleSkipSearch}
                className="w-full text-sm text-gray-500 hover:text-gray-700 py-2 transition-colors"
              >
                Ajouter manuellement sans recherche →
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 2 : Form ───────────────────────────────────────────── */}
        {step === 'form' && (
          <>
            <form onSubmit={handleSubmit} id="item-form" className="overflow-y-auto flex-1 p-6 space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
                  {error}
                </div>
              )}

              {/* Market price banner */}
              {marketPrice && (
                <div className="flex items-center gap-3 bg-blue-50 rounded-xl px-4 py-3 border border-blue-100">
                  <span className="text-blue-500 text-lg">💰</span>
                  <div>
                    <p className="text-xs text-blue-500 font-semibold uppercase tracking-wide">Prix Cardmarket FR détecté</p>
                    <p className="text-sm font-bold text-blue-700">{Number(marketPrice).toFixed(2)} € → pré-rempli dans "Valeur actuelle"</p>
                  </div>
                </div>
              )}

              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nom <span className="text-gray-400 font-normal text-xs">(facultatif)</span>
                </label>
                <input name="name" value={form.name} onChange={handleChange}
                  className="input-field" placeholder="ex: Booster Box Écarlate et Violet" />
              </div>

              {/* Set */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-medium text-gray-700">Extension *</label>
                  <button type="button"
                    onClick={() => { setCustomSet(v => !v); setForm(prev => ({ ...prev, set_name: '' })) }}
                    className="text-xs text-pokemon-red hover:underline">
                    {customSet ? '← Liste officielle' : '+ Saisir manuellement'}
                  </button>
                </div>
                {customSet ? (
                  <input name="set_name" value={form.set_name} onChange={handleChange}
                    className="input-field" placeholder="ex: Obsidian Flames" required />
                ) : (
                  <select name="set_name" value={form.set_name} onChange={handleChange} className="input-field" required>
                    <option value="">{setsLoading ? 'Chargement…' : '— Choisir une extension —'}</option>
                    {Object.entries(grouped).map(([series, sets]) => (
                      <optgroup key={series} label={series}>
                        {sets.map(s => <option key={s} value={s}>{s}</option>)}
                      </optgroup>
                    ))}
                  </select>
                )}
              </div>

              {/* Type + Condition */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                  <select name="item_type" value={form.item_type} onChange={handleChange}
                    className="input-field" disabled={optionsLoading}>
                    {optionsLoading ? <option>Chargement…</option>
                      : types.map(t => <option key={t.id} value={t.label}>{t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">État</label>
                  <select name="condition" value={form.condition} onChange={handleChange}
                    className="input-field" disabled={optionsLoading}>
                    {optionsLoading ? <option>Chargement…</option>
                      : conditions.map(c => <option key={c.id} value={c.label}>{c.label}</option>)}
                  </select>
                </div>
              </div>

              {/* Qty + Prix achat */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Quantité</label>
                  <input name="quantity" type="number" min="1" value={form.quantity}
                    onChange={handleChange} className="input-field" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Prix d'achat (€)</label>
                  <input name="purchase_price" type="number" step="0.01" min="0"
                    value={form.purchase_price} onChange={handleChange}
                    className="input-field" placeholder="0.00" />
                </div>
              </div>

              {/* Valeur actuelle */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Valeur actuelle (€)
                  {marketPrice && <span className="ml-1 text-[10px] text-blue-400 font-normal">Cardmarket FR : {Number(marketPrice).toFixed(2)} €</span>}
                </label>
                <input name="current_value" type="number" step="0.01" min="0"
                  value={form.current_value} onChange={handleChange}
                  className="input-field" placeholder="0.00" />
              </div>

              {/* Variante */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Variante <span className="text-gray-400 font-normal text-xs">(facultatif)</span>
                </label>
                <input name="variant_notes" value={form.variant_notes} onChange={handleChange}
                  className="input-field" placeholder="ex: Édition japonaise, misprint…" />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes <span className="text-gray-400 font-normal text-xs">(facultatif)</span>
                </label>
                <textarea name="notes" value={form.notes} onChange={handleChange}
                  className="input-field resize-none" rows={2}
                  placeholder="Informations supplémentaires…" />
              </div>
            </form>

            <div className="px-6 py-4 border-t border-gray-100 flex gap-3 shrink-0">
              <button type="button" onClick={onClose} className="btn-secondary flex-1">Annuler</button>
              <button type="submit" form="item-form" className="btn-primary flex-1" disabled={loading}>
                {loading ? 'Enregistrement...' : isEdit ? 'Modifier' : 'Ajouter à ma collection'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
