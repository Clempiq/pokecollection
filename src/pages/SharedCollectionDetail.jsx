import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import ItemFormModal from '../components/ItemFormModal'

const TYPE_ICONS = {
  'Booster Box': '📦', 'Coffret Dresseur Élite': '🎁', 'Boîte Métal': '🥫',
  'Booster': '🃏', 'Display': '🗃️', 'Coffret Collection': '📫', 'Autre': '✨',
}

const CONDITION_COLORS = {
  'Mint': 'bg-green-100 text-green-700',
  'Near Mint': 'bg-emerald-100 text-emerald-700',
  'Lightly Played': 'bg-yellow-100 text-yellow-700',
  'Moderately Played': 'bg-orange-100 text-orange-700',
  'Heavily Played': 'bg-red-100 text-red-700',
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

  const fetchData = async () => {
    // Verify membership
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

    // Collection info
    const { data: coll } = await supabase
      .from('shared_collections')
      .select('*')
      .eq('id', collectionId)
      .single()
    setCollection(coll)

    // Members
    const { data: membersData } = await supabase
      .from('shared_collection_members')
      .select('user_id, role, profiles(id, username, email)')
      .eq('collection_id', collectionId)
    setMembers(membersData || [])

    const profileMap = {}
    membersData?.forEach(m => { profileMap[m.user_id] = m.profiles })
    setUserProfiles(profileMap)

    // Items
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
    // Get my friends who are NOT already members
    const { data: friendships } = await supabase
      .from('friendships')
      .select(`
        requester_id, addressee_id,
        requester:profiles!friendships_requester_id_fkey(id, username),
        addressee:profiles!friendships_addressee_id_fkey(id, username)
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

  const totalValue = items.reduce((s, i) => s + (i.current_value || 0) * i.quantity, 0)
  const totalItems = items.reduce((s, i) => s + i.quantity, 0)
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/shared" className="text-gray-400 hover:text-gray-600 text-sm">← Collections communes</Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900">🤝 {collection?.name}</h1>
            <p className="text-gray-400 text-xs mt-0.5">{totalItems} items · {totalValue.toFixed(2)} € de valeur</p>
          </div>
        </div>
        <div className="flex gap-2">
          {isOwner && (
            <button onClick={openInvite} className="btn-secondary text-sm">
              👤 Inviter
            </button>
          )}
          <button
            onClick={() => { setEditingItem(null); setShowModal(true) }}
            className="btn-primary"
          >
            + Ajouter un item
          </button>
        </div>
      </div>

      {/* Members */}
      <div className="card p-4 flex flex-wrap items-center gap-3">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Membres :</span>
        {members.map(m => (
          <button
            key={m.user_id}
            onClick={() => setFilterUser(prev => prev === m.user_id ? 'all' : m.user_id)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              filterUser === m.user_id
                ? 'bg-pokemon-blue text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <div className={`w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-bold ${
              m.user_id === user.id ? 'bg-pokemon-red' : 'bg-pokemon-blue'
            }`}>
              {m.profiles?.username?.[0]?.toUpperCase()}
            </div>
            @{m.profiles?.username}
            {m.role === 'owner' && <span className="text-yellow-400">★</span>}
            {m.user_id === user.id && <span className="opacity-60">(moi)</span>}
          </button>
        ))}
        {filterUser !== 'all' && (
          <button onClick={() => setFilterUser('all')} className="text-xs text-gray-400 hover:text-gray-600">
            Voir tous
          </button>
        )}
      </div>

      {/* Items grid */}
      {filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="text-5xl mb-4">📦</div>
          <p className="text-gray-500 font-medium">
            {filterUser !== 'all' ? 'Cet ami n\'a pas encore ajouté d\'items' : 'La collection est vide'}
          </p>
          {filterUser === 'all' && (
            <button
              onClick={() => { setEditingItem(null); setShowModal(true) }}
              className="btn-primary inline-block mt-4"
            >
              Ajouter le premier item
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered.map(item => {
            const contributor = userProfiles[item.user_id]
            const isMyItem = item.user_id === user.id
            const pnl = item.current_value && item.purchase_price
              ? (item.current_value - item.purchase_price) * item.quantity : null

            return (
              <div key={item.id} className="card overflow-hidden hover:shadow-md transition-shadow group">
                {/* Image */}
                <div className="h-36 bg-gradient-to-br from-blue-50 to-gray-100 relative overflow-hidden">
                  {item.image_url ? (
                    <img src={item.image_url} alt={item.name} className="w-full h-full object-cover"
                      onError={e => { e.target.style.display = 'none' }} />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-4xl">
                      {TYPE_ICONS[item.item_type] || '✨'}
                    </div>
                  )}
                  {item.quantity > 1 && (
                    <div className="absolute top-2 right-2 bg-pokemon-blue text-white text-xs font-bold px-2 py-0.5 rounded-full">
                      x{item.quantity}
                    </div>
                  )}
                  {/* Actions for own items */}
                  {isMyItem && (
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <button onClick={() => { setEditingItem(item); setShowModal(true) }}
                        className="bg-white text-gray-800 text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-gray-100">
                        Modifier
                      </button>
                      <button onClick={() => setDeleteConfirm(item)}
                        className="bg-red-500 text-white text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-red-600">
                        Supprimer
                      </button>
                    </div>
                  )}
                </div>
                {/* Content */}
                <div className="p-3">
                  {/* Contributor badge */}
                  <div className="flex items-center gap-1.5 mb-2">
                    <div className={`w-4 h-4 rounded-full flex items-center justify-center text-white text-xs font-bold ${
                      isMyItem ? 'bg-pokemon-red' : 'bg-pokemon-blue'
                    }`}>
                      {contributor?.username?.[0]?.toUpperCase()}
                    </div>
                    <span className="text-xs text-gray-400">@{contributor?.username}</span>
                  </div>
                  <h3 className="font-semibold text-gray-900 text-sm leading-tight mb-0.5 line-clamp-1">{item.name}</h3>
                  <p className="text-xs text-gray-400 mb-2">{item.set_name}</p>
                  <div className="flex flex-wrap gap-1 mb-2">
                    <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">{item.item_type}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded-full ${CONDITION_COLORS[item.condition] || 'bg-gray-100 text-gray-600'}`}>
                      {item.condition}
                    </span>
                  </div>
                  {(item.purchase_price || item.current_value) && (
                    <div className="border-t border-gray-100 pt-2 space-y-0.5">
                      {item.purchase_price && (
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-400">Achat</span>
                          <span className="text-gray-600">{(item.purchase_price * item.quantity).toFixed(2)} €</span>
                        </div>
                      )}
                      {pnl !== null && (
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-400">P&L</span>
                          <span className={`font-bold ${pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {pnl >= 0 ? '+' : ''}{pnl.toFixed(2)} €
                          </span>
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

      {/* Modals */}
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
            <h3 className="text-lg font-bold text-gray-900 mb-2">Supprimer cet item ?</h3>
            <p className="text-gray-500 text-sm mb-6">
              <span className="font-medium text-gray-700">"{deleteConfirm.name}"</span> sera retiré de la collection commune.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="btn-secondary flex-1">Annuler</button>
              <button onClick={() => handleDelete(deleteConfirm)} className="btn-danger flex-1">Supprimer</button>
            </div>
          </div>
        </div>
      )}
      {/* Invite modal */}
      {showInvite && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">Inviter un ami</h3>
              <button onClick={() => setShowInvite(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            {invitableFriends.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-4">
                Tous tes amis font déjà partie de cette collection.
              </p>
            ) : (
              <div className="space-y-2">
                {invitableFriends.map(f => (
                  <div key={f.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-pokemon-blue rounded-full flex items-center justify-center text-white text-xs font-bold">
                        {f.username?.[0]?.toUpperCase()}
                      </div>
                      <span className="text-sm font-medium text-gray-700">@{f.username}</span>
                    </div>
                    <button
                      onClick={() => inviteFriend(f.id)}
                      disabled={inviteLoading}
                      className="text-xs btn-primary py-1 px-3"
                    >
                      Inviter
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
