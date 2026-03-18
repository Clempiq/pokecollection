import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import WishlistFormModal from '../components/WishlistFormModal'

const PRIORITY_EMOJI = { low: '🟢', medium: '🟡', high: '🟠' }

export default function Wishlist() {
  const { user } = useAuth()
  const [items, setItems] = useState([])
  const [view, setView] = useState('grid')
  const [filterPriority, setFilterPriority] = useState(null)
  const [sortBy, setSortBy] = useState('priority')
  const [showFormModal, setShowFormModal] = useState(false)
  const [shareToken, setShareToken] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    fetchWishlist()
  }, [user])

  const fetchWishlist = async () => {
    const { data } = await supabase.from('wishlists').select('*').eq('user_id', user.id)
    setItems(data || [])
    const { data: profile } = await supabase.from('profiles').select('wishlist_share_token').eq('id', user.id).single()
    setShareToken(profile?.wishlist_share_token)
    setLoading(false)
  }

  const deleteWishlistItem = async (id) => {
    await supabase.from('wishlists').delete().eq('id', id)
    fetchWishlist()
  }

  const filteredItems = items.filter(i => !filterPriority || i.priority === filterPriority)
  const sortedItems = [...filteredItems].sort((a, b) => {
    if (sortBy === 'priority') return ['high', 'medium', 'low'].indexOf(b.priority) - ['high', 'medium', 'low'].indexOf(a.priority)
    return new Date(b.created_at) - new Date(a.created_at)
  })

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Ma Wishlist</h1>
          <p className="text-gray-500 text-sm mt-0.5">{items.length} article(s)</p>
        </div>
        <button onClick={() => setShowFormModal(true)} className="btn-primary">+ Ajouter</button>
      </div>

      <div className="flex gap-2 flex-wrap">
        <button onClick={() => setView('grid')} className={`text-sm px-3 py-2 rounded-lg transition-colors ${
          view === 'grid' ? 'bg-pokemon-blue text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
        }`}>Grille</button>
        <button onClick={() => setView('list')} className={`text-sm px-3 py-2 rounded-lg transition-colors ${
          view === 'list' ? 'bg-pokemon-blue text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
        }`}>Liste</button>
      </div>

      {showFormModal && <WishlistFormModal onClose={() => setShowFormModal(false)} onSuccess={() => { fetchWishlist(); setShowFormModal(false) }} />}

      {!loading && sortedItems.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-gray-400">Aucun article dans votre wishlist</p>
        </div>
      ) : (
        <div className={view === 'grid' ? 'grid grid-cols-2 md:grid-cols-3 gap-4' : 'space-y-3'}>
          {sortedItems.map(item => (
            <div key={item.id} className={`card p-4 ${view === 'list' ? 'flex items-center justify-between' : 'flex flex-col'}`}>
              {item.image_url && <img src={item.image_url} alt={item.name} className={`${view === 'list' ? 'w-12 h-12' : 'w-full h-24'} object-cover rounded mb-2`} />}
              <div className={view === 'list' ? 'flex-1 ml-4' : ''}>
                <p className="font-medium text-sm text-gray-900 line-clamp-2">{item.name}</p>
                {item.target_price && <p className="text-xs text-gray-500 mt-1">Cible: {item.target_price}€</p>}
              </div>
              <div className="flex items-center gap-2 mt-2">
                <span>{PRIORITY_EMOJI[item.priority]}</span>
                <button onClick={() => deleteWishlistItem(item.id)} className="text-xs text-red-500 hover:text-red-700">Supprimer</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
