import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { refreshProductPrice, extractPrice, extractImage } from '../lib/pokemonApi'
import WishlistFormModal from '../components/WishlistFormModal'
import ItemFormModal from '../components/ItemFormModal'

function getTypeStyle(type) {
  const t = (type || '').toLowerCase()
  if (t.includes('display') || t.includes('booster box') || t.includes('box'))
    return { bg: 'linear-gradient(135deg, #7c3aed 0%, #4338ca 100%)', icon: '🗃️', accent: '#7c3aed', light: '#ede9fe', text: '#5b21b6' }
  if (t.includes('etb') || t.includes('elite') || t.includes('dresseur'))
    return { bg: 'linear-gradient(135deg, #ef4444 0%, #be185d 100%)', icon: '🎁', accent: '#ef4444', light: '#fee2e2', text: '#991b1b' }
  if (t.includes('coffret') || t.includes('collection box') || t.includes('collection'))
    return { bg: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', icon: '📦', accent: '#f59e0b', light: '#fef3c7', text: '#92400e' }
  if (t.includes('tin') || t.includes('boîte'))
    return { bg: 'linear-gradient(135deg, #06b6d4 0%, #0369a1 100%)', icon: '🫙', accent: '#06b6d4', light: '#cffafe', text: '#155e75' }
  if (t.includes('blister') || t.includes('pack'))
    return { bg: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', icon: '📋', accent: '#10b981', light: '#d1fae5', text: '#065f46' }
  if (t.includes('starter') || t.includes('deck') || t.includes('battle'))
    return { bg: 'linear-gradient(135deg, #f97316 0%, #c2410c 100%)', icon: '⚔️', accent: '#f97316', light: '#ffedd5', text: '#9a3412' }
  if (t.includes('promo') || t.includes('special'))
    return { bg: 'linear-gradient(135deg, #ec4899 0%, #9d174d 100%)', icon: '⭐', accent: '#ec4899', light: '#fce7f3', text: '#831843' }
  if (t.includes('mini') || t.includes('booster'))
    return { bg: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)', icon: '✨', accent: '#8b5cf6', light: '#ede9fe', text: '#5b21b6' }
  return { bg: 'linear-gradient(135deg, #1d4ed8 0%, #1e3a8a 100%)', icon: '🃏', accent: '#1d4ed8', light: '#dbeafe', text: '#1e3a8a' }
}

const PRIORITIES = {
  1: { label: 'Urgent',  emoji: '🔴', bg: 'bg-red-50',    text: 'text-red-600',    border: 'border-red-100' },
  2: { label: 'Normal',  emoji: '🟡', bg: 'bg-yellow-50', text: 'text-yellow-600', border: 'border-yellow-100' },
  3: { label: 'Un jour', emoji: '🟢', bg: 'bg-green-50',  text: 'text-green-600',  border: 'border-green-100' },
}

const SORT_OPTIONS = [
  { value: 'priority',   label: '🔴 Priorité' },
  { value: 'date_desc',  label: '🕐 Récents' },
  { value: 'date_asc',   label: '🕐 Anciens' },
  { value: 'price_asc',  label: '💰 Prix ↑' },
  { value: 'price_desc', label: '💰 Prix ↓' },
]

function PriceComparison({ targetPrice, marketPrice }) {
  if (!marketPrice) return null
  if (!targetPrice) return (
    <div className="flex items-center gap-1.5 bg-blue-50 rounded-xl px-3 py-2">
      <span className="text-[10px] text-blue-500 font-medium uppercase tracking-wide">Cardmarket FR</span>
      <span className="ml-auto text-sm font-bold text-blue-700">{Number(marketPrice).toFixed(2)} €</span>
    </div>
  )
  const diff = marketPrice - targetPrice
  const pct = Math.round((diff / targetPrice) * 100)
  const isGood = diff <= 0
  return (
    <div className={`flex items-center gap-1.5 rounded-xl px-3 py-2 ${isGood ? 'bg-emerald-50' : 'bg-orange-50'}`}>
      <div className="flex-1 min-w-0">
        <span className={`text-[10px] font-medium uppercase tracking-wide ${isGood ? 'text-emerald-600' : 'text-orange-500'}`}>
          {isGood ? '✅ Bon prix !' : '⬆️ Au-dessus du budget'}
        </span>
        <p className={`text-[10px] ${isGood ? 'text-emerald-500' : 'text-orange-400'}`}>
          CM FR : {Number(marketPrice).toFixed(2)} € ({isGood ? '' : '+'}{pct}%)
        </p>
      </div>
    </div>
  )
}

function timeAgo(dateStr) {
  if (!dateStr) return null
  const diff = Date.now() - new Date(dateStr).getTime()
  const days = Math.floor(diff / 86400000)
  if (days === 0) return "aujourd'hui"
  if (days === 1) return "hier"
  return `il y a ${days}j`
}

export default function Wishlist() {
  const { user } = useAuth()
  const [items, setItems]               = useState([])
  const [loading, setLoading]           = useState(true)
  const [showWishModal, setShowWishModal] = useState(false)
  const [editingItem, setEditingItem]   = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [buyingItem, setBuyingItem]     = useState(null)
  const [filterPriority, setFilterPriority] = useState('all')
  const [sort, setSort]                 = useState('priority')
  const [search, setSearch]             = useState('')
  const [refreshingId, setRefreshingId] = useState(null)

  const fetchItems = async () => {
    const { data } = await supabase
      .from('wishlists')
      .select('*')
      .eq('user_id', user.id)
      .order('priority', { ascending: true })
      .order('created_at', { ascending: false })
    setItems(data || [])
    setLoading(false)
  }

  useEffect(() => { fetchItems() }, [])

  // ── CRUD ──────────────────────────────────────────────────────────────
  const handleSaveWish = async (formData) => {
    if (editingItem) {
      const { error } = await supabase.from('wishlists').update(formData).eq('id', editingItem.id)
      if (!error) setItems(prev => prev.map(i => i.id === editingItem.id ? { ...i, ...formData } : i))
    } else {
      const { data, error } = await supabase.from('wishlists')
        .insert({ ...formData, user_id: user.id }).select().single()
      if (!error && data) setItems(prev => [data, ...prev])
    }
    setShowWishModal(false)
    setEditingItem(null)
  }

  const handleDelete = async (id) => {
    await supabase.from('wishlists').delete().eq('id', id)
    setItems(prev => prev.filter(i => i.id !== id))
    setDeleteConfirm(null)
  }

  const handleBought = async (collectionData) => {
    const { error } = await supabase.from('items').insert({ ...collectionData, user_id: user.id })
    if (!error) {
      await supabase.from('wishlists').delete().eq('id', buyingItem.id)
      setItems(prev => prev.filter(i => i.id !== buyingItem.id))
    }
    setBuyingItem(null)
  }

  // ── Refresh market price ───────────────────────────────────────────────
  const handleRefreshPrice = async (item) => {
    if (!item.api_product_id || refreshingId) return
    setRefreshingId(item.id)
    try {
      const data = await refreshProductPrice(item.api_product_id)
      const product = data?.data || data
      const price = extractPrice(product)
      const imageUrl = extractImage(product) || item.api_image_url
      if (price !== null) {
        const updates = {
          market_price: price,
          market_price_updated_at: new Date().toISOString(),
          api_image_url: imageUrl,
        }
        await supabase.from('wishlists').update(updates).eq('id', item.id)
        setItems(prev => prev.map(i => i.id === item.id ? { ...i, ...updates } : i))
      }
    } catch (e) {
      console.error('Refresh failed:', e)
    } finally {
      setRefreshingId(null)
    }
  }

  // ── Filtering & sorting ────────────────────────────────────────────────
  const filtered = items
    .filter(i => filterPriority === 'all' || i.priority === Number(filterPriority))
    .filter(i => {
      if (!search.trim()) return true
      const q = search.toLowerCase()
      return (i.name || '').toLowerCase().includes(q) ||
             (i.set_name || '').toLowerCase().includes(q) ||
             (i.item_type || '').toLowerCase().includes(q)
    })
    .sort((a, b) => {
      if (sort === 'priority')  return a.priority - b.priority || new Date(b.created_at) - new Date(a.created_at)
      if (sort === 'date_desc') return new Date(b.created_at) - new Date(a.created_at)
      if (sort === 'date_asc')  return new Date(a.created_at) - new Date(b.created_at)
      if (sort === 'price_asc') return (a.target_price || 999999) - (b.target_price || 999999)
      if (sort === 'price_desc')return (b.target_price || 0) - (a.target_price || 0)
      return 0
    })

  const totalTarget = items.filter(i => i.target_price).reduce((s, i) => s + i.target_price, 0)
  const urgentCount = items.filter(i => i.priority === 1).length

  const wishToCollectionItem = buyingItem ? {
    name: buyingItem.name || '',
    set_name: buyingItem.set_name || '',
    item_type: buyingItem.item_type || '',
    variant_notes: buyingItem.variant_notes || '',
    purchase_price: buyingItem.target_price || '',
    current_value: buyingItem.market_price || '',
    quantity: 1,
    condition: 'Neuf',
    notes: buyingItem.notes || '',
  } : null

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-pokemon-red border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="space-y-6 max-w-6xl mx-auto">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">✨ Wishlist</h1>
          <p className="text-gray-400 text-sm mt-0.5">
            {items.length} souhait{items.length !== 1 ? 's' : ''}
            {urgentCount > 0 && <span className="ml-2 text-red-500 font-medium">· {urgentCount} urgent{urgentCount > 1 ? 's' : ''} 🔴</span>}
            {totalTarget > 0 && <span className="ml-2">· budget total {totalTarget.toFixed(2)} €</span>}
          </p>
        </div>
        <button
          onClick={() => { setEditingItem(null); setShowWishModal(true) }}
          className="btn-primary shrink-0"
        >
          + Ajouter
        </button>
      </div>

      {/* ── Filters ─────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2">
        {['all', '1', '2', '3'].map(v => {
          const p = v !== 'all' ? PRIORITIES[Number(v)] : null
          const count = v === 'all' ? items.length : items.filter(i => i.priority === Number(v)).length
          return (
            <button
              key={v}
              onClick={() => setFilterPriority(v)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                filterPriority === v
                  ? 'bg-pokemon-blue text-white shadow-sm'
                  : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {v === 'all' ? `Tous (${count})` : `${p.emoji} ${p.label} (${count})`}
            </button>
          )
        })}
        <select
          value={sort}
          onChange={e => setSort(e.target.value)}
          className="ml-auto text-xs border border-gray-200 rounded-xl px-3 py-1.5 bg-white text-gray-600 focus:outline-none focus:ring-2 focus:ring-pokemon-blue/20"
        >
          {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      {/* Search */}
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 text-sm">🔍</span>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="input-field pl-9 pr-9"
          placeholder="Rechercher dans la wishlist…"
        />
        {search && (
          <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500">✕</button>
        )}
      </div>

      {/* ── Empty state ─────────────────────────────────────────────────── */}
      {filtered.length === 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-14 text-center">
          <div className="text-5xl mb-4">✨</div>
          <p className="text-gray-700 font-semibold text-lg mb-1">
            {items.length === 0 ? 'Ta wishlist est vide' : 'Aucun résultat'}
          </p>
          <p className="text-gray-400 text-sm">
            {items.length === 0
              ? 'Ajoute les produits que tu veux acheter pour ne rien oublier'
              : 'Essaie de modifier tes filtres'}
          </p>
          {items.length === 0 && (
            <button
              onClick={() => { setEditingItem(null); setShowWishModal(true) }}
              className="btn-primary inline-block mt-5"
            >
              + Mon premier souhait
            </button>
          )}
        </div>
      )}

      {/* ── Cards grid ──────────────────────────────────────────────────── */}
      {filtered.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered.map(item => {
            const style = getTypeStyle(item.item_type)
            const priority = PRIORITIES[item.priority] || PRIORITIES[2]
            const hasImage = !!item.api_image_url
            const isRefreshing = refreshingId === item.id
            const priceAge = timeAgo(item.market_price_updated_at)
            const canRefresh = !!item.api_product_id && !isRefreshing

            return (
              <div key={item.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-lg transition-all duration-200 group flex flex-col">

                {/* Card header : image or gradient */}
                <div className="relative h-28 shrink-0 overflow-hidden" style={{ background: style.bg }}>
                  {hasImage ? (
                    <>
                      <img
                        src={item.api_image_url}
                        alt={item.name || item.set_name}
                        className="absolute inset-0 w-full h-full object-cover"
                        onError={e => { e.target.style.display = 'none' }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
                    </>
                  ) : (
                    <>
                      <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.8) 1px, transparent 1px)', backgroundSize: '14px 14px' }} />
                      <div className="absolute inset-0 bg-gradient-to-br from-white/15 to-transparent" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-4xl opacity-80 select-none drop-shadow-sm">{style.icon}</span>
                      </div>
                    </>
                  )}

                  {/* Priority badge */}
                  <div className="absolute top-2.5 right-2.5 flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-black/30 text-white backdrop-blur-sm">
                    {priority.emoji} {priority.label}
                  </div>

                  {/* Star */}
                  <div className="absolute top-2.5 left-2.5 text-yellow-300 text-base drop-shadow">⭐</div>

                  {/* Edit/delete overlay */}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-150 flex items-center justify-center gap-2">
                    <button
                      onClick={() => { setEditingItem(item); setShowWishModal(true) }}
                      className="bg-white/95 text-gray-800 text-xs font-semibold px-3 py-1.5 rounded-xl hover:bg-white shadow-sm"
                    >
                      ✏️ Modifier
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(item)}
                      className="bg-red-500/90 text-white text-xs font-semibold px-3 py-1.5 rounded-xl hover:bg-red-500 shadow-sm"
                    >
                      🗑 Suppr.
                    </button>
                  </div>
                </div>

                {/* Content */}
                <div className="flex flex-col flex-1 px-4 pt-3 pb-4 gap-2">
                  <div>
                    <h3 className="font-bold text-gray-900 text-sm leading-snug line-clamp-2 mb-0.5">
                      {item.name || <span className="text-gray-400 italic font-normal">Sans nom</span>}
                    </h3>
                    <p className="text-xs text-gray-400 truncate">{item.set_name}</p>
                    {item.variant_notes && (
                      <p className="text-[10px] italic mt-0.5 truncate font-medium" style={{ color: style.accent }}>✦ {item.variant_notes}</p>
                    )}
                  </div>

                  {item.item_type && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full self-start"
                      style={{ backgroundColor: style.light, color: style.text }}>
                      {style.icon} {item.item_type}
                    </span>
                  )}

                  {/* Target price */}
                  {item.target_price && (
                    <div className="flex items-center gap-1.5 bg-gray-50 rounded-xl px-3 py-2">
                      <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wide">Prix cible</span>
                      <span className="ml-auto text-sm font-bold text-gray-800">{item.target_price.toFixed(2)} €</span>
                    </div>
                  )}

                  {/* Market price comparison */}
                  <PriceComparison targetPrice={item.target_price} marketPrice={item.market_price} />

                  {/* Price age + refresh button */}
                  {item.market_price && (
                    <div className="flex items-center gap-1 mt-0.5">
                      <span className="text-[10px] text-gray-300">Mis à jour {priceAge}</span>
                      {canRefresh && (
                        <button
                          onClick={() => handleRefreshPrice(item)}
                          disabled={isRefreshing}
                          className="ml-auto text-[10px] text-blue-400 hover:text-blue-600 flex items-center gap-1 disabled:opacity-50"
                        >
                          {isRefreshing
                            ? <span className="inline-block w-2.5 h-2.5 border border-blue-400 border-t-transparent rounded-full animate-spin" />
                            : '↻'
                          } Actualiser
                        </button>
                      )}
                    </div>
                  )}

                  {/* Notes */}
                  {item.notes && (
                    <p className="text-[11px] text-gray-400 italic line-clamp-2">{item.notes}</p>
                  )}

                  {/* "Acheté !" button */}
                  <button
                    onClick={() => setBuyingItem(item)}
                    className="mt-auto w-full bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-sm py-2.5 rounded-xl transition-colors border border-emerald-200 flex items-center justify-center gap-2"
                  >
                    🛒 Acheté !
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Modals ──────────────────────────────────────────────────────── */}
      {showWishModal && (
        <WishlistFormModal
          item={editingItem}
          onClose={() => { setShowWishModal(false); setEditingItem(null) }}
          onSave={handleSaveWish}
        />
      )}

      {buyingItem && (
        <ItemFormModal
          item={wishToCollectionItem}
          prefillOnly
          onClose={() => setBuyingItem(null)}
          onSave={handleBought}
          title="🎉 Ajouter à ma collection"
        />
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 sm:p-4">
          <div className="bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl w-full sm:max-w-sm p-6">
            <div className="sm:hidden flex justify-center mb-4"><div className="w-10 h-1 bg-gray-200 rounded-full" /></div>
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">🗑</span>
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-1 text-center">Supprimer ce souhait ?</h3>
            <p className="text-gray-400 text-sm mb-6 text-center">
              <span className="font-semibold text-gray-600">"{deleteConfirm.name || deleteConfirm.set_name}"</span> sera retiré de ta wishlist.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="btn-secondary flex-1">Annuler</button>
              <button onClick={() => handleDelete(deleteConfirm.id)} className="btn-danger flex-1">Supprimer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
