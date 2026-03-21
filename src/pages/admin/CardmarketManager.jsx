import { useState, useRef } from 'react'
import { supabase } from '../../lib/supabase'

async function callScrape(url, addToCatalog = false) {
  const { data, error } = await supabase.functions.invoke('scrape-cardmarket', {
    body: { url, add_to_catalog: addToCatalog },
  })
  if (error) return { success: false, error: error.message || 'Erreur réseau' }
  return data
}

export default function CardmarketManager() {
  const [step, setStep]         = useState('input')   // 'input' | 'preview' | 'success'
  const [url, setUrl]           = useState('')
  const [scraping, setScraping] = useState(false)
  const [scraped, setScraped]   = useState(null)
  const [error, setError]       = useState('')
  const [adding, setAdding]     = useState(false)
  const [addedProduct, setAddedProduct] = useState(null)
  const inputRef = useRef(null)

  const reset = () => {
    setStep('input')
    setUrl('')
    setScraped(null)
    setError('')
    setAddedProduct(null)
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  const handleScrape = async () => {
    if (!url.trim()) return
    setScraping(true)
    setError('')
    setScraped(null)

    const result = await callScrape(url.trim())
    setScraping(false)

    if (!result.success) {
      setError(result.error || 'Erreur inconnue')
      return
    }
    setScraped(result)
    setStep('preview')
  }

  const handleAddToCatalog = async () => {
    setAdding(true)
    setError('')

    const result = await callScrape(url.trim(), true)
    setAdding(false)

    if (!result.success) {
      setError(result.error || 'Erreur lors de l\'ajout au catalogue')
      return
    }
    setAddedProduct(result.product)
    setStep('success')
  }

  // ── style helpers ────────────────────────────────────────────────────────────
  const card = { backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)' }
  const inputStyle = { backgroundColor: 'var(--bg-subtle)', border: '1px solid var(--border)', color: 'var(--text-primary)' }

  return (
    <div className="space-y-5 max-w-2xl mx-auto">

      {/* Header */}
      <div>
        <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
          🔗 Enrichir le catalogue via Cardmarket
        </h2>
        <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
          Colle l'URL d'un produit Cardmarket → les infos sont ajoutées au catalogue partagé → tous les utilisateurs pourront le trouver lors d'un ajout à leur collection, et le prix sera mis à jour automatiquement chaque nuit.
        </p>
      </div>

      {/* ── URL input ────────────────────────────────────────────────────── */}
      {(step === 'input' || step === 'preview') && (
        <div className="rounded-2xl p-5 space-y-4" style={card}>
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="url"
              value={url}
              onChange={e => {
                setUrl(e.target.value)
                if (step === 'preview') { setStep('input'); setScraped(null); setError('') }
              }}
              onKeyDown={e => e.key === 'Enter' && step === 'input' && handleScrape()}
              placeholder="https://www.cardmarket.com/fr/Pokemon/Products/..."
              autoFocus
              className="flex-1 rounded-xl px-4 py-3 text-sm outline-none"
              style={inputStyle}
            />
            <button
              onClick={handleScrape}
              disabled={scraping || !url.trim() || step === 'preview'}
              className="shrink-0 px-5 py-3 rounded-xl text-sm font-bold text-white disabled:opacity-40 flex items-center gap-2"
              style={{ backgroundColor: 'var(--accent)' }}>
              {scraping
                ? <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />Analyse…</>
                : step === 'preview' ? '✓ Analysé' : '🔍 Analyser'
              }
            </button>
          </div>

          {error && (
            <div className="rounded-xl px-4 py-3 text-sm"
              style={{ backgroundColor: 'var(--red-subtle)', color: 'var(--red)', border: '1px solid rgba(239,68,68,0.3)' }}>
              ✗ {error}
            </div>
          )}

          {/* ── Aperçu produit ────────────────────────────────────────────── */}
          {scraped && step === 'preview' && (
            <div className="space-y-4 pt-1">

              <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
                <div className="flex items-start gap-4 p-4" style={{ backgroundColor: 'var(--bg-subtle)' }}>
                  {scraped.image_url
                    ? <img src={scraped.image_url} alt="" className="w-24 h-24 object-contain rounded-xl shrink-0"
                        style={{ backgroundColor: 'var(--bg-surface)' }} />
                    : <div className="w-24 h-24 rounded-xl shrink-0 flex items-center justify-center text-4xl"
                        style={{ backgroundColor: 'var(--bg-surface)' }}>📦</div>
                  }
                  <div className="flex-1 min-w-0 space-y-2">
                    <p className="font-bold text-base leading-tight" style={{ color: 'var(--text-primary)' }}>
                      {scraped.name}
                    </p>
                    {scraped.set_name && (
                      <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{scraped.set_name}</p>
                    )}
                    <div className="flex flex-wrap gap-2">
                      {scraped.item_type && (
                        <span className="text-xs font-semibold px-2.5 py-1 rounded-full"
                          style={{ backgroundColor: 'var(--accent-subtle)', color: 'var(--accent-text)' }}>
                          {scraped.item_type}
                        </span>
                      )}
                      {scraped.lowest_price != null && (
                        <span className="text-xs font-bold px-2.5 py-1 rounded-full"
                          style={{ backgroundColor: 'var(--green-subtle)', color: 'var(--green)' }}>
                          À partir de {scraped.lowest_price.toFixed(2)} €
                        </span>
                      )}
                      {scraped.available != null && (
                        <span className="text-xs px-2.5 py-1 rounded-full"
                          style={{ backgroundColor: 'var(--bg-surface)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
                          {scraped.available} annonces
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* URL sauvegardée */}
                <div className="px-4 py-2.5 flex items-center gap-2 text-xs"
                  style={{ borderTop: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                  <span>🔗</span>
                  <span className="truncate">{url}</span>
                </div>
              </div>

              <button
                onClick={handleAddToCatalog}
                disabled={adding}
                className="w-full py-3.5 rounded-xl text-sm font-bold text-white disabled:opacity-40 flex items-center justify-center gap-2"
                style={{ backgroundColor: 'var(--accent)' }}>
                {adding
                  ? <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />Ajout au catalogue…</>
                  : '✅ Ajouter au catalogue partagé'
                }
              </button>

              <button onClick={reset}
                className="w-full py-2 text-sm rounded-xl"
                style={{ color: 'var(--text-muted)', backgroundColor: 'var(--bg-subtle)' }}>
                ← Changer d'URL
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Succès ──────────────────────────────────────────────────────── */}
      {step === 'success' && (
        <div className="rounded-2xl p-6 space-y-4" style={card}>
          <div className="flex items-start gap-4">
            {addedProduct?.image_url
              ? <img src={addedProduct.image_url} alt="" className="w-20 h-20 object-contain rounded-xl shrink-0"
                  style={{ backgroundColor: 'var(--bg-subtle)' }} />
              : <div className="text-4xl">🎉</div>
            }
            <div className="flex-1">
              <p className="font-bold" style={{ color: 'var(--green)' }}>✓ Ajouté au catalogue partagé !</p>
              <p className="text-sm mt-0.5 font-medium" style={{ color: 'var(--text-primary)' }}>
                {addedProduct?.name}
              </p>
              {addedProduct?.set_name && (
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{addedProduct.set_name}</p>
              )}
              {addedProduct?.market_price_fr != null && (
                <p className="text-sm font-semibold mt-1" style={{ color: 'var(--green)' }}>
                  Prix le plus bas : {Number(addedProduct.market_price_fr).toFixed(2)} €
                </p>
              )}
              <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
                Visible dans la recherche de tous les utilisateurs · prix mis à jour chaque nuit
              </p>
            </div>
          </div>

          <button
            onClick={reset}
            className="w-full py-3 rounded-xl text-sm font-bold text-white"
            style={{ backgroundColor: 'var(--accent)' }}>
            ➕ Ajouter un autre produit
          </button>
        </div>
      )}

      {/* ── Info ─────────────────────────────────────────────────────────── */}
      {step === 'input' && (
        <div className="rounded-xl px-4 py-3 text-sm"
          style={{ backgroundColor: 'var(--bg-subtle)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
          💡 Les produits ajoutés ici enrichissent le catalogue commun. Ils apparaissent dans la{' '}
          <strong style={{ color: 'var(--text-secondary)' }}>recherche lors de l'ajout à une collection</strong>
          {' '}et leur prix est mis à jour chaque nuit automatiquement via le cron Supabase.
        </div>
      )}
    </div>
  )
}
