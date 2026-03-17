import { useState, useEffect, useRef } from 'react'
import { useItemOptions } from '../lib/itemOptions'
import { searchProducts, searchProductsFromCache, extractPrice, extractImage, deriveItemType } from '../lib/pokemonApi'

export default function ItemFormModal({ item, onClose, onSave, title }) {
  const isEdit = !!item
  const [step, setStep]             = useState(isEdit ? 'form' : 'search')
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState('')
  const { conditions, loading: optionsLoading } = useItemOptions()

  // Minimal form fields (only what user needs to fill manually)
  const [purchasePrice, setPurchasePrice] = useState('')
  const [currentValue, setCurrentValue]   = useState('')
  const [quantity, setQuantity]           = useState(1)
  const [condition, setCondition]         = useState('')
  const [notes, setNotes]                 = useState('')

  // Full manual form (when no product selected)
  const [manualName, setManualName]       = useState('')
  const [manualSet, setManualSet]         = useState('')
  const [manualType, setManualType]       = useState('')
  const [manualVariant, setManualVariant] = useState('')

  // Search state
  const [searchQuery, setSearchQuery]     = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searching, setSearching]         = useState(false)
  const [searchError, setSearchError]     = useState('')
  const [offset, setOffset]               = useState(0)
  const [hasMore, setHasMore]             = useState(false)
  const [loadingMore, setLoadingMore]     = useState(false)
  const debounceRef = useRef(null)

  // Set default condition
  useEffect(() => {
    if (conditions.length > 0 && !condition) setCondition(conditions[0].label)
  }, [conditions])

  // Pre-fill when editing
  useEffect(() => {
    if (item) {
      setPurchasePrice(item.purchase_price ?? '')
      setCurrentValue(item.current_value ?? '')
      setQuantity(item.quantity || 1)
      setCondition(item.condition || '')
      setNotes(item.notes || '')
      setManualName(item.name || '')
      setManualSet(item.set_name || '')
      setManualType(item.item_type || '')
      setManualVariant(item.variant_notes || '')
    }
  }, [item])

  // Debounced search
  useEffect(() => {
    if (step !== 'search') return
    if (debounceRef.current) clearTimeout(debounceRef.current)
    setOffset(0)
    setHasMore(false)
    if (!searchQuery.trim() || searchQuery.trim().length < 2) {
      setSearchResults([])
      return
    }
    debounceRef.current = setTimeout(() => doSearch(searchQuery, 0, false), 600)
    return () => clearTimeout(debounceRef.current)
  }, [searchQuery, step])

  async function doSearch(query, off, append) {
    if (!append) setSearching(true)
    else setLoadingMore(true)
    setSearchError('')
    try {
      // Try cache first, then API
      let results = await searchProductsFromCache(query, off)
      if (results.length < 3) {
        results = await searchProducts(query, off)
      }
      if (append) {
        setSearchResults(prev => [...prev, ...results])
      } else {
        setSearchResults(results)
      }
      setHasMore(results.length >= 6)
      setOffset(off + results.length)
    } catch (e) {
      setSearchError(
        e.message === 'daily_limit_reached'
          ? 'Limite de 90 req/jour atteinte. Résultats depuis le cache uniquement.'
          : 'Erreur de recherche.'
      )
      // Fallback to cache only
      try {
        const cached = await searchProductsFromCache(query, off)
        if (append) setSearchResults(prev => [...prev, ...cached])
        else setSearchResults(cached)
      } catch (_) {}
    } finally {
      setSearching(false)
      setLoadingMore(false)
    }
  }

  const handleLoadMore = () => {
    doSearch(searchQuery, offset, true)
  }

  const handleSelectProduct = (product) => {
    const price = extractPrice(product)
    setSelectedProduct(product)
    setCurrentValue(price ? price.toFixed(2) : '')
    setManualType(deriveItemType(product.name))
    setManualSet(product.episode?.name || product.setName || '')
    setManualName(product.name || '')
    setStep('form')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    const setName = selectedProduct
      ? (selectedProduct.episode?.name || selectedProduct.setName || manualSet)
      : manualSet
    if (!setName && !manualName && !selectedProduct) {
      setError("Sélectionne un produit ou remplis au moins le nom.")
      return
    }
    setLoading(true)
    await onSave({
      name: selectedProduct ? selectedProduct.name : manualName || null,
      set_name: setName || manualSet || null,
      item_type: selectedProduct ? deriveItemType(selectedProduct.name) : manualType,
      variant_notes: manualVariant || null,
      quantity: parseInt(quantity) || 1,
      condition: condition || null,
      purchase_price: purchasePrice !== '' ? parseFloat(purchasePrice) : null,
      current_value: currentValue !== '' ? parseFloat(currentValue) : null,
      notes: notes || null,
      api_image_url: selectedProduct ? extractImage(selectedProduct) : null,
      api_product_id: selectedProduct ? String(selectedProduct.id || '') : null,
    })
    setLoading(false)
  }

  const marketPrice = selectedProduct ? extractPrice(selectedProduct) : null
  const productImage = selectedProduct ? extractImage(selectedProduct) : null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 sm:p-4">
      <div className="bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl w-full sm:max-w-lg flex flex-col max-h-[92vh]">

        {/* Drag handle */}
        <div className="sm:hidden flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 bg-gray-200 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100 shrink-0">
          {step === 'form' && !isEdit && (
            <button onClick={() => { setStep('search'); setSelectedProduct(null) }}
              className="text-gray-400 hover:text-gray-600 text-xl leading-none">←</button>
          )}
          <h2 className="text-lg font-bold text-gray-900 flex-1">
            {title || (isEdit ? '✏️ Modifier' : step === 'search' ? '🔍 Rechercher un produit' : '➕ Détails')}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
        </div>

        {/* ── STEP 1 : Search ─────────────────────────────────────────── */}
        {step === 'search' && (
          <div className="flex flex-col flex-1 overflow-hidden">
            <div className="px-6 pt-5 pb-3 shrink-0">
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-300">🔍</span>
                <input
                  autoFocus
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Obsidian Flames ETB, Paradox Rift booster box…"
                  className="input-field pl-9 pr-10 text-sm"
                />
                {searching && (
                  <div className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-pokemon-blue border-t-transparent rounded-full animate-spin" />
                )}
                {searchQuery && !searching && (
                  <button onClick={() => { setSearchQuery(''); setSearchResults([]) }}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500">✕</button>
                )}
              </div>
              {searchError && <p className="text-xs text-orange-500 mt-2">{searchError}</p>}
            </div>

            {/* Results */}
            <div className="flex-1 overflow-y-auto px-6 pb-2">
              {searchResults.length > 0 && (
                <>
                  <div className="space-y-2">
                    {searchResults.map((p, i) => {
                      const price = extractPrice(p)
                      const img = extractImage(p)
                      return (
                        <button key={p.id || p.cardmarket_id || i}
                          onClick={() => handleSelectProduct(p)}
                          className="w-full flex items-center gap-3 bg-gray-50 hover:bg-blue-50 rounded-2xl px-4 py-3 text-left transition-colors border border-transparent hover:border-blue-200">
                          <div className="w-14 h-14 rounded-xl overflow-hidden bg-gray-100 shrink-0 flex items-center justify-center">
                            {img ? <img src={img} alt="" className="w-full h-full object-cover" />
                              : <span className="text-2xl">📦</span>}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-900 leading-snug">{p.name}</p>
                            <p className="text-xs text-gray-400 mt-0.5 truncate">{p.episode?.name || p.setName || ''}</p>
                          </div>
                          {price && (
                            <div className="text-right shrink-0">
                              <p className="text-sm font-bold text-blue-600">{price.toFixed(2)} €</p>
                              <p className="text-[10px] text-gray-300">CM FR</p>
                            </div>
                          )}
                        </button>
                      )
                    })}
                  </div>

                  {/* Voir + */}
                  {hasMore && (
                    <button
                      onClick={handleLoadMore}
                      disabled={loadingMore}
                      className="w-full mt-3 py-2.5 text-sm font-medium text-pokemon-blue hover:bg-blue-50 rounded-xl transition-colors border border-blue-100 flex items-center justify-center gap-2"
                    >
                      {loadingMore
                        ? <span className="w-4 h-4 border-2 border-pokemon-blue border-t-transparent rounded-full animate-spin" />
                        : '+ Voir plus de résultats'}
                    </button>
                  )}
                </>
              )}

              {!searching && searchResults.length === 0 && searchQuery.length >= 2 && (
                <div className="text-center py-8 text-gray-400">
                  <p className="text-3xl mb-2">🔎</p>
                  <p className="text-sm">Aucun produit trouvé</p>
                </div>
              )}

              {!searchQuery && (
                <div className="text-center py-10 text-gray-300">
                  <p className="text-4xl mb-3">📦</p>
                  <p className="text-sm text-gray-400">Tape un nom de produit pour récupérer<br/>le prix Cardmarket et les infos automatiquement</p>
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-gray-100 shrink-0">
              <button onClick={() => setStep('form')}
                className="w-full text-sm text-gray-400 hover:text-gray-600 py-2 transition-colors">
                Ajouter manuellement sans recherche →
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 2 : Form ───────────────────────────────────────────── */}
        {step === 'form' && (
          <>
            <form onSubmit={handleSubmit} id="item-form" className="overflow-y-auto flex-1 p-6 space-y-4">
              {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">{error}</div>}

              {/* Product card (when selected from API) */}
              {selectedProduct ? (
                <div className="flex items-center gap-3 bg-gray-50 rounded-2xl p-3 border border-gray-100">
                  {productImage && (
                    <div className="w-16 h-16 rounded-xl overflow-hidden bg-gray-100 shrink-0">
                      <img src={productImage} alt="" className="w-full h-full object-cover" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-900 leading-snug">{selectedProduct.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{selectedProduct.episode?.name || ''}</p>
                    {marketPrice && (
                      <p className="text-xs text-blue-600 font-semibold mt-1">
                        💰 Prix Cardmarket FR : {marketPrice.toFixed(2)} €
                      </p>
                    )}
                  </div>
                  <button type="button" onClick={() => { setSelectedProduct(null); setStep('search') }}
                    className="text-gray-300 hover:text-gray-500 text-lg shrink-0">✕</button>
                </div>
              ) : (
                /* Manual fields when no product */
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nom <span className="text-gray-400 text-xs font-normal">(facultatif)</span>
                    </label>
                    <input value={manualName} onChange={e => setManualName(e.target.value)}
                      className="input-field" placeholder="ex: Booster Box Écarlate et Violet" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Extension *</label>
                      <input value={manualSet} onChange={e => setManualSet(e.target.value)}
                        className="input-field" placeholder="ex: Obsidian Flames" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                      <input value={manualType} onChange={e => setManualType(e.target.value)}
                        className="input-field" placeholder="ETB, Booster Box…" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Variante <span className="text-gray-400 text-xs font-normal">(facultatif)</span>
                    </label>
                    <input value={manualVariant} onChange={e => setManualVariant(e.target.value)}
                      className="input-field" placeholder="Japonais, 1st edition…" />
                  </div>
                </div>
              )}

              {/* Common fields */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Prix d'achat (€)</label>
                  <input type="number" step="0.01" min="0" value={purchasePrice}
                    onChange={e => setPurchasePrice(e.target.value)}
                    className="input-field" placeholder="0.00" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Valeur actuelle (€)
                    {marketPrice && <span className="text-[10px] text-blue-400 ml-1">CM: {marketPrice.toFixed(2)} €</span>}
                  </label>
                  <input type="number" step="0.01" min="0" value={currentValue}
                    onChange={e => setCurrentValue(e.target.value)}
                    className="input-field" placeholder="0.00" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Quantité</label>
                  <input type="number" min="1" value={quantity}
                    onChange={e => setQuantity(e.target.value)}
                    className="input-field" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">État</label>
                  <select value={condition} onChange={e => setCondition(e.target.value)} className="input-field" disabled={optionsLoading}>
                    {conditions.map(c => <option key={c.id} value={c.label}>{c.label}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes <span className="text-gray-400 text-xs font-normal">(facultatif)</span>
                </label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)}
                  className="input-field resize-none" rows={2} placeholder="Informations supplémentaires…" />
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
