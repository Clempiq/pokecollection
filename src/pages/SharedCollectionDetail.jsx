import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import ItemFormModal from '../components/ItemFormModal'
import { useItemOptions } from '../lib/itemOptions'

// ─── Type style helper ────────────────────────────────────────────────────────
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

// ─── Balance & settlement helpers ─────────────────────────────────────────────
function calcBalances(items, members, payments = []) {
  const n = members.length
  if (n === 0) return { total: 0, fairShare: 0, balances: [], unpricedCount: items.length }
  const allMemberIds = members.map(m => m.user_id)
  const priced = items.filter(i => i.purchase_price && i.purchase_price > 0)
  const total = priced.reduce((s, i) => s + i.purchase_price * (i.quantity || 1), 0)

  // net[id] = paid - owed (positive = others owe you, negative = you owe others)
  const net = {}
  const paid = {}
  allMemberIds.forEach(id => { net[id] = 0; paid[id] = 0 })

  priced.forEach(i => {
    const payerId = i.paid_by_user_id || i.user_id
    const amount = i.purchase_price * (i.quantity || 1)
    const splitters = (i.split_member_ids && i.split_member_ids.length > 0)
      ? i.split_member_ids.filter(id => allMemberIds.includes(id))
      : allMemberIds
    if (splitters.length === 0) return
    const share = amount / splitters.length
    if (net[payerId] !== undefined) { net[payerId] += amount; paid[payerId] += amount }
    splitters.forEach(id => { if (net[id] !== undefined) net[id] -= share })
  })

  // Offset with validated payments
  payments.forEach(p => {
    if (net[p.from_user_id] !== undefined) net[p.from_user_id] += p.amount
    if (net[p.to_user_id] !== undefined) net[p.to_user_id] -= p.amount
  })

  const fairShare = total / n
  const balances = members.map(m => ({
    userId: m.user_id,
    profile: m.profiles,
    role: m.role,
    spent: paid[m.user_id] || 0,
    fairShare,
    balance: net[m.user_id] || 0,
  })).sort((a, b) => b.balance - a.balance)

  return { total, fairShare, balances, unpricedCount: items.length - priced.length }
}

function calcSettlements(balances) {
  const creds = balances.filter(b => b.balance > 0.005).map(b => ({ ...b, rem: b.balance }))
  const debts = balances.filter(b => b.balance < -0.005).map(b => ({ ...b, rem: Math.abs(b.balance) }))
  const settlements = []
  let ci = 0, di = 0
  while (ci < creds.length && di < debts.length) {
    const amount = Math.min(creds[ci].rem, debts[di].rem)
    if (amount > 0.005) settlements.push({ from: debts[di], to: creds[ci], amount })
    creds[ci].rem -= amount; debts[di].rem -= amount
    if (creds[ci].rem < 0.005) ci++
    if (debts[di].rem < 0.005) di++
  }
  return settlements
}

function memberName(p) {
  if (!p) return '?'
  return p.username || p.email || '?'
}
function memberInitial(p) {
  return p?.username?.[0]?.toUpperCase() || p?.email?.[0]?.toUpperCase() || '?'
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function SharedCollectionDetail() {
  const { collectionId } = useParams()
  const { user } = useAuth()
  const [collection, setCollection] = useState(null)
  const [items, setItems] = useState([])
  const [members, setMembers] = useState([])
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [notAuthorized, setNotAuthorized] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [userProfiles, setUserProfiles] = useState({})
  const [filterUser, setFilterUser] = useState('all')
  const [showInvite, setShowInvite] = useState(false)
  const [invitableFriends, setInvitableFriends] = useState([])
  const [inviteLoading, setInviteLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('items') // 'items' | 'depenses'
  const [payingSettlement, setPayingSettlement] = useState(null) // index being confirmed

  const { conditionColor } = useItemOptions()

  const fetchData = async () => {
    const { data: membership } = await supabase
      .from('shared_collection_members')
      .select('role')
      .eq('collection_id', collectionId)
      .eq('user_id', user.id)
      .single()

    if (!membership) { setNotAuthorized(true); setLoading(false); return }

    const { data: coll } = await supabase
      .from('shared_collections').select('*').eq('id', collectionId).single()
    setCollection(coll)

    const { data: membersData } = await supabase
      .from('shared_collection_members')
      .select('user_id, role, profiles(id, username, email)')
      .eq('collection_id', collectionId)
    setMembers(membersData || [])

    const profileMap = {}
    membersData?.forEach(m => { profileMap[m.user_id] = m.profiles })
    setUserProfiles(profileMap)

    const { data: itemsData } = await supabase
      .from('shared_collection_items').select('*')
      .eq('collection_id', collectionId)
      .order('created_at', { ascending: false })
    setItems(itemsData || [])

    const { data: paymentsData } = await supabase
      .from('shared_collection_payments').select('*')
      .eq('collection_id', collectionId)
      .order('created_at', { ascending: false })
    setPayments(paymentsData || [])

    setLoading(false)
  }

  useEffect(() => { fetchData() }, [collectionId])

  const openInvite = async () => {
    const { data: friendships } = await supabase
      .from('friendships')
      .select(`
        requester_id, addressee_id,
        requester:profiles!friendships_requester_id_fkey(id, username, email),
        addressee:profiles!friendships_addressee_id_fkey(id, username, email)
      `)
      .eq('status', 'accepted')
      .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)

    const memberIds = new Set(members.map(m => m.user_id))
    const friends = (friendships || [])
      .map(f => f.requester_id === user.id ? f.addressee : f.requester)
      .filter(f => !memberIds.has(f.id))
    setInvitableFriends(friends)
    setShowInvite(true)
  }

  const inviteFriend = async (friendId) => {
    setInviteLoading(true)
    await supabase.from('shared_collection_members').insert({ collection_id: collectionId, user_id: friendId, role: 'member' })
    setShowInvite(false)
    fetchData()
    setInviteLoading(false)
  }

  const handleSave = async (formData) => {
    if (editingItem) {
      const { error } = await supabase.from('shared_collection_items').update(formData).eq('id', editingItem.id)
      if (!error) setItems(prev => prev.map(i => i.id === editingItem.id ? { ...i, ...formData } : i))
    } else {
      const { data, error } = await supabase.from('shared_collection_items')
        .insert({ ...formData, collection_id: collectionId, user_id: user.id }).select().single()
      if (!error && data) setItems(prev => [data, ...prev])
    }
    setShowModal(false)
    setEditingItem(null)
  }

  const handleDelete = async (item) => {
    await supabase.from('shared_collection_items').delete().eq('id', item.id)
    setItems(prev => prev.filter(i => i.id !== item.id))
    setDeleteConfirm(null)
  }

  const addPayment = async (fromUserId, toUserId, amount) => {
    const { data, error } = await supabase.from('shared_collection_payments').insert({
      collection_id: collectionId,
      from_user_id: fromUserId,
      to_user_id: toUserId,
      amount: parseFloat(amount.toFixed(2)),
    }).select().single()
    if (!error && data) {
      setPayments(prev => [data, ...prev])
      setPayingSettlement(null)
    }
  }

  const removePayment = async (paymentId) => {
    await supabase.from('shared_collection_payments').delete().eq('id', paymentId)
    setPayments(prev => prev.filter(p => p.id !== paymentId))
  }

  // Computed
  const totalValue = items.reduce((s, i) => s + (i.current_value || 0) * (i.quantity || 1), 0)
  const totalBuy = items.reduce((s, i) => s + (i.purchase_price || 0) * (i.quantity || 1), 0)
  const totalPnl = totalBuy > 0 ? totalValue - totalBuy : null
  const totalUnits = items.reduce((s, i) => s + (i.quantity || 1), 0)
  const isOwner = collection?.created_by === user.id
  const filtered = filterUser === 'all' ? items : items.filter(i => i.user_id === filterUser)

  const { total: splitTotal, fairShare, balances, unpricedCount } = calcBalances(items, members, payments)
  const settlements = calcSettlements(balances)

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-pokemon-red border-t-transparent rounded-full animate-spin"></div>
    </div>
  )

  if (notAuthorized) return (
    <div className="text-center py-20">
      <div className="text-5xl mb-4">🔒</div>
      <p className="text-gray-500 font-medium">Tu n'as pas accès à cette collection</p>
      <Link to="/shared" className="btn-primary inline-block mt-4">Retour</Link>
    </div>
  )

  return (
    <div className="space-y-5">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <Link to="/shared" className="text-gray-400 hover:text-gray-600 transition-colors text-sm mt-1 shrink-0">←</Link>
          <div className="min-w-0">
            <h1 className="text-lg sm:text-xl font-bold text-gray-900 truncate">🤝 {collection?.name}</h1>
            <p className="text-gray-400 text-xs mt-0.5">
              {totalUnits} unité{totalUnits !== 1 ? 's' : ''} · {totalValue.toFixed(2)} € de valeur
              {totalPnl !== null && (
                <span className={`ml-2 font-semibold ${totalPnl >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                  · P&L {totalPnl >= 0 ? '+' : ''}{totalPnl.toFixed(2)} €
                </span>
              )}
            </p>
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          {isOwner && (
            <button onClick={openInvite} className="btn-secondary text-xs sm:text-sm px-2 sm:px-4" title="Inviter un ami">👤</button>
          )}
          <button onClick={() => { setEditingItem(null); setShowModal(true) }} className="btn-primary text-xs sm:text-sm">
            + Ajouter
          </button>
        </div>
      </div>

      {/* ── Members filter strip ────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3 flex flex-wrap items-center gap-2">
        <button
          onClick={() => setFilterUser('all')}
          className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${filterUser === 'all' ? 'bg-pokemon-blue text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
        >
          Tous
        </button>
        {members.map(m => (
          <button
            key={m.user_id}
            onClick={() => setFilterUser(prev => prev === m.user_id ? 'all' : m.user_id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${filterUser === m.user_id ? 'bg-pokemon-blue text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            <div className={`w-4 h-4 rounded-full flex items-center justify-center text-white text-[9px] font-bold ${m.user_id === user.id ? 'bg-pokemon-red' : 'bg-pokemon-blue'}`}>
              {memberInitial(m.profiles)}
            </div>
            {memberName(m.profiles)}
            {m.role === 'owner' && <span className="text-yellow-400">★</span>}
            {m.user_id === user.id && <span className="opacity-50">(moi)</span>}
          </button>
        ))}
      </div>

      {/* ── Tabs ───────────────────────────────────────────────────────────── */}
      <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
        <button
          onClick={() => setActiveTab('items')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold transition-all ${
            activeTab === 'items' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          📦 Items
          <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${activeTab === 'items' ? 'bg-pokemon-blue text-white' : 'bg-gray-200 text-gray-500'}`}>
            {items.length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('depenses')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold transition-all ${
            activeTab === 'depenses' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          ⚖️ Dépenses
          {settlements.length > 0 && (
            <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${activeTab === 'depenses' ? 'bg-pokemon-red text-white' : 'bg-gray-200 text-gray-500'}`}>
              {settlements.length}
            </span>
          )}
        </button>
      </div>

      {/* ── ITEMS TAB ──────────────────────────────────────────────────────── */}
      {activeTab === 'items' && (
        filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
            <div className="text-5xl mb-4">📦</div>
            <p className="text-gray-600 font-semibold">
              {filterUser !== 'all' ? "Cet ami n'a pas encore ajouté d'items" : 'La collection est vide'}
            </p>
            {filterUser === 'all' && (
              <button onClick={() => { setEditingItem(null); setShowModal(true) }} className="btn-primary inline-block mt-4">
                + Ajouter le premier item
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filtered.map(item => {
              const contributor = userProfiles[item.user_id]
              const payer = item.paid_by_user_id ? userProfiles[item.paid_by_user_id] : contributor
              const isMyItem = item.user_id === user.id
              const style = getTypeStyle(item.item_type)
              const totalBuyItem = item.purchase_price ? item.purchase_price * item.quantity : null
              const totalValItem = item.current_value ? item.current_value * item.quantity : null
              const pnl = totalBuyItem !== null && totalValItem !== null ? totalValItem - totalBuyItem : null
              const pnlPct = pnl !== null && totalBuyItem > 0 ? (pnl / totalBuyItem) * 100 : null

              // Who split this item
              const splitCount = item.split_member_ids ? item.split_member_ids.length : members.length

              return (
                <div key={item.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-lg transition-all duration-200 group flex flex-col">
                  {/* Gradient header */}
                  <div className="relative h-24 shrink-0 overflow-hidden" style={{ background: style.bg }}>
                    <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.8) 1px, transparent 1px)', backgroundSize: '14px 14px' }} />
                    <div className="absolute inset-0 bg-gradient-to-br from-white/15 to-transparent" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-4xl opacity-80 select-none drop-shadow-sm">{style.icon}</span>
                    </div>
                    {item.quantity > 1 && (
                      <div className="absolute top-2.5 right-2.5 bg-black/30 backdrop-blur-sm text-white text-xs font-bold px-2 py-0.5 rounded-full">×{item.quantity}</div>
                    )}
                    <div className="absolute bottom-2.5 left-2.5">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${conditionColor(item.condition)}`}>{item.condition}</span>
                    </div>
                    {/* Contributor avatar */}
                    <div className="absolute top-2.5 left-2.5" title={`Ajouté par ${memberName(contributor)}`}>
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold shadow ${isMyItem ? 'bg-pokemon-red' : 'bg-white/30 backdrop-blur-sm'}`}>
                        {memberInitial(contributor)}
                      </div>
                    </div>
                    {isMyItem && (
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-150 flex items-center justify-center gap-2">
                        <button onClick={() => { setEditingItem(item); setShowModal(true) }}
                          className="text-xs font-semibold px-3 py-1.5 rounded-xl shadow-sm transition-opacity hover:opacity-90"
                          style={{ backgroundColor: '#ffffff', color: '#111827' }}>✏️ Modifier</button>
                        <button onClick={() => setDeleteConfirm(item)}
                          className="bg-red-500/90 text-white text-xs font-semibold px-3 py-1.5 rounded-xl hover:bg-red-500 shadow-sm">🗑 Suppr.</button>
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex flex-col flex-1 px-4 pt-3 pb-4 gap-2.5">
                    <div>
                      <h3 className="font-bold text-gray-900 text-sm leading-snug line-clamp-2 mb-0.5">
                        {item.full_data?.name_fr || item.name || <span className="text-gray-400 italic font-normal">Sans nom</span>}
                      </h3>
                      <p className="text-xs text-gray-400 leading-tight truncate">{item.set_name}</p>
                      {item.variant_notes && (
                        <p className="text-[10px] italic mt-0.5 truncate font-medium" style={{ color: style.accent }}>✦ {item.variant_notes}</p>
                      )}
                    </div>
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full self-start"
                      style={{ backgroundColor: style.light, color: style.text }}>
                      {style.icon} {item.item_type}
                    </span>

                    {/* Payer + split info */}
                    {item.purchase_price && (
                      <div className="flex items-center gap-1 text-[10px] text-gray-400">
                        <span>💸 Payé par</span>
                        <span className="font-semibold text-gray-600">
                          {memberName(payer)}
                        </span>
                        {splitCount < members.length && (
                          <span>· {splitCount}/{members.length} membres</span>
                        )}
                      </div>
                    )}

                    {(totalBuyItem !== null || totalValItem !== null) && (
                      <div className="rounded-xl bg-gray-50 p-2.5 space-y-1.5">
                        <div className="grid grid-cols-2 gap-2">
                          {totalBuyItem !== null && (
                            <div className="text-center">
                              <p className="text-[9px] text-gray-400 font-medium uppercase tracking-wide">Achat</p>
                              <p className="text-sm font-bold text-gray-700">{totalBuyItem.toFixed(2)} €</p>
                            </div>
                          )}
                          {totalValItem !== null && (
                            <div className="text-center">
                              <p className="text-[9px] text-gray-400 font-medium uppercase tracking-wide">Valeur</p>
                              <p className="text-sm font-bold text-gray-700">{totalValItem.toFixed(2)} €</p>
                            </div>
                          )}
                        </div>
                        {pnl !== null && (
                          <div className="flex items-center justify-between border-t border-gray-100 pt-1.5">
                            <span className="text-[9px] text-gray-400 font-medium uppercase tracking-wide">P&L</span>
                            <div className="flex items-center gap-1.5">
                              <span className={`text-xs font-bold ${pnl >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                                {pnl >= 0 ? '+' : ''}{pnl.toFixed(2)} €
                              </span>
                              {pnlPct !== null && (
                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${pnl >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'}`}>
                                  {pnl >= 0 ? '+' : ''}{pnlPct.toFixed(1)}%
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )
      )}

      {/* ── DÉPENSES TAB ───────────────────────────────────────────────────── */}
      {activeTab === 'depenses' && (
        <div className="space-y-5">

          {/* Global summary banner */}
          <div className="bg-gradient-to-br from-pokemon-blue to-blue-800 rounded-2xl p-5 text-white">
            <p className="text-blue-200 text-xs font-medium uppercase tracking-wide mb-3">Résumé financier</p>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-xl sm:text-2xl font-bold">{splitTotal.toFixed(2)} €</p>
                <p className="text-blue-300 text-xs mt-0.5">Total investi</p>
              </div>
              <div>
                <p className="text-xl sm:text-2xl font-bold">{fairShare.toFixed(2)} €</p>
                <p className="text-blue-300 text-xs mt-0.5">Part moy.</p>
              </div>
              <div>
                <p className="text-xl sm:text-2xl font-bold">{members.length}</p>
                <p className="text-blue-300 text-xs mt-0.5">Membres</p>
              </div>
            </div>
            {unpricedCount > 0 && (
              <div className="mt-3 bg-white/10 rounded-xl px-3 py-2">
                <p className="text-xs text-blue-200">
                  ⚠️ {unpricedCount} item{unpricedCount > 1 ? 's' : ''} sans prix ne sont pas comptabilisés
                </p>
              </div>
            )}
          </div>

          {splitTotal === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center">
              <div className="text-5xl mb-3">📊</div>
              <p className="text-gray-600 font-semibold">Aucune dépense renseignée</p>
              <p className="text-gray-400 text-sm mt-1">Ajoutez des items avec un prix d'achat pour voir les dépenses</p>
            </div>
          ) : (
            <>
              {/* Member balances */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
                  <h2 className="font-bold text-gray-800 text-sm">Dépenses par membre</h2>
                </div>
                <div className="divide-y divide-gray-50">
                  {balances.map(b => {
                    const maxSpend = fairShare * 2 || 1
                    const pct = Math.min((b.spent / maxSpend) * 100, 100)
                    const isMe = b.userId === user.id
                    return (
                      <div key={b.userId} className="px-5 py-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2.5">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold ${isMe ? 'bg-pokemon-red' : 'bg-pokemon-blue'}`}>
                              {memberInitial(b.profile)}
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-gray-900">
                                {memberName(b.profile)}
                                {isMe && <span className="ml-1 text-xs text-gray-400 font-normal">(moi)</span>}
                                {b.role === 'owner' && <span className="ml-1 text-yellow-400">★</span>}
                              </p>
                              <p className="text-xs text-gray-400">A payé {b.spent.toFixed(2)} €</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className={`inline-flex items-center gap-1 text-sm font-bold px-2.5 py-1 rounded-full ${
                              b.balance > 0.005 ? 'bg-emerald-50 text-emerald-600' :
                              b.balance < -0.005 ? 'bg-red-50 text-red-500' :
                              'bg-gray-100 text-gray-500'
                            }`}>
                              {b.balance > 0.005 ? '+' : ''}{b.balance.toFixed(2)} €
                            </span>
                            <p className={`text-[10px] mt-0.5 font-medium ${
                              b.balance > 0.005 ? 'text-emerald-500' :
                              b.balance < -0.005 ? 'text-red-400' :
                              'text-gray-400'
                            }`}>
                              {b.balance > 0.005 ? 'Les autres lui doivent' :
                               b.balance < -0.005 ? 'Doit rembourser' : 'Équilibré ✓'}
                            </p>
                          </div>
                        </div>
                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full transition-all duration-500 ${
                            b.balance > 0.005 ? 'bg-emerald-400' :
                            b.balance < -0.005 ? 'bg-red-400' : 'bg-gray-300'
                          }`} style={{ width: `${pct}%` }} />
                        </div>
                        <div className="flex justify-between text-[9px] text-gray-300 mt-0.5">
                          <span>0 €</span>
                          <span>Part moy. {fairShare.toFixed(2)} €</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Settlements (Remboursements suggérés) */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-5 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
                  <h2 className="font-bold text-gray-800 text-sm">Remboursements suggérés</h2>
                  {settlements.length === 0 && (
                    <span className="text-xs bg-emerald-100 text-emerald-600 font-semibold px-2 py-0.5 rounded-full">Tout est à jour ✓</span>
                  )}
                </div>
                {settlements.length === 0 ? (
                  <div className="px-5 py-8 text-center">
                    <div className="text-4xl mb-2">🎉</div>
                    <p className="text-gray-500 text-sm font-medium">Personne ne doit rien à personne !</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-50">
                    {settlements.map((s, i) => {
                      const isFromMe = s.from.userId === user.id
                      const isToMe = s.to.userId === user.id
                      const isConfirming = payingSettlement === i
                      return (
                        <div key={i} className={`px-5 py-4 flex flex-col gap-3 ${isFromMe ? 'bg-red-50/40' : isToMe ? 'bg-emerald-50/40' : ''}`}>
                          {/* Arrow row */}
                          <div className="flex items-center gap-3">
                            {/* From */}
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0 ${isFromMe ? 'bg-pokemon-red' : 'bg-pokemon-blue'}`}>
                                {memberInitial(s.from.profile)}
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-semibold text-gray-700 truncate">
                                  {memberName(s.from.profile)}
                                  {isFromMe && <span className="text-pokemon-red font-bold"> (moi)</span>}
                                </p>
                                <p className="text-[10px] text-gray-400">doit payer</p>
                              </div>
                            </div>

                            {/* Amount */}
                            <div className={`shrink-0 rounded-2xl px-3 py-2 text-center ${isFromMe ? 'bg-red-100' : isToMe ? 'bg-emerald-100' : 'bg-gray-100'}`}>
                              <p className={`text-base font-bold ${isFromMe ? 'text-pokemon-red' : isToMe ? 'text-emerald-600' : 'text-gray-700'}`}>
                                {s.amount.toFixed(2)} €
                              </p>
                            </div>

                            <div className="text-gray-300 text-lg shrink-0">→</div>

                            {/* To */}
                            <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
                              <div className="text-right min-w-0">
                                <p className="text-xs font-semibold text-gray-700 truncate">
                                  {memberName(s.to.profile)}
                                  {isToMe && <span className="text-emerald-600 font-bold"> (moi)</span>}
                                </p>
                                <p className="text-[10px] text-gray-400">à recevoir</p>
                              </div>
                              <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0 ${isToMe ? 'bg-emerald-500' : 'bg-pokemon-blue'}`}>
                                {memberInitial(s.to.profile)}
                              </div>
                            </div>
                          </div>

                          {/* "Mark as paid" button (only for the debtor) */}
                          {isFromMe && (
                            isConfirming ? (
                              <div className="flex gap-2">
                                <button
                                  onClick={() => addPayment(s.from.userId, s.to.userId, s.amount)}
                                  className="flex-1 text-sm bg-emerald-500 hover:bg-emerald-600 text-white font-semibold py-2 rounded-xl transition-colors"
                                >
                                  ✓ Confirmer le paiement
                                </button>
                                <button
                                  onClick={() => setPayingSettlement(null)}
                                  className="px-4 text-sm bg-gray-100 hover:bg-gray-200 text-gray-600 font-semibold py-2 rounded-xl transition-colors"
                                >
                                  Annuler
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setPayingSettlement(i)}
                                className="w-full text-sm bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold py-2 rounded-xl transition-colors border border-emerald-200"
                              >
                                💸 J'ai remboursé {s.amount.toFixed(2)} €
                              </button>
                            )
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Per-member purchase detail */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
                  <h2 className="font-bold text-gray-800 text-sm">Détail des achats</h2>
                </div>
                <div className="divide-y divide-gray-50">
                  {members.map(m => {
                    const mItems = items.filter(i => (i.paid_by_user_id || i.user_id) === m.user_id && i.purchase_price)
                    if (mItems.length === 0) return null
                    const mTotal = mItems.reduce((s, i) => s + i.purchase_price * (i.quantity || 1), 0)
                    const isMe = m.user_id === user.id
                    return (
                      <div key={m.user_id} className="px-5 py-3">
                        <div className="flex items-center gap-2 mb-2">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold ${isMe ? 'bg-pokemon-red' : 'bg-pokemon-blue'}`}>
                            {memberInitial(m.profiles)}
                          </div>
                          <span className="text-sm font-semibold text-gray-700">
                            {memberName(m.profiles)}{isMe ? ' (moi)' : ''} — <span className="text-pokemon-blue">{mTotal.toFixed(2)} €</span>
                          </span>
                        </div>
                        <div className="space-y-1 ml-8">
                          {mItems.map(i => (
                            <div key={i.id} className="flex items-center justify-between text-xs text-gray-500">
                              <span className="truncate flex-1 mr-2">
                                {i.full_data?.name_fr || i.name || <em className="text-gray-300">Sans nom</em>}
                                {i.quantity > 1 && <span className="text-gray-300 ml-1">×{i.quantity}</span>}
                                {i.split_member_ids && (
                                  <span className="text-gray-300 ml-1">÷{i.split_member_ids.length}</span>
                                )}
                              </span>
                              <span className="font-semibold text-gray-700 shrink-0">
                                {(i.purchase_price * (i.quantity || 1)).toFixed(2)} €
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Validated payments history */}
              {payments.length > 0 && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="px-5 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
                    <h2 className="font-bold text-gray-800 text-sm">Paiements validés</h2>
                    <span className="text-xs bg-emerald-100 text-emerald-700 font-semibold px-2 py-0.5 rounded-full">{payments.length}</span>
                  </div>
                  <div className="divide-y divide-gray-50">
                    {payments.map(p => {
                      const fromP = userProfiles[p.from_user_id]
                      const toP = userProfiles[p.to_user_id]
                      const isMyPayment = p.from_user_id === user.id
                      return (
                        <div key={p.id} className="px-5 py-3 flex items-center gap-3">
                          <span className="text-lg">💸</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-gray-700 truncate">
                              <span className="font-semibold">{memberName(fromP)}</span>
                              <span className="text-gray-400 mx-1.5">→</span>
                              <span className="font-semibold">{memberName(toP)}</span>
                            </p>
                            <p className="text-xs text-gray-400">
                              {new Date(p.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </p>
                          </div>
                          <span className="text-sm font-bold text-emerald-600 shrink-0">{p.amount.toFixed(2)} €</span>
                          {isMyPayment && (
                            <button
                              onClick={() => removePayment(p.id)}
                              className="text-gray-300 hover:text-red-400 transition-colors text-sm shrink-0"
                              title="Annuler ce paiement"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── Modals ─────────────────────────────────────────────────────────── */}
      {showModal && (
        <ItemFormModal
          item={editingItem}
          onClose={() => { setShowModal(false); setEditingItem(null) }}
          onSave={handleSave}
          title="Ajouter à la collection commune"
        />
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 sm:p-4">
          <div className="bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl w-full sm:max-w-sm p-6">
            <div className="sm:hidden flex justify-center mb-4"><div className="w-10 h-1 bg-gray-200 rounded-full" /></div>
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4"><span className="text-2xl">🗑</span></div>
            <h3 className="text-lg font-bold text-gray-900 mb-1 text-center">Supprimer cet item ?</h3>
            <p className="text-gray-400 text-sm mb-6 text-center">
              <span className="font-semibold text-gray-600">"{deleteConfirm.name || 'Sans nom'}"</span> sera retiré de la collection commune.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="btn-secondary flex-1">Annuler</button>
              <button onClick={() => handleDelete(deleteConfirm)} className="btn-danger flex-1">Supprimer</button>
            </div>
          </div>
        </div>
      )}

      {showInvite && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 sm:p-4">
          <div className="bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl w-full sm:max-w-sm p-6">
            <div className="sm:hidden flex justify-center mb-4"><div className="w-10 h-1 bg-gray-200 rounded-full" /></div>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-gray-900">👤 Inviter un ami</h3>
              <button onClick={() => setShowInvite(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            {invitableFriends.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-4">Tous tes amis font déjà partie de cette collection.</p>
            ) : (
              <div className="space-y-2">
                {invitableFriends.map(f => {
                  const name = f.username || f.email
                  const initial = f.username?.[0]?.toUpperCase() || f.email?.[0]?.toUpperCase() || '?'
                  return (
                    <div key={f.id} className="flex items-center justify-between p-2.5 rounded-xl hover:bg-gray-50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-pokemon-blue rounded-full flex items-center justify-center text-white text-sm font-bold">{initial}</div>
                        <span className="text-sm font-medium text-gray-700">{name}</span>
                      </div>
                      <button onClick={() => inviteFriend(f.id)} disabled={inviteLoading} className="text-xs btn-primary py-1.5 px-3">Inviter</button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
