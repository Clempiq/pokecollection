import { useState, useEffect, useRef } from 'react'
import { searchProducts, searchProductsFromCache, extractPrice, extractImage } from '../../lib/pokemonApi'
import { useLocale } from '../../lib/useLocale'

export default function SearchStep({ onSelectProduct, onGoToForm }) {
  const { t } = useLocale()
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState('')
  const [offset, setOffset] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const debounceRef = useRef(null)

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    setOffset(0)
    setHasMore(false)
    if (!searchQuery.trim() || searchQuery.trim().length < 2) {
      setSearchResults([])
      return
    }
    debounceRef.current = setTimeout(() => doSearch(searchQuery, 0, false), 600)
    return () => clearTimeout(debounceRef.current)
  }, [searchQuery])

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

  const handleSelectProduct = (product) => {
    onSelectProduct(product)
  }

  return (
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
                      {img
                        ? <img src={img} alt="" className="w-full h-full object-contain" />
                        : <span className="text-2xl">📦</span>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 leading-snug">
                        {p.name_fr || p.name}
                      </p>
                      {p.name_fr && p.name_fr !== p.name && (
                        <p className="text-[10px] text-gray-300 truncate">{p.name}</p>
                      )}
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
            <p className="text-4xl mb-3">📦</p>
            <p className="text-sm text-gray-400">
              Tape un nom pour récupérer<br/>le prix Cardmarket automatiquement
            </p>
          </div>
        )}
      </div>

      <div className="px-6 py-4 border-t border-gray-100 shrink-0">
        <button onClick={onGoToForm}
          className="w-full text-sm text-gray-400 hover:text-gray-600 py-2 transition-colors">
          {t('addManually')}
        </button>
      </div>
    </div>
  )
}
