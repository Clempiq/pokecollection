import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { refreshProductPrice, extractPrice, extractImage } from '../lib/pokemonApi'
import WishlistFormModal from '../components/WishlistFormModal'
import { useToast } from '../components/Toast'

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
    <div className="flex items-center gap-1.5 rounded-xl px-3 py-2" style={{ backgroundColor: 'var(--accent-subtle)' }}>
      <span className="text-[10px] font-medium uppercase tracking-wide" style={{ color: 'var(--accent-text)' }}>Cardmarket FR</span>
      <span className="ml-auto text-sm font-bold" style={{ color: 'var(--accent-text)' }}>{Number(marketPrice).toFixed(2)} €</span>
    </div>
  )
  const diff = marketPrice - targetPrice
  const pct = Math.round((diff / targetPrice) * 100)
  const isGood = diff <= 0
  return (
    <div className="flex items-center gap-1.5 rounded-xl px-3 py-2"
      style={{ backgroundColor: isGood ? 'var(--green-subtle)' : 'var(--red-subtle)' }}>
      <div className="flex-1 min-w-0">
        <span className="text-[10px] font-medium uppercase tracking-wide" style={{ color: isGood ? 'var(--green)' : 'var(--red)' }}>
          {isGood ? '✅ Bon prix !' : '⬆️ Au-dessus du budget'}
        </span>
        <p className="text-[10px]" style={{ color: isGood ? 'var(--green)' : 'var(--red)', opacity: 0.8 }}>
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

const GridIcon = () => <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M3 3h5v5H3V3zm0 9h5v5H3v-5zm9-9h5v5h-5V3zm0 9h5v5h-5v-5z" clipRule="evenodd"/></svg>
const ListIcon = () => <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd"/></svg>

export default function Wishlist() {
  const { user } = useAuth()
  const { addToast } = useToast()
  const [items, setItems]               = useState([])
  const [loading, setLoading]           = useState(true)
  const [showWishModal, setShowWishModal] = useState(false)

  // ── Vue grille / liste ────────────────────────────────────────────────
  const [viewMode, setViewMode] = useState(() => localStorage.getItem('wishlist_view') || 'grid')
  const setView = (mode) => { setViewMode(mode); localStorage.setItem('wishlist_view', mode) }

  // ── Wishlist sharing ──────────────────────────────────────────────────
  const [shareToken, setShareToken]     = useState(null)
  const [shareEnabled, setShareEnabled] = useState(false)
  const [showSharePanel, setShowSharePanel] = useState(false)
  const [shareTogglingId, setShareTogglingId] = useState(false)
  const [shareCopied, setShareCopied]   = useState(false)
  const [editingItem, setEditingItem]   = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [filterPriority, setFilterPriority] = useState('all')
  const [sort, setSort]                 = useState('priority')
  const [search, setSearch]             = useState('')
  const [refreshingId, setRefreshingId] = useState(null)
  const [buyConfirm, setBuyConfirm]     = useState(null) // { item, price }
  const [buyingNow, setBuyingNow]       = useState(false)

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

  const fetchShareSettings = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('wishlist_share_token, wishlist_public')
      .eq('id', user.id)
      .single()
    if (data) {
      setShareToken(data.wishlist_share_token || null)
      setShareEnabled(data.wishlist_public || false)
    }
  }

  const handleToggleShare = async () => {
    setShareTogglingId(true)
    let token = shareToken
    if (!token) {
      // Generate a new UUID token
      token = crypto.randomUUID()
    }
    const newEnabled = !shareEnabled
    const { error } = await supabase
      .from('profiles')
      .update({ wishlist_share_token: token, wishlist_public: newEnabled })
      .eq('id', user.id)
    if (!error) {
      setShareToken(token)
      setShareEnabled(newEnabled)
    }
    setShareTogglingId(false)
  }

  const shareUrl = shareToken ? `${window.location.origin}/w/${shareToken}` : null

  const handleCopyLink = () => {
    if (!shareUrl) return
    navigator.clipboard.writeText(shareUrl).then(() => {
      setShareCopied(true)
      setTimeout(() => setShareCopied(false), 2000)
    })
  }

  useEffect(() => { fetchItems(); fetchShareSettings() }, [])

  // ── CRUD ──────────────────────────────────────────────────────────────
  const handleSaveWish = async (formData) => {
    if (editingItem) {
      const { error } = await supabase.from('wishlists').update(formData).eq('id', editingItem.id)
      if (error) throw new Error('Erreur lors de la modification. Réessaie.')
      setItems(prev => prev.map(i => i.id === editingItem.id ? { ...i, ...formData } : i))
    } else {
      const { data, error } = await supabase.from('wishlists')
        .insert({ ...formData, user_id: user.id }).select().single()
      if (error) throw new Error('Erreur lors de l\'ajout. Réessaie.')
      if (data) setItems(prev => [data, ...prev])
    }
    setShowWishModal(false)
    setEditingItem(null)
  }

  const handleDelete = async (id) => {
    await supabase.from('wishlists').delete().eq('id', id)
    setItems(prev => prev.filter(i => i.id !== id))
    setDeleteConfirm(null)
  }

  // Quick buy confirm (direct from wishlist card)
  const handleQuickBuy = async () => {
    if (!buyConfirm) return
    setBuyingNow(true)
    const { item, price } = buyConfirm
    const { error } = await supabase.from('items').insert({
      user_id: user.id,
      name: item.name || null,
      set_name: item.set_name,
      item_type: item.item_type || null,
      variant_notes: item.variant_notes || null,
      quantity: 1,
      condition: 'Neuf',
      purchase_price: price !== '' ? parseFloat(price) : null,
      current_value: item.market_price || null,
      notes: item.notes || null,
    })
    if (!error) {
      await supabase.from('wishlists').delete().eq('id', item.id)
      setItems(prev => prev.filter(i => i.id !== item.id))
      addToast({ message: '✅ Item ajouté à ta collection !', type: 'success', duration: 3000 })
      // Award + revoke badges après acquisition
      try {
        const [awardRes, revokeRes] = await Promise.all([
          supabase.rpc('check_and_award_badges',  { p_user_id: user.id }),
          supabase.rpc('revoke_unearned_badges', { p_user_id: user.id }),
        ])
        const awarded = awardRes.data  || []
        const revoked = revokeRes.data || []
        if (awarded.length > 0) {
          const { data: details } = await supabase.from('badges').select('id, label, icon, rarity').in('id', awarded)
          ;(details || []).forEach(b => {
            const r = { common: '', rare: '🌟', epic: '💎', legendary: '👑' }[b.rarity] || ''
            addToast({ message: `${b.icon} Trophée débloqué ! ${r} ${b.label}`, type: 'success', duration: 6000 })
          })
        }
        if (revoked.length > 0) {
          const { data: details } = await supabase.from('badges').select('id, label, icon').in('id', revoked)
          ;(details || []).forEach(b => {
            addToast({ message: `${b.icon} Trophée retiré : ${b.label}`, type: 'error', duration: 5000 })
          })
        }
      } catch (_) {}
    }
    setBuyConfirm(null)
    setBuyingNow(false)
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
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setShowSharePanel(p => !p)}
            title="Partager ma wishlist"
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium border transition-colors ${
              shareEnabled
                ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            <span>🔗</span>
            {shareEnabled ? 'Partagée' : 'Partager'}
          </button>
          <button
            onClick={() => { setEditingItem(null); setShowWishModal(true) }}
            className="btn-primary"
          >
            + Ajouter
          </button>
        </div>
      </div>

      {/* ── Share panel ─────────────────────────────────────────────────── */}
      {showSharePanel && (
        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-gray-900">Partager ma wishlist</h3>
              <p className="text-sm text-gray-400 mt-0.5">
                Génère un lien public pour que tes amis voient ta liste — sans compte requis.
              </p>
            </div>
            <button
              onClick={handleToggleShare}
              disabled={shareTogglingId}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none shrink-0 ${
                shareEnabled ? 'bg-emerald-500' : 'bg-gray-200'
              }`}
            >
              <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
                shareEnabled ? 'translate-x-6' : 'translate-x-1'
              }`} />
            </button>
          </div>

          {shareEnabled && shareUrl && (
            <div className="flex items-center gap-2">
              <input
                readOnly
                value={shareUrl}
                className="input-field text-xs text-gray-500 flex-1 bg-gray-50"
                onClick={e => e.target.select()}
              />
              <button
                onClick={handleCopyLink}
                className={`shrink-0 px-3 py-2 rounded-xl text-sm font-semibold transition-colors ${
                  shareCopied
                    ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                    : 'bg-pokemon-blue text-white hover:bg-blue-700'
                }`}
              >
                {shareCopied ? '✓ Copié !' : 'Copier'}
              </button>
            </div>
          )}

          {!shareEnabled && (
            <p className="text-xs text-gray-400 italic">
              Active le partage pour générer ton lien unique.
            </p>
          )}
        </div>
      )}

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
        <div className="ml-auto flex items-center gap-2">
          <select
            value={sort}
            onChange={e => setSort(e.target.value)}
            className="text-xs border border-gray-200 rounded-xl px-3 py-1.5 bg-white text-gray-600 focus:outline-none focus:ring-2 focus:ring-pokemon-blue/20"
          >
            {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <div className="flex items-center bg-gray-100 rounded-xl p-1 gap-0.5">
            <button onClick={() => setView('grid')} title="Vue grille"
              className={`p-1.5 rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-white shadow text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}>
              <GridIcon />
            </button>
            <button onClick={() => setView('list')} title="Vue liste"
              className={`p-1.5 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-white shadow text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}>
              <ListIcon />
            </button>
          </div>
        </div>
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

      {/* ── Vue liste compacte ──────────────────────────────────────────── */}
      {filtered.length > 0 && viewMode === 'list' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden divide-y divide-gray-50">
          {filtered.map(item => {
            const style    = getTypeStyle(item.item_type)
            const priority = PRIORITIES[item.priority] || PRIORITIES[2]
            const diff     = item.market_price && item.target_price ? item.market_price - item.target_price : null
            return (
              <div key={item.id} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors">
                {/* Image */}
                <div className="w-10 h-10 rounded-xl overflow-hidden shrink-0 flex items-center justify-center border border-gray-100"
                  style={{ background: item.api_image_url ? 'var(--bg-subtle)' : style.bg }}>
                  {item.api_image_url
                    ? <img src={item.api_image_url} alt="" className="w-full h-full object-contain" onError={e => { e.target.style.display='none' }} />
                    : <span className="text-lg">{style.icon}</span>}
                </div>
                {/* Nom + set */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate leading-snug">
                    {item.name || <span className="text-gray-400 italic font-normal">Sans nom</span>}
                  </p>
                  <p className="text-xs text-gray-400 truncate">{item.set_name}</p>
                </div>
                {/* Priorité */}
                <span className="hidden sm:inline-flex shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: style.light, color: style.text }}>
                  {priority.emoji} {priority.label}
                </span>
                {/* Prix */}
                <div className="text-right shrink-0 min-w-[5rem]">
                  {item.target_price && <p className="text-sm font-bold text-gray-800">{Number(item.target_price).toFixed(2)} €</p>}
                  {diff !== null && (
                    <p className={`text-[10px] font-semibold ${diff <= 0 ? 'text-emerald-600' : 'text-orange-500'}`}>
                      CM: {Number(item.market_price).toFixed(2)} € {diff <= 0 ? '✅' : '⬆️'}
                    </p>
                  )}
                  {!item.target_price && item.market_price && (
                    <p className="text-sm font-bold text-blue-600">{Number(item.market_price).toFixed(2)} €</p>
                  )}
                </div>
                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => setBuyConfirm({ item, price: item.target_price ? String(item.target_price) : '' })}
                    className="hidden sm:flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2 py-1.5 rounded-lg border border-emerald-200 transition-colors">
                    🛒
                  </button>
                  <button onClick={() => { setEditingItem(item); setShowWishModal(true) }}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors">
                    <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                      <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                    </svg>
                  </button>
                  <button onClick={() => setDeleteConfirm(item)}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                    <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                      <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Vue grille (cartes) ──────────────────────────────────────────── */}
      {filtered.length > 0 && viewMode === 'grid' && (
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
                <div
                  className="relative shrink-0 overflow-hidden flex items-center justify-center"
                  style={{
                    background: hasImage ? 'var(--bg-subtle)' : style.bg,
                    height: hasImage ? '10rem' : '7rem',
                  }}
                >
                  {hasImage ? (
                    <img
                      src={item.api_image_url}
                      alt={item.name || item.set_name}
                      className="max-h-36 max-w-full object-contain p-1"
                      onError={e => { e.target.style.display = 'none' }}
                    />
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
                      className="text-xs font-semibold px-3 py-1.5 rounded-xl shadow-sm transition-opacity hover:opacity-90"
                      style={{ backgroundColor: '#ffffff', color: '#111827' }}
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
                    <div className="flex items-center gap-1.5 rounded-xl px-3 py-2" style={{ backgroundColor: 'var(--bg-subtle)' }}>
                      <span className="text-[10px] font-medium uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Prix cible</span>
                      <span className="ml-auto text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{item.target_price.toFixed(2)} €</span>
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

                  {/* "Acquis !" button */}
                  <button
                    onClick={() => setBuyConfirm({ item, price: item.target_price ? String(item.target_price) : '' })}
                    className="mt-auto w-full bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-sm py-2.5 rounded-xl transition-colors border border-emerald-200 flex items-center justify-center gap-2"
                  >
                    ✅ Acquis !
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

      {/* Quick buy confirm modal */}
      {buyConfirm && (
        <div className="fixed inset-0 flex items-end sm:items-center justify-center z-50 sm:p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
          <div className="rounded-t-3xl sm:rounded-2xl w-full sm:max-w-sm p-6"
            style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-strong)', boxShadow: '0 24px 80px rgba(0,0,0,0.45)' }}>
            <div className="sm:hidden flex justify-center mb-4">
              <div className="w-10 h-1 rounded-full" style={{ backgroundColor: 'var(--border-strong)' }} />
            </div>
            <div className="flex items-center gap-3 mb-5">
              {buyConfirm.item.api_image_url && (
                <img src={buyConfirm.item.api_image_url} alt="" className="w-14 h-14 rounded-xl object-cover shrink-0"
                  style={{ backgroundColor: 'var(--bg-subtle)' }} />
              )}
              <div className="flex-1 min-w-0">
                <h3 className="font-bold leading-snug" style={{ color: 'var(--text-primary)' }}>{buyConfirm.item.name || buyConfirm.item.set_name}</h3>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{buyConfirm.item.set_name}</p>
                {buyConfirm.item.market_price && (
                  <p className="text-xs mt-0.5" style={{ color: 'var(--accent-text)' }}>Prix Cardmarket FR : {Number(buyConfirm.item.market_price).toFixed(2)} €</p>
                )}
              </div>
            </div>
            <div className="mb-5">
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>Prix payé (€)</label>
              <input
                type="number" step="0.01" min="0"
                value={buyConfirm.price}
                onChange={e => setBuyConfirm(prev => ({ ...prev, price: e.target.value }))}
                className="w-full rounded-xl px-4 py-3 text-sm outline-none"
                style={{ backgroundColor: 'var(--bg-subtle)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                placeholder="0.00"
                autoFocus
              />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setBuyConfirm(null)} className="btn-secondary flex-1">Annuler</button>
              <button
                onClick={handleQuickBuy}
                disabled={buyingNow}
                className="flex-1 py-3 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 disabled:opacity-50"
                style={{ backgroundColor: 'var(--green)' }}
              >
                {buyingNow
                  ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  : '🎉 Ajouter à ma collection'}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 flex items-end sm:items-center justify-center z-50 sm:p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
          <div className="rounded-t-3xl sm:rounded-2xl w-full sm:max-w-sm p-6"
            style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-strong)', boxShadow: '0 24px 80px rgba(0,0,0,0.45)' }}>
            <div className="sm:hidden flex justify-center mb-4">
              <div className="w-10 h-1 rounded-full" style={{ backgroundColor: 'var(--border-strong)' }} />
            </div>
            <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{ backgroundColor: 'var(--red-subtle)' }}>
              <span className="text-2xl">🗑</span>
            </div>
            <h3 className="text-lg font-bold mb-1 text-center" style={{ color: 'var(--text-primary)' }}>Supprimer ce souhait ?</h3>
            <p className="text-sm mb-6 text-center" style={{ color: 'var(--text-muted)' }}>
              <span className="font-semibold" style={{ color: 'var(--text-secondary)' }}>"{deleteConfirm.name || deleteConfirm.set_name}"</span> sera retiré de ta wishlist.
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
