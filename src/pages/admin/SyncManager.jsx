import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

const PAGE_SIZE = 50

export default function SyncManager() {
  const [syncState, setSyncState] = useState(null)
  const [cacheCount, setCacheCount] = useState(null)
  const [apiUsage, setApiUsage] = useState(null)
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState(false)
  const [lastResult, setLastResult] = useState(null)
  const [products, setProducts] = useState([])
  const [productOffset, setProductOffset] = useState(PAGE_SIZE)
  const [hasMoreProducts, setHasMoreProducts] = useState(false)
  const [productsLoading, setProductsLoading] = useState(false)

  const loadData = async () => {
    setLoading(true)
    const [{ data: state }, { count }, { data: usage }, { data: prods }] = await Promise.all([
      supabase.from('sync_state').select('*').eq('id', 'pokemon_products').maybeSingle(),
      supabase.from('pokemon_products').select('*', { count: 'exact', head: true }),
      supabase.from('api_daily_counts').select('count').eq('date', new Date().toISOString().split('T')[0]).maybeSingle(),
      supabase.from('pokemon_products').select('api_id, name, full_data').order('name').range(0, PAGE_SIZE - 1),
    ])
    setSyncState(state)
    setCacheCount(count ?? 0)
    setApiUsage(usage?.count ?? 0)
    setProducts(prods || [])
    setProductOffset(PAGE_SIZE)
    setHasMoreProducts((prods?.length ?? 0) === PAGE_SIZE)
    setLoading(false)
  }

  const loadMoreProducts = async () => {
    setProductsLoading(true)
    const { data: more } = await supabase.from('pokemon_products')
      .select('api_id, name, full_data')
      .order('name')
      .range(productOffset, productOffset + PAGE_SIZE - 1)
    const list = more || []
    setProducts(prev => [...prev, ...list])
    setProductOffset(prev => prev + PAGE_SIZE)
    setHasMoreProducts(list.length === PAGE_SIZE)
    setProductsLoading(false)
  }

  const getPrice = (p) => {
    const cm = p.full_data?.prices?.cardmarket
    const val = cm?.lowest_FR ?? cm?.lowest ?? null
    return val != null ? `${Number(val).toFixed(2)} €` : '—'
  }

  const getSetName = (p) => p.full_data?.expansionName || p.full_data?.setName || '—'

  useEffect(() => { loadData() }, [])

  const handleRun = async () => {
    setRunning(true)
    setLastResult(null)
    try {
      const { data, error } = await supabase.functions.invoke('pokemon-sync', { body: {} })
      setLastResult(error ? { ok: false, error: error.message } : data)
      await loadData()
    } catch (e) {
      setLastResult({ ok: false, error: String(e) })
    } finally {
      setRunning(false)
    }
  }

  const resetSync = async () => {
    await supabase.from('sync_state')
      .upsert({ id: 'pokemon_products', current_page: 1, total_synced: 0, completed: false, last_error: null }, { onConflict: 'id' })
    await loadData()
  }

  if (loading) return <div className="flex justify-center py-8"><div className="w-6 h-6 border-4 border-pokemon-red border-t-transparent rounded-full animate-spin" /></div>

  const DAILY_LIMIT = 92
  const usagePct = Math.round((apiUsage / DAILY_LIMIT) * 100)
  const isComplete = syncState?.completed

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-gray-900">🔄 Sync BDD produits</h2>
      <p className="text-sm text-gray-500">
        Remplit automatiquement le cache <code className="bg-gray-100 px-1 rounded text-xs">pokemon_products</code> en téléchargeant tous les produits de l'API RapidAPI.
        Une fois terminé, toutes les recherches sont <span className="font-semibold text-emerald-600">gratuites et instantanées</span>.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
          <p className="text-[10px] text-gray-400 uppercase font-semibold mb-1">Produits en cache</p>
          <p className="text-2xl font-bold text-gray-900">{cacheCount}</p>
          <p className="text-xs text-gray-400 mt-0.5">{isComplete ? '✅ Sync terminée' : syncState?.current_page > 1 ? `📄 Page ${syncState.current_page - 1} atteinte` : '⏳ Pas encore lancée'}</p>
        </div>

        <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
          <p className="text-[10px] text-gray-400 uppercase font-semibold mb-1">API utilisée aujourd'hui</p>
          <p className="text-2xl font-bold text-gray-900">{apiUsage}<span className="text-sm text-gray-400 font-normal"> / {DAILY_LIMIT}</span></p>
          <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all ${usagePct > 80 ? 'bg-red-400' : usagePct > 50 ? 'bg-orange-400' : 'bg-emerald-400'}`} style={{ width: `${Math.min(usagePct, 100)}%` }} />
          </div>
          <p className="text-[10px] text-gray-400 mt-1">{DAILY_LIMIT - apiUsage} appels restants</p>
        </div>

        <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
          <p className="text-[10px] text-gray-400 uppercase font-semibold mb-1">Dernier lancement</p>
          <p className="text-sm font-semibold text-gray-700">
            {syncState?.last_run
              ? new Date(syncState.last_run).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
              : '—'}
          </p>
          <p className="text-[10px] text-gray-400 mt-1">Automatique : tous les jours à 3h UTC</p>
          {syncState?.last_error && (
            <p className="text-[10px] text-red-500 mt-1 truncate" title={syncState.last_error}>⚠️ {syncState.last_error}</p>
          )}
        </div>
      </div>

      {lastResult && (
        <div className={`rounded-xl p-3 text-sm font-medium ${lastResult.ok ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
          {lastResult.ok
            ? `✅ ${lastResult.new_products} nouveaux produits · ${lastResult.calls_made} appels · ${lastResult.remaining_today} restants · ${lastResult.completed ? 'Sync 100% terminée !' : `page ${lastResult.current_page - 1} atteinte`}`
            : `❌ ${lastResult.error ?? lastResult.reason}`}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          onClick={handleRun}
          disabled={running || isComplete || (DAILY_LIMIT - apiUsage) <= 0}
          className="btn-primary text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {running && <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />}
          {running ? 'En cours…' : isComplete ? '✅ Sync complète' : `▶ Lancer maintenant (${DAILY_LIMIT - apiUsage} appels dispo)`}
        </button>
        {isComplete && (
          <button onClick={resetSync} className="text-sm px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-600 font-medium transition-colors">
            🔁 Réinitialiser la sync
          </button>
        )}
      </div>

      {/* Product list */}
      {products.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-gray-700">
            Produits en cache <span className="text-gray-400 font-normal">({products.length} affichés sur {cacheCount})</span>
          </h3>
          <div className="card overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-3 py-2 text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Nom</th>
                  <th className="text-left px-3 py-2 text-[10px] font-semibold text-gray-400 uppercase tracking-wide hidden sm:table-cell">Extension</th>
                  <th className="text-right px-3 py-2 text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Prix</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {products.map((p) => (
                  <tr key={p.api_id} className="hover:bg-gray-50/50">
                    <td className="px-3 py-2 text-gray-800 font-medium max-w-[200px] truncate">{p.name}</td>
                    <td className="px-3 py-2 text-gray-400 hidden sm:table-cell">{getSetName(p)}</td>
                    <td className="px-3 py-2 text-right font-semibold text-gray-700">{getPrice(p)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {hasMoreProducts && (
            <button
              onClick={loadMoreProducts}
              disabled={productsLoading}
              className="w-full text-sm py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-600 font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {productsLoading && <span className="w-3 h-3 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />}
              {productsLoading ? 'Chargement…' : `Voir + (${cacheCount - products.length} restants)`}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
