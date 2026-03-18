<<<<<<< HEAD
/**
 * PublicWishlist — page publique accessible sans compte.
 * URL : /w/:token
 *
 * - Affiche la wishlist d'un utilisateur via son share token.
 * - Si le visiteur est connecté, compare sa collection avec la wishlist
 *   et affiche "✅ Tu possèdes" sur les items qu'il a déjà.
 */
import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

const PRIORITIES = {
  1: { label: 'Urgent',  emoji: '🔴', bg: 'bg-red-50',    text: 'text-red-600',    border: 'border-red-200' },
  2: { label: 'Normal',  emoji: '🟡', bg: 'bg-yellow-50', text: 'text-yellow-600', border: 'border-yellow-200' },
  3: { label: 'Un jour', emoji: '🟢', bg: 'bg-green-50',  text: 'text-green-600',  border: 'border-green-200' },
}

function getTypeStyle(type) {
  const t = (type || '').toLowerCase()
  if (t.includes('display') || t.includes('booster box')) return { bg: 'bg-violet-100', text: 'text-violet-700' }
  if (t.includes('etb') || t.includes('elite'))           return { bg: 'bg-red-100',    text: 'text-red-700' }
  if (t.includes('coffret') || t.includes('collection'))  return { bg: 'bg-amber-100',  text: 'text-amber-700' }
  if (t.includes('tin'))                                  return { bg: 'bg-cyan-100',   text: 'text-cyan-700' }
  if (t.includes('blister') || t.includes('pack'))        return { bg: 'bg-emerald-100',text: 'text-emerald-700' }
  if (t.includes('starter') || t.includes('deck'))       return { bg: 'bg-orange-100', text: 'text-orange-700' }
  return { bg: 'bg-blue-100', text: 'text-blue-700' }
}

export default function PublicWishlist() {
  const { token } = useParams()
  const { user }  = useAuth()

  const [items, setItems]       = useState([])
  const [owner, setOwner]       = useState(null)   // { username, email }
  const [loading, setLoading]   = useState(true)
  const [notFound, setNotFound] = useState(false)

  // My collection items (only if logged in), for comparison
  const [myItems, setMyItems]   = useState([])

  useEffect(() => {
    async function load() {
      setLoading(true)

      // Fetch owner info
      const { data: ownerData } = await supabase.rpc('get_wishlist_owner', { p_token: token })
      if (!ownerData || ownerData.length === 0) {
        setNotFound(true)
        setLoading(false)
        return
      }
      setOwner(ownerData[0])

      // Fetch wishlist items via RPC
      const { data: wishData } = await supabase.rpc('get_public_wishlist', { p_token: token })
      setItems(wishData || [])

      // If logged in, fetch my collection for comparison
      if (user) {
        const { data: colData } = await supabase
          .from('items')
          .select('name, set_name, api_product_id')
          .eq('user_id', user.id)
        setMyItems(colData || [])
      }

      setLoading(false)
    }
    load()
  }, [token, user])

  // Build a quick lookup set for "do I own this?"
  const myNamesSet = new Set(myItems.map(i => (i.name || '').toLowerCase().trim()))
  const myApiIdSet = new Set(myItems.map(i => i.api_product_id).filter(Boolean))

  const iOwn = (item) => {
    if (item.api_product_id && myApiIdSet.has(item.api_product_id)) return true
    const n = (item.name || '').toLowerCase().trim()
    return n.length > 0 && myNamesSet.has(n)
  }

  const ownerName = owner?.username || owner?.email?.split('@')[0] || 'Quelqu\'un'

  const grouped = Object.entries(PRIORITIES).map(([p, meta]) => ({
    ...meta,
    priority: Number(p),
    items: items.filter(i => i.priority === Number(p)),
  })).filter(g => g.items.length > 0)

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-pokemon-red border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="text-6xl mb-4">🔒</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Wishlist introuvable</h1>
        <p className="text-gray-500 mb-6">Ce lien est invalide ou le partage a été désactivé.</p>
        <Link to="/" className="btn-primary">← Retour à l'accueil</Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-5 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-2xl">🎁</span>
              <h1 className="text-xl font-bold text-gray-900">
                Wishlist de <span className="text-pokemon-blue">{ownerName}</span>
              </h1>
            </div>
            <p className="text-sm text-gray-400">
              {items.length} item{items.length !== 1 ? 's' : ''} sur la liste
              {user && (
                <span className="ml-2 text-emerald-600 font-medium">
                  · Tu possèdes {items.filter(iOwn).length} de ces items ✅
                </span>
              )}
            </p>
          </div>
          {!user && (
            <Link to="/login"
              className="text-sm font-semibold text-pokemon-blue border border-pokemon-blue/30 px-4 py-2 rounded-xl hover:bg-blue-50 transition-colors">
              Connexion
            </Link>
          )}
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-8">

        {/* Comparison banner when logged in */}
        {user && items.filter(iOwn).length > 0 && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-start gap-3">
            <span className="text-2xl shrink-0">🎉</span>
            <div>
              <p className="font-semibold text-emerald-800">
                Tu as déjà {items.filter(iOwn).length} item{items.filter(iOwn).length > 1 ? 's' : ''} de sa wishlist !
              </p>
              <p className="text-sm text-emerald-600 mt-0.5">
                {items.filter(iOwn).map(i => i.name || 'Item sans nom').join(', ')}
              </p>
            </div>
          </div>
        )}

        {items.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-14 text-center">
            <div className="text-5xl mb-3">✨</div>
            <p className="text-gray-500 font-medium">La wishlist est vide pour l'instant</p>
          </div>
        ) : (
          grouped.map(group => (
            <div key={group.priority}>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">{group.emoji}</span>
                <h2 className="font-bold text-gray-700">{group.label}</h2>
                <span className="text-xs text-gray-400 font-medium">({group.items.length})</span>
              </div>
              <div className="space-y-3">
                {group.items.map(item => {
                  const own = iOwn(item)
                  const typeStyle = getTypeStyle(item.item_type)
                  return (
                    <div key={item.id}
                      className={`bg-white rounded-2xl border shadow-sm overflow-hidden flex gap-0 transition-all ${
                        own ? 'border-emerald-200 ring-1 ring-emerald-200' : 'border-gray-100'
                      }`}>
                      {/* Image */}
                      <div className="w-16 sm:w-20 bg-gray-50 flex items-center justify-center shrink-0 border-r border-gray-100">
                        {item.api_image_url
                          ? <img src={item.api_image_url} alt="" className="w-full h-full object-contain p-1" />
                          : <span className="text-3xl">📦</span>
                        }
                      </div>

                      {/* Content */}
                      <div className="flex-1 p-3 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-semibold text-gray-900 truncate text-sm leading-snug">
                              {item.name || <span className="italic text-gray-400">Sans nom</span>}
                            </p>
                            {item.set_name && (
                              <p className="text-xs text-gray-400 truncate">{item.set_name}</p>
                            )}
                          </div>
                          <div className="shrink-0 flex flex-col items-end gap-1">
                            {own && (
                              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full whitespace-nowrap">
                                ✅ Tu possèdes
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 mt-2">
                          {item.item_type && (
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${typeStyle.bg} ${typeStyle.text}`}>
                              {item.item_type}
                            </span>
                          )}
                          {item.target_price && (
                            <span className="text-[10px] font-medium text-gray-500 bg-gray-50 border border-gray-100 px-2 py-0.5 rounded-full">
                              Budget : {Number(item.target_price).toFixed(2)} €
                            </span>
                          )}
                          {item.market_price && (
                            <span className="text-[10px] font-medium text-blue-600 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-full">
                              CM FR : {Number(item.market_price).toFixed(2)} €
                            </span>
                          )}
                        </div>

                        {item.notes && (
                          <p className="text-xs text-gray-400 mt-1.5 italic truncate">{item.notes}</p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))
        )}

        {/* CTA for non-logged-in users */}
        {!user && (
          <div className="bg-white rounded-2xl border border-gray-200 p-6 text-center">
            <div className="text-4xl mb-3">✨</div>
            <h3 className="font-bold text-gray-900 mb-1">Crée ta propre collection Pokémon</h3>
            <p className="text-sm text-gray-400 mb-4">Suis la valeur de tes items scellés, gère ta wishlist et partage-la avec tes amis.</p>
            <Link to="/register" className="btn-primary inline-block">Créer un compte gratuit</Link>
          </div>
        )}

        <p className="text-center text-xs text-gray-300 pb-4">
          Partagé via Pokémon Collection Tracker
        </p>
      </div>
    </div>
  )
}
=======
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
>>>>>>> 75bda405994aff8b32f967b0793cc12339417565
