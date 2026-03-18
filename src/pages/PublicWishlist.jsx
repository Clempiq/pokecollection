import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

const PRIORITY_EMOJI = { low: '🟢', medium: '🟡', high: '🟠' }

export default function PublicWishlist() {
  const { token } = useParams()
  const { user } = useAuth()
  const [wishlist, setWishlist] = useState(null)
  const [ownedItems, setOwnedItems] = useState(new Set())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchWishlist = async () => {
      try {
        const { data, error: err } = await supabase.rpc('get_public_wishlist', { token })
        if (err) throw err
        if (!data) {
          setError('Wishlist non trouvée')
          return
        }
        setWishlist(data)

        if (user) {
          const { data: items } = await supabase
            .from('items')
            .select('product_id')
            .eq('user_id', user.id)
          setOwnedItems(new Set(items?.map(i => i.product_id) || []))
        }
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    fetchWishlist()
  }, [token, user])

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-pokemon-red border-t-transparent rounded-full animate-spin"></div></div>
  if (error) return <div className="max-w-2xl mx-auto p-6 bg-red-50 border border-red-200 text-red-700 rounded-lg">{error}</div>
  if (!wishlist) return <div className="max-w-2xl mx-auto p-6 text-gray-400">Aucun résultat</div>

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Wishlist de {wishlist.username || wishlist.email}</h1>
      <div className="space-y-3">
        {wishlist.items?.map(item => (
          <div key={item.id} className="card p-4 flex items-center justify-between">
            <div className="flex items-center gap-4 flex-1">
              {item.image_url && <img src={item.image_url} alt={item.name} className="w-12 h-12 object-cover rounded" />}
              <div className="flex-1">
                <p className="font-medium text-gray-900">{item.name}</p>
                {item.target_price && <p className="text-xs text-gray-500">Cible: {item.target_price}€</p>}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-lg">{PRIORITY_EMOJI[item.priority]}</span>
              {user && ownedItems.has(item.product_id) && <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">Vous l'avez</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
