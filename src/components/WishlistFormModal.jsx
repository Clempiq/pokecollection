import { useState, useEffect, useRef } from 'react'
import { useItemOptions } from '../lib/itemOptions'
import { usePokemonProducts } from '../lib/pokemonProducts'
import { useLocale } from '../lib/useLocale'
import { searchProducts, searchProductsFromCache, extractPrice, extractImage, deriveItemType } from '../lib/pokemonApi'
import ProductCombobox from './ProductCombobox'

const PRIORITIES = [
  { value: 1, label: 'urgent',  emoji: '🔴', color: 'bg-red-100 text-red-700 border-red-200' },
  { value: 2, label: 'normal',  emoji: '🟡', color: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  { value: 3, label: 'someday', emoji: '🟢', color: 'bg-green-100 text-green-700 border-green-200' },
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
  const isEdit = !!item
  const { t } = useLocale()
  const { types } = useItemOptions()
  const { products: dbProducts, sets: dbSets, loading: productsLoading } = usePokemonProducts()

  // Étape : 'search' (recherche API) ou 'form' (remplissage)
  const [step, setStep] = useState(isEdit ? 'form' : 'search')

  // Produit sélectionné via recherche API
  const [selectedApiProduct, setSelectedApiProduct] = useState(null)

  // Formulaire
  const [form, setForm]   = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  // Aperçu image produit catalogue (pokemon_products)
  const [cachedImageUrl, setCachedImageUrl] = useState(null)

  // Recherche API
  const [searchQuery, setSearchQuery]     = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searching, setSearching]         = useState(false)
  const [searchError, setSearchError]     = useState('')
  const [offset, setOffset]               = useState(0)
  const [hasMore, setHasMore]             = useState(false)
  const [loadingMore, setLoadingMore]     = useState(false)
  const debounceRef = useRef(null)

  // Pré-remplissage en mode édition
  useEffect(() => {
    if (item) {
      setForm({
        name:                    item.name || '',
        set_name:                item.set_name || '',
        item_type:               item.item_type || '',
        variant_notes:           item.variant_notes || '',
        target_price:            item.target_price ?? '',
        priority:                item.priority ?? 2,
        notes:                   item.notes || '',
        api_product_id:          item.api_product_id || null,
        api_image_url:           item.api_image_url || null,
        market_price:            item.market_price || null,
        market_price_updated_at: item.market_price_updated_at || null,
      })
      setCachedImageUrl(item.api_image_url || null)
    } else {
      setForm(EMPTY)
      setCachedImageUrl(null)
    }
  }, [item])

  // Recherche API avec debounce
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
      let results = await searchProductsFromCache(query, off)
      if (results.length < 3) results = await searchProducts(query, off)
      if (append) setSearchResults(prev => [...prev, ...results])
      else setSearchResults(results)
      setHasMore(results.length >= 6)
      setOffset(off + results.length)
    } catch (e) {
      setSearchError(
        e.message === 'daily_limit_reached'
          ? 'Limite de 90 req/jour atteinte. Résultats depuis le cache uniquement.'
          : 'Erreur de recherche.'
      )
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

  // Sélection via recherche API (format RapidAPI)
  const handleSelectApiProduct = (product) => {
    const price = extractPrice(product)
    const image = extractImage(product)
    setSelectedApiProduct(product)
    setForm(p => ({
      ...p,
      name:           product.name || '',
      set_name:       product.episode?.name || product.setName || '',
      item_type:      deriveItemType(product.name),
      target_price:   price ? price.toFixed(2) : p.target_price,
      api_product_id: String(product.id || ''),
      api_image_url:  image,
      market_price:   price,
      market_price_updated_at: price ? new Date().toISOString() : null,
    }))
    setCachedImageUrl(image)
    setStep('form')
  }

  // Sélection via catalogue DB (format pokemon_products)
  const handleSelectDbProduct = (dbProduct) => {
    if (!dbProduct) {
      setCachedImageUrl(null)
      setForm(p => ({ ...p, api_product_id: null, api_image_url: null, market_price: null, market_price_updated_at: null }))
      return
    }
    const price = dbProduct.market_price_fr || dbProduct.market_price || null
    setSelectedApiProduct(null)
    setForm(p => ({
      ...p,
      name:            dbProduct.name || '',
      set_name:        dbProduct.set_name || '',
      item_type:       deriveItemType(dbProduct.name),
      target_price:    price ? Number(price).toFixed(2) : p.target_price,
      api_product_id:  dbProduct.api_id || null,
      api_image_url:   dbProduct.image_url || null,
      market_price:    price,
      market_price_updated_at: price ? new Date().toISOString() : null,
    }))
    setCachedImageUrl(dbProduct.image_url || null)
  }

  const handleClearProduct = () => {
    setSelectedApiProduct(null)
    setCachedImageUrl(null)
    setForm(p => ({
      ...p,
      name: '', api_product_id: null, api_image_url: null,
      market_price: null, market_price_updated_at: null,
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.set_name.trim() && !form.name.trim()) return
    setSaving(true)
    await onSave({
      name:                    form.name.trim() || null,
      set_name:                form.set_name.trim() || null,
      item_type:               form.item_type || null,
      variant_notes:           form.variant_notes.trim() || null,
      target_price:            form.target_price !== '' ? parseFloat(form.target_price) : null,
      priority:                Number(form.priority),
      notes:                   form.notes.trim() || null,
      api_product_id:          form.api_product_id,
      api_image_url:           form.api_image_url,
      market_price:            form.market_price,
      market_price_updated_at: form.market_price_updated_at,
    })
    setSaving(false)
  }

  const productImage = selectedApiProduct ? extractImage(selectedApiProduct) : cachedImageUrl
  const marketPrice  = selectedApiProduct ? extractPrice(selectedApiProduct) : (form.market_price ? Number(form.market_price) : null)

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
        <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100 shrink-0">
          {step === 'form' && !isEdit && (
            <button onClick={() => { setStep('search'); setSelectedApiProduct(null) }}
              className="text-gray-400 hover:text-gray-600 text-xl leading-none">←</button>
          )}
          <h2 className="text-lg font-bold text-gray-900 flex-1">
            {isEdit ? '✏️ Modifier le souhait' : step === 'search' ? t('searchProduct') : '✨ Détails'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
        </div>

        {/* ── STEP 1 : Recherche API ──────────────────────────────────── */}
        {step === 'search' && (
          <div className="flex flex-col flex-1 overflow-hidden">
            <div className="px-6 pt-5 pb-3 shrink-0">
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-300">🔍</span>
                <input
                  autoFocus
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder={t('searchPh')}
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

            {/* Résultats recherche API */}
            <div className="flex-1 overflow-y-auto px-6 pb-2">
              {searchResults.length > 0 && (
                <>
                  <div className="space-y-2">
                    {searchResults.map((p, i) => {
                      const price = extractPrice(p)
                      const img   = extractImage(p)
                      return (
                        <button key={p.id || p.cardmarket_id || i}
                          onClick={() => handleSelectApiProduct(p)}
                          className="w-full flex items-center gap-3 bg-gray-50 hover:bg-blue-50 rounded-2xl px-4 py-3 text-left transition-colors border border-transparent hover:border-blue-200">
                          <div className="w-14 h-14 rounded-xl overflow-hidden bg-gray-100 shrink-0 flex items-center justify-center">
                            {img
                              ? <img src={img} alt="" className="w-full h-full object-contain" />
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
                  {hasMore && (
                    <button onClick={() => doSearch(searchQuery, offset, true)} disabled={loadingMore}
                      className="w-full mt-3 py-2.5 text-sm font-medium text-pokemon-blue hover:bg-blue-50 rounded-xl transition-colors border border-blue-100 flex items-center justify-center gap-2">
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
                  <p className="text-sm">{t('noResults')}</p>
                </div>
              )}

              {!searchQuery && (
                <div className="text-center py-10 text-gray-300">
                  <p className="text-4xl mb-3">✨</p>
                  <p className="text-sm text-gray-400">
                    Tape un nom pour récupérer<br/>le prix Cardmarket automatiquement
                  </p>
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-gray-100 shrink-0">
              <button onClick={() => setStep('form')}
                className="w-full text-sm text-gray-400 hover:text-gray-600 py-2 transition-colors">
                {t('addManually')}
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 2 : Formulaire ────────────────────────────────────── */}
        {step === 'form' && (
          <>
            <form id="wishlist-form" onSubmit={handleSubmit} className="overflow-y-auto flex-1 px-6 py-5 space-y-4">

              {/* Produit sélectionné via recherche API */}
              {selectedApiProduct ? (
                <div className="flex items-center gap-3 bg-blue-50 rounded-2xl p-3 border border-blue-100">
                  {productImage && (
                    <div className="w-14 h-14 rounded-xl overflow-hidden bg-white shrink-0 flex items-center justify-center border border-gray-100">
                      <img src={productImage} alt="" className="max-w-full max-h-full object-contain" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-900 leading-snug">{selectedApiProduct.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{selectedApiProduct.episode?.name || ''}</p>
                    {marketPrice && (
                      <p className="text-xs text-blue-600 font-semibold mt-1">
                        💰 {t('cmPrice')} : {marketPrice.toFixed(2)} €
                      </p>
                    )}
                  </div>
                  <button type="button" onClick={handleClearProduct}
                    className="text-gray-300 hover:text-gray-500 text-lg shrink-0">✕</button>
                </div>
              ) : (
                /* Produit depuis catalogue DB ou saisie libre */
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('product')} <span className="text-gray-400 font-normal text-xs">{t('optional')}</span>
                  </label>
                  {/* Badge si produit catalogue sélectionné */}
                  {cachedImageUrl && form.name ? (
                    <div className="flex items-center gap-3 bg-blue-50 rounded-2xl p-3 border border-blue-100">
                      <div className="w-12 h-12 rounded-xl overflow-hidden bg-white shrink-0 flex items-center justify-center border border-gray-100">
                        <img src={cachedImageUrl} alt="" className="max-w-full max-h-full object-contain" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{form.name}</p>
                        {marketPrice && (
                          <p className="text-xs text-blue-600 font-medium">
                            {t('cmPrice')} : {marketPrice.toFixed(2)} €
                          </p>
                        )}
                      </div>
                      <button type="button" onClick={handleClearProduct}
                        className="text-gray-400 hover:text-red-500 text-lg leading-none shrink-0">✕</button>
                    </div>
                  ) : productsLoading ? (
                    <div className="input-field text-sm text-gray-400 flex items-center gap-2">
                      <span className="w-3 h-3 border-2 border-gray-300 border-t-transparent rounded-full animate-spin inline-block" />
                      Chargement du catalogue…
                    </div>
                  ) : dbProducts.length > 0 ? (
                    <ProductCombobox
                      products={dbProducts}
                      value={form.name}
                      onChange={v => set('name', v)}
                      onSelect={handleSelectDbProduct}
                      placeholder={t('productPh')}
                    />
                  ) : (
                    <input
                      value={form.name}
                      onChange={e => set('name', e.target.value)}
                      className="input-field"
                      placeholder="ex: Coffret Dresseur d'Élite"
                    />
                  )}
                </div>
              )}

              {/* ── Priorité ─────────────────────────────────────────── */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('priority')}</label>
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
                      {p.emoji} {t(p.label)}
                    </button>
                  ))}
                </div>
              </div>

              {/* ── Extension + Type ──────────────────────────────────── */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('extension')}</label>
                  {dbSets.length > 0 ? (
                    <select
                      value={form.set_name}
                      onChange={e => set('set_name', e.target.value)}
                      className="input-field text-sm"
                    >
                      <option value="">{t('choose')}</option>
                      {dbSets.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  ) : (
                    <input
                      value={form.set_name}
                      onChange={e => set('set_name', e.target.value)}
                      className="input-field"
                      placeholder={t('extensionPh')}
                    />
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('type')}</label>
                  {types.length > 0 ? (
                    <select value={form.item_type} onChange={e => set('item_type', e.target.value)} className="input-field">
                      <option value="">{t('choose')}</option>
                      {types.map(tp => (
                        <option key={tp.label} value={tp.label}>
                          {tp.icon ? `${tp.icon} ${tp.label}` : tp.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      value={form.item_type}
                      onChange={e => set('item_type', e.target.value)}
                      className="input-field"
                      placeholder="ETB, Booster Box…"
                    />
                  )}
                </div>
              </div>

              {/* ── Prix cible + Variante ─────────────────────────────── */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('targetPrice')}
                    {marketPrice && (
                      <span className="ml-1 text-[10px] font-normal text-blue-500">
                        CM : {marketPrice.toFixed(2)} €
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('variant')}</label>
                  <input
                    value={form.variant_notes}
                    onChange={e => set('variant_notes', e.target.value)}
                    className="input-field"
                    placeholder={t('variantPh')}
                  />
                </div>
              </div>

              {/* ── Notes ─────────────────────────────────────────────── */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('notes')} <span className="text-gray-400 font-normal text-xs">{t('optional')}</span>
                </label>
                <textarea
                  value={form.notes}
                  onChange={e => set('notes', e.target.value)}
                  className="input-field resize-none"
                  rows={2}
                  placeholder={t('wishlistNotesPh')}
                />
              </div>
            </form>

            <div className="px-6 py-4 border-t border-gray-100 flex gap-3 shrink-0">
              <button type="button" onClick={onClose} className="btn-secondary flex-1">{t('cancel')}</button>
              <button type="submit" form="wishlist-form" className="btn-primary flex-1" disabled={saving}>
                {saving ? t('saving') : isEdit ? t('saveEdit') : t('saveWishlist')}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
