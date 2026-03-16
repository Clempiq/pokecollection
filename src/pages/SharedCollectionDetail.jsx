import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import ItemFormModal from '../components/ItemFormModal'
import { useItemOptions } from '../lib/itemOptions'

// Shared type style helper (mirrors ItemCard)
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

export default function SharedCollectionDetail() {
  const { collectionId } = useParams()
  const { user } = useAuth()
  const [collection, setCollection] = useState(null)
  const [items, setItems] = useState([])
  const [members, setMembers] = useState([])
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

  const { conditionColor } = useItemOptions()

  const fetchData = async () => {
    const { data: membership } = await supabase
      .from('shared_collection_members')
      .select('role')
      .eq('collection_id', collectionId)
      .eq('user_id', user.id)
      .single()

    if (!membership) {
      setNotAuthorized(true)
      setLoading(false)
      return
    }

    const { data: coll } = await supabase
      .from('shared_collections')
      .select('*')
      .eq('id', collectionId)
      .single()
    setCollection(coll)

    const { data: membersData } = await supabase
      .from('shared_collection_members')
      .select('user_id, role, profiles(id, first_name, last_name, email)')
      .eq('collection_id', collectionId)
    setMembers(membersData || [])

    const profileMap = {}
    membersData?.forEach(m => { profileMap[m.user_id] = m.profiles })
    setUserProfiles(profileMap)

    const { data: itemsData } = await supabase
      .from('shared_collection_items')
      .select('*')
      .eq('collection_id', collectionId)
      .order('created_at', { ascending: false })
    setItems(itemsData || [])
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [collectionId])

  const openInvite = async () => {
    const { data: friendships } = await supabase
      .from('friendships')
      .select(`
        requester_id, addressee_id,
        requester:profiles!friendships_requester_id_fkey(id, first_name, last_name, email),
        addressee:profiles!friendships_addressee_id_fkey(id, first_name, last_name, email)
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
    await supabase.from('shared_collection_members').insert({
      collection_id: collectionId, user_id: friendId, role: 'member'
    })
    setShowInvite(false)
    fetchData()
    setInviteLoading(false)
  }

  const handleSave = async (formData) => {
    if (editingItem) {
      const { error } = await supabase
        .from('shared_collection_items')
        .update(formData)
        .eq('id', editingItem.id)
        .eq('user_id', user.id)
      if (!error) setItems(prev => prev.map(i => i.id === editingItem.id ? { ...i, ...formData } : i))
    } else {
      const { data, error } = await supabase
        .from('shared_collection_items')
        .insert({ ...formData, collection_id: collectionId, user_id: user.id })
        .select()
        .single()
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

  const totalValue = items.reduce((s, i) => s + (i.current_value || 0) * (i.quantity || 1), 0)
  const totalBuy = items.reduce((s, i) => s + (i.purchase_price || 0) * (i.quantity || 1), 0)
  const totalPnl = totalBuy > 0 ? totalValue - totalBuy : null
  const totalUnits = items.reduce((s, i) => s + (i.quantity || 1), 0)
  const isOwner = collection?.created_by === user.id

  const filtered = filterUser === 'all' ? items : items.filter(i => i.user_id === filterUser)

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
    <div className="space-y-6">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <Link to="/shared" className="text-gray-400 hover:text-gray-600 transition-colors text-sm mt-1">← Communes</Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900">🤝 {collection?.name}</h1>
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
            <button onClick={openInvite} className="btn-secondary text-sm">
              👤 Inviter
            </button>
          )}
          <button
            onClick={() => { setEditingItem(null); setShowModal(true) }}
            className="btn-primary"
          >
            + Ajouter
          </button>
        </div>
      </div>

      {/* ── Members pills ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide mr-1">Membres :</span>
        <button
          onClick={() => setFilterUser('all')}
          className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${
            filterUser === 'all' ? 'bg-pokemon-blue text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Tous
        </button>
        {members.map(m => {
          const p = m.profiles
          const name = p ? ([p.first_name, p.last_name].filter(Boolean).join(' ') || p.email) : '?'
          const initials = p?.first_name?.[0]?.toUpperCase() || p?.email?.[0]?.toUpperCase() || '?'
          return (
            <button
              key={m.user_id}
              onClick={() => setFilterUser(prev => prev === m.user_id ? 'all' : m.user_id)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                filterUser === m.user_id
                  ? 'bg-pokemon-blue text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <div className={`w-4 h-4 rounded-full flex items-center justify-center text-white text-[9px] font-bold ${
                m.user_id === user.id ? 'bg-pokemon-red' : 'bg-pokemon-blue'
              }`}>
                {initials}
              </div>
              {name}
              {m.role === 'owner' && <span className="text-yellow-400 ml-0.5">★</span>}
              {m.user_id === user.id && <span className="opacity-50 ml-0.5">(moi)</span>}
            </button>
          )
        })}
      </div>

      {/* ── Items grid ── */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-14 text-center">
          <div className="text-5xl mb-4">📦</div>
          <p className="text-gray-600 font-semibold">
            {filterUser !== 'all' ? "Cet ami n'a pas encore ajouté d'items" : 'La collection est vide'}
          </p>
          {filterUser === 'all' && (
            <button
              onClick={() => { setEditingItem(null); setShowModal(true) }}
              className="btn-primary inline-block mt-4"
            >
              + Ajouter le premier item
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered.map(item => {
            const contributor = userProfiles[item.user_id]
            const isMyItem = item.user_id === user.id
            const style = getTypeStyle(item.item_type)
            const totalBuyItem = item.purchase_price ? item.purchase_price * item.quantity : null
            const totalValItem = item.current_value ? item.current_value * item.quantity : null
            const pnl = totalBuyItem !== null && totalValItem !== null ? totalValItem - totalBuyItem : null
            const pnlPct = pnl !== null && totalBuyItem > 0 ? (pnl / totalBuyItem) * 100 : null
            const contribName = contributor
              ? ([contributor.first_name, contributor.last_name].filter(Boolean).join(' ') || contributor.email)
              : '?'
            const contribInitial = contributor?.first_name?.[0]?.toUpperCase() || contributor?.email?.[0]?.toUpperCase() || '?'

            return (
              <div key={item.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-lg transition-all duration-200 group flex flex-col">

                {/* Gradient header */}
                <div className="relative h-24 shrink-0 overflow-hidden" style={{ background: style.bg }}>
                  <div
                    className="absolute inset-0 opacity-10"
                    style={{
                      backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.8) 1px, transparent 1px)',
                      backgroundSize: '14px 14px',
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-br from-white/15 to-transparent" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-4xl opacity-80 select-none drop-shadow-sm">{style.icon}</span>
                  </div>
                  {item.quantity > 1 && (
                    <div className="absolute top-2.5 right-2.5 bg-black/30 backdrop-blur-sm text-white text-xs font-bold px-2 py-0.5 rounded-full">
                      ×{item.quantity}
                    </div>
                  )}
                  <div className="absolute bottom-2.5 left-2.5">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${conditionColor(item.condition)}`}>
                      {item.condition}
                    </span>
                  </div>
                  {/* Contributor avatar — top left only for non-owner */}
                  <div className="absolute top-2.5 left-2.5">
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold shadow ${
                        isMyItem ? 'bg-pokemon-red' : 'bg-white/30 backdrop-blur-sm'
                      }`}
                      title={contribName}
                    >
                      {contribInitial}
                    </div>
                  </div>
                  {/* Edit/Delete overlay */}
                  {isMyItem && (
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-150 flex items-center justify-center gap-2">
                      <button
                        onClick={() => { setEditingItem(item); setShowModal(true) }}
                        className="bg-white/95 text-gray-800 text-xs font-semibold px-3 py-1.5 rounded-xl hover:bg-white shadow-sm"
                      >
                        ✏️ Modifier
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(item)}
                        className="bg-red-500/90 text-white text-xs font-semibold px-3 py-1.5 rounded-xl hover:bg-red-500 shadow-sm"
                      >
                        🗑 Supprimer
                      </button>
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="flex flex-col flex-1 px-4 pt-3 pb-4 gap-2.5">
                  <div>
                    <h3 className="font-bold text-gray-900 text-sm leading-snug line-clamp-2 mb-0.5">{item.name}</h3>
                    <p className="text-xs text-gray-400 leading-tight truncate">{item.set_name}</p>
                    {item.variant_notes && (
                      <p className="text-[10px] italic mt-0.5 truncate font-medium" style={{ color: style.accent }}>
                        ✦ {item.variant_notes}
                      </p>
                    )}
                  </div>

                  <span
                    className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full self-start"
                    style={{ backgroundColor: style.light, color: style.text }}
                  >
                    {style.icon} {item.item_type}
                  </span>

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
                              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                                pnl >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'
                              }`}>
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
      )}

      {/* ── Modals ── */}
      {showModal && (
        <ItemFormModal
          item={editingItem}
          onClose={() => { setShowModal(false); setEditingItem(null) }}
          onSave={handleSave}
        />
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">🗑</span>
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-1 text-center">Supprimer cet item ?</h3>
            <p className="text-gray-400 text-sm mb-6 text-center">
              <span className="font-semibold text-gray-600">"{deleteConfirm.name}"</span> sera retiré de la collection commune.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="btn-secondary flex-1">Annuler</button>
              <button onClick={() => handleDelete(deleteConfirm)} className="btn-danger flex-1">Supprimer</button>
            </div>
          </div>
        </div>
      )}

      {showInvite && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-gray-900">👤 Inviter un ami</h3>
              <button onClick={() => setShowInvite(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            {invitableFriends.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-4">
                Tous tes amis font déjà partie de cette collection.
              </p>
            ) : (
              <div className="space-y-2">
                {invitableFriends.map(f => {
                  const name = [f.first_name, f.last_name].filter(Boolean).join(' ') || f.email
                  const initial = f.first_name?.[0]?.toUpperCase() || f.email?.[0]?.toUpperCase() || '?'
                  return (
                    <div key={f.id} className="flex items-center justify-between p-2.5 rounded-xl hover:bg-gray-50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-pokemon-blue rounded-full flex items-center justify-center text-white text-sm font-bold">
                          {initial}
                        </div>
                        <span className="text-sm font-medium text-gray-700">{name}</span>
                      </div>
                      <button
                        onClick={() => inviteFriend(f.id)}
                        disabled={inviteLoading}
                        className="text-xs btn-primary py-1.5 px-3"
                      >
                        Inviter
                      </button>
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
