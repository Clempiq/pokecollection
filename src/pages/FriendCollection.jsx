import { useEffect, useState, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import ItemCard from '../components/ItemCard'
import { useItemOptions } from '../lib/itemOptions'

export default function FriendCollection() {
  const { friendId } = useParams()
  const { user } = useAuth()
  const [friendProfile, setFriendProfile] = useState(null)
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [notAuthorized, setNotAuthorized] = useState(false)
  const [filterType, setFilterType] = useState('Tous')
  const [search, setSearch] = useState('')
  const [sharedCollections, setSharedCollections] = useState([])
  const [likedItemIds, setLikedItemIds] = useState(new Set())
  const [likeCounts, setLikeCounts] = useState({}) // item_id → count
  const [likingId, setLikingId] = useState(null)
  const { types } = useItemOptions()

  useEffect(() => {
    async function fetchData() {
      // Verify friendship
      const { data: friendship } = await supabase
        .from('friendships')
        .select('id')
        .eq('status', 'accepted')
        .or(
          `and(requester_id.eq.${user.id},addressee_id.eq.${friendId}),and(requester_id.eq.${friendId},addressee_id.eq.${user.id})`
        )
        .single()

      if (!friendship) {
        setNotAuthorized(true)
        setLoading(false)
        return
      }

      // Fetch friend profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, username, email')
        .eq('id', friendId)
        .single()
      setFriendProfile(profile)

      // Fetch friend's items (allowed via RLS)
      const { data: itemsData } = await supabase
        .from('items')
        .select('*')
        .eq('user_id', friendId)
        .order('created_at', { ascending: false })
      setItems(itemsData || [])

      // Fetch which items I've already liked
      const itemIds = (itemsData || []).map(i => i.id)
      if (itemIds.length > 0) {
        const { data: myLikes } = await supabase
          .from('item_likes')
          .select('item_id')
          .eq('user_id', user.id)
          .in('item_id', itemIds)
        setLikedItemIds(new Set((myLikes || []).map(l => l.item_id)))

        const { data: allLikes } = await supabase
          .from('item_likes')
          .select('item_id')
          .in('item_id', itemIds)
        const counts = {}
        ;(allLikes || []).forEach(l => { counts[l.item_id] = (counts[l.item_id] || 0) + 1 })
        setLikeCounts(counts)
      }

      // Fetch shared collections between us
      const { data: collsData } = await supabase
        .from('shared_collection_members')
        .select('collection_id, shared_collections(id, name)')
        .eq('user_id', user.id)
      const myCollIds = collsData?.map(c => c.collection_id) || []

      if (myCollIds.length > 0) {
        const { data: friendColls } = await supabase
          .from('shared_collection_members')
          .select('collection_id, shared_collections(id, name)')
          .eq('user_id', friendId)
          .in('collection_id', myCollIds)
        setSharedCollections(friendColls?.map(c => c.shared_collections) || [])
      }

      setLoading(false)
    }
    fetchData()
  }, [friendId, user.id])

  const filtered = items
    .filter(i => filterType === 'Tous' || i.item_type === filterType)
    .filter(i =>
      !search ||
      i.name.toLowerCase().includes(search.toLowerCase()) ||
      i.set_name.toLowerCase().includes(search.toLowerCase())
    )

  const totalValue = items.reduce((s, i) => s + (i.current_value || 0) * i.quantity, 0)
  const totalItems = items.reduce((s, i) => s + i.quantity, 0)

  const toggleLike = async (itemId) => {
    if (likingId === itemId) return
    setLikingId(itemId)
    const isLiked = likedItemIds.has(itemId)

    if (isLiked) {
      await supabase.from('item_likes').delete().eq('user_id', user.id).eq('item_id', itemId)
      setLikedItemIds(prev => { const s = new Set(prev); s.delete(itemId); return s })
      setLikeCounts(prev => ({ ...prev, [itemId]: Math.max(0, (prev[itemId] || 1) - 1) }))
    } else {
      await supabase.from('item_likes').insert({ user_id: user.id, item_id: itemId })
      setLikedItemIds(prev => new Set([...prev, itemId]))
      setLikeCounts(prev => ({ ...prev, [itemId]: (prev[itemId] || 0) + 1 }))
    }
    setLikingId(null)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-pokemon-red border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  if (notAuthorized) {
    return (
      <div className="text-center py-20">
        <div className="text-5xl mb-4">🔒</div>
        <p className="text-gray-500 font-medium">Tu n'as pas accès à cette collection</p>
        <Link to="/friends" className="btn-primary inline-block mt-4">Retour aux amis</Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Link to="/friends" className="text-gray-400 hover:text-gray-600 transition-colors text-sm shrink-0">← Amis</Link>
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 bg-pokemon-blue rounded-full flex items-center justify-center text-white font-bold shrink-0">
              {friendProfile?.username?.[0]?.toUpperCase() || friendProfile?.email?.[0]?.toUpperCase()}
            </div>
            <div className="min-w-0">
              <h1 className="text-base sm:text-xl font-bold text-gray-900 truncate">
                @{friendProfile?.username || friendProfile?.email}
              </h1>
              <p className="text-gray-400 text-xs">{totalItems} items · {totalValue.toFixed(2)} €</p>
            </div>
          </div>
        </div>
        <Link
          to="/shared"
          className="text-xs sm:text-sm bg-pokemon-yellow hover:bg-yellow-400 text-pokemon-blue font-semibold px-3 py-2 rounded-lg transition-colors shrink-0 whitespace-nowrap"
        >
          🤝 <span className="hidden sm:inline">Collections </span>Communes
        </Link>
      </div>

      {/* Shared collections shortcut */}
      {sharedCollections.length > 0 && (
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex flex-wrap gap-2 items-center">
          <span className="text-sm text-blue-600 font-medium">
            Collections communes avec @{friendProfile?.username || friendProfile?.email} :
          </span>
          {sharedCollections.map(c => (
            <Link
              key={c.id}
              to={`/shared/${c.id}`}
              className="text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 font-medium px-3 py-1 rounded-full transition-colors"
            >
              {c.name} →
            </Link>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          placeholder="Rechercher..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="input-field flex-1 max-w-sm"
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setFilterType('Tous')}
          className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${
            filterType === 'Tous' ? 'bg-pokemon-blue text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Tous
        </button>
        {types.map(t => (
          <button
            key={t.id}
            onClick={() => setFilterType(t.label)}
            className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${
              filterType === t.label ? 'bg-pokemon-blue text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Grid (read-only — no edit/delete buttons) */}
      {filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="text-5xl mb-4">📦</div>
          <p className="text-gray-500 font-medium">
            {search || filterType !== 'Tous' ? 'Aucun item trouvé' : 'Cette collection est vide'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered.map(item => (
            <ItemCard
              key={item.id}
              item={item}
              onEdit={() => {}}
              onDelete={() => {}}
              readOnly
              likeCount={likeCounts[item.id] || 0}
              isLiked={likedItemIds.has(item.id)}
              onLike={() => toggleLike(item.id)}
              likeLoading={likingId === item.id}
            />
          ))}
        </div>
      )}
    </div>
  )
}
