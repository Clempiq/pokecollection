import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import ItemCard from '../components/ItemCard'

const ITEM_TYPES = ['Tous', 'Booster Box', 'Elite Trainer Box', 'Tin', 'Booster Pack', 'Display', 'Collection Box', 'Autre']

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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/friends" className="text-gray-400 hover:text-gray-600 transition-colors text-sm">← Amis</Link>
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-pokemon-blue rounded-full flex items-center justify-center text-white font-bold">
              {friendProfile?.username?.[0]?.toUpperCase()}
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">@{friendProfile?.username}</h1>
              <p className="text-gray-400 text-xs">{totalItems} items · {totalValue.toFixed(2)} € de valeur</p>
            </div>
          </div>
        </div>
        <Link
          to="/shared"
          className="text-sm bg-pokemon-yellow hover:bg-yellow-400 text-pokemon-blue font-semibold px-4 py-2 rounded-lg transition-colors"
        >
          🤝 Collections communes
        </Link>
      </div>

      {/* Shared collections shortcut */}
      {sharedCollections.length > 0 && (
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex flex-wrap gap-2 items-center">
          <span className="text-sm text-blue-600 font-medium">Collections communes avec @{friendProfile?.username} :</span>
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
        {ITEM_TYPES.map(type => (
          <button
            key={type}
            onClick={() => setFilterType(type)}
            className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${
              filterType === type ? 'bg-pokemon-blue text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {type}
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
            // Reuse ItemCard but without edit/delete actions (pass noop functions)
            <ItemCard
              key={item.id}
              item={item}
              onEdit={() => {}}
              onDelete={() => {}}
              readOnly
            />
          ))}
        </div>
      )}
    </div>
  )
}
