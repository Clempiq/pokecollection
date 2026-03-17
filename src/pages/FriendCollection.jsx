import { useEffect, useState, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import ItemCard from '../components/ItemCard'
import { useItemOptions } from '../lib/itemOptions'

const WISH_PRIORITIES = {
  1: { label: 'Urgent',  emoji: '🔴', bg: 'bg-red-50',    text: 'text-red-600' },
  2: { label: 'Normal',  emoji: '🟡', bg: 'bg-yellow-50', text: 'text-yellow-600' },
  3: { label: 'Un jour', emoji: '🟢', bg: 'bg-green-50',  text: 'text-green-600' },
}

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

  // ── Wishlist comparison ───────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState('collection') // 'collection' | 'wishlist'
  const [friendWishlist, setFriendWishlist] = useState([])
  const [myItems, setMyItems] = useState([]) // my own collection for comparison

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

      // Fetch friend's wishlist (for comparison)
      const { data: wishData } = await supabase
        .from('wishlists')
        .select('id, name, set_name, item_type, priority, target_price, market_price, api_image_url, api_product_id, notes')
        .eq('user_id', friendId)
        .order('priority', { ascending: true })
        .order('created_at', { ascending: false })
      setFriendWishlist(wishData || [])

      // Fetch my own collection for comparison
      const { data: myColData } = await supabase
        .from('items')
        .select('name, set_name, api_product_id')
        .eq('user_id', user.id)
      setMyItems(myColData || [])

      setLoading(false)
    }
    fetchData()
  }, [friendId, user.id])

  const filtered = items
    .filter(i => filterType === 'Tous' || i.item_type === filterType)
    .filter(i =>
      !search ||
      (i.name || '').toLowerCase().includes(search.toLowerCase()) ||
      (i.set_name || '').toLowerCase().includes(search.toLowerCase())
    )

  const totalValue = items.reduce((s, i) => s + (i.current_value || 0) * i.quantity, 0)
  const totalItems = items.reduce((s, i) => s + i.quantity, 0)

  // Wishlist comparison helpers
  const myNamesSet = new Set(myItems.map(i => (i.name || '').toLowerCase().trim()))
  const myApiIdSet = new Set(myItems.map(i => i.api_product_id).filter(Boolean))
  const iOwn = useCallback((wish) => {
    if (wish.api_product_id && myApiIdSet.has(wish.api_product_id)) return true
    const n = (wish.name || '').toLowerCase().trim()
    return n.length > 0 && myNamesSet.has(n)
  }, [myItems])

  const ownedCount = friendWishlist.filter(iOwn).length

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

      {/* Tab switcher */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        <button
          onClick={() => setActiveTab('collection')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
            activeTab === 'collection' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          📦 Collection
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
            activeTab === 'collection' ? 'bg-blue-100 text-blue-700' : 'bg-gray-200 text-gray-500'
          }`}>{items.length}</span>
        </button>
        <button
          onClick={() => setActiveTab('wishlist')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
            activeTab === 'wishlist' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          ✨ Wishlist
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
            activeTab === 'wishlist' ? 'bg-blue-100 text-blue-700' : 'bg-gray-200 text-gray-500'
          }`}>{friendWishlist.length}</span>
        </button>
      </div>

      {/* ── COLLECTION TAB ─────────────────────────────────────────────── */}
      {activeTab === 'collection' && (
        <>
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
        </>
      )}

      {/* ── WISHLIST COMPARISON TAB ────────────────────────────────────── */}
      {activeTab === 'wishlist' && (
        <div className="space-y-5">
          {friendWishlist.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-14 text-center">
              <div className="text-5xl mb-3">✨</div>
              <p className="text-gray-500 font-medium">Sa wishlist est vide</p>
            </div>
          ) : (
            <>
              {/* Comparison summary */}
              {ownedCount > 0 && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-start gap-3">
                  <span className="text-2xl shrink-0">🎉</span>
                  <div>
                    <p className="font-semibold text-emerald-800">
                      Tu possèdes {ownedCount} item{ownedCount > 1 ? 's' : ''} de sa wishlist !
                    </p>
                    <p className="text-sm text-emerald-600 mt-0.5">
                      {friendWishlist.filter(iOwn).map(i => i.name || 'Item').join(', ')}
                    </p>
                  </div>
                </div>
              )}

              {/* Grouped by priority */}
              {Object.entries(WISH_PRIORITIES).map(([p, meta]) => {
                const group = friendWishlist.filter(i => i.priority === Number(p))
                if (group.length === 0) return null
                return (
                  <div key={p}>
                    <div className="flex items-center gap-2 mb-3">
                      <span>{meta.emoji}</span>
                      <h3 className="font-semibold text-gray-700 text-sm">{meta.label}</h3>
                      <span className="text-xs text-gray-400">({group.length})</span>
                    </div>
                    <div className="space-y-2">
                      {group.map(wish => {
                        const own = iOwn(wish)
                        return (
                          <div key={wish.id}
                            className={`bg-white rounded-xl border shadow-sm flex items-center gap-3 p-3 transition-all ${
                              own ? 'border-emerald-200 ring-1 ring-emerald-100' : 'border-gray-100'
                            }`}>
                            <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-50 shrink-0 flex items-center justify-center border border-gray-100">
                              {wish.api_image_url
                                ? <img src={wish.api_image_url} alt="" className="w-full h-full object-contain" />
                                : <span className="text-xl">📦</span>
                              }
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-gray-900 truncate">{wish.name || '—'}</p>
                              <p className="text-xs text-gray-400 truncate">{wish.set_name}</p>
                              {wish.item_type && (
                                <span className="text-[10px] text-gray-500 bg-gray-50 px-2 py-0.5 rounded-full border border-gray-100 font-medium">
                                  {wish.item_type}
                                </span>
                              )}
                            </div>
                            <div className="shrink-0 flex flex-col items-end gap-1">
                              {own && (
                                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full whitespace-nowrap">
                                  ✅ Tu possèdes
                                </span>
                              )}
                              {wish.target_price && (
                                <span className="text-xs font-medium text-gray-500 whitespace-nowrap">
                                  {Number(wish.target_price).toFixed(2)} €
                                </span>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </>
          )}
        </div>
      )}
    </div>
  )
}
