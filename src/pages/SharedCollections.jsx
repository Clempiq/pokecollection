import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

export default function SharedCollections() {
  const { user } = useAuth()
  const [collections, setCollections] = useState([])
  const [friends, setFriends] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [selectedFriends, setSelectedFriends] = useState([])
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState('')

  const fetchData = async () => {
    // Get shared collections I'm part of (as member or creator)
    const { data: colls } = await supabase
      .from('shared_collections')
      .select(`
        *,
        members:shared_collection_members(user_id, role, profiles(username, email)),
        items:shared_collection_items(id, purchase_price, quantity)
      `)
      .order('created_at', { ascending: false })
    setCollections(colls || [])

    // Get friends for invite
    const { data: friendships } = await supabase
      .from('friendships')
      .select(`
        requester_id, addressee_id,
        requester:profiles!friendships_requester_id_fkey(id, username, email),
        addressee:profiles!friendships_addressee_id_fkey(id, username, email)
      `)
      .eq('status', 'accepted')
      .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)

    const friendList = (friendships || []).map(f =>
      f.requester_id === user.id ? f.addressee : f.requester
    )
    setFriends(friendList)
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [])

  const toggleFriend = (id) => {
    setSelectedFriends(prev =>
      prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]
    )
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!newName.trim()) return
    setCreating(true)
    setCreateError('')

    const { data: coll, error } = await supabase
      .from('shared_collections')
      .insert({ name: newName.trim(), created_by: user.id })
      .select()
      .single()

    if (error || !coll) {
      setCreateError('Erreur lors de la création.')
      setCreating(false)
      return
    }

    // Add creator as owner
    await supabase.from('shared_collection_members').insert({
      collection_id: coll.id, user_id: user.id, role: 'owner'
    })

    // Add selected friends as members
    if (selectedFriends.length > 0) {
      await supabase.from('shared_collection_members').insert(
        selectedFriends.map(fId => ({ collection_id: coll.id, user_id: fId, role: 'member' }))
      )
    }

    setShowCreate(false)
    setNewName('')
    setSelectedFriends([])
    setCreating(false)
    fetchData()
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Collections Communes</h1>
          <p className="text-gray-400 text-xs sm:text-sm mt-0.5">Des pools d'items partagés entre amis</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary text-sm shrink-0">
          + Nouvelle
        </button>
      </div>

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 sm:p-4">
          <div className="bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md p-6">
            <div className="sm:hidden flex justify-center mb-4">
              <div className="w-10 h-1 bg-gray-200 rounded-full" />
            </div>
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-bold text-gray-900 text-lg">Créer une collection commune</h2>
              <button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            {createError && (
              <div className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-lg mb-4">{createError}</div>
            )}
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nom de la collection</label>
                <input
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  className="input-field"
                  placeholder="ex: Carte vintage avec Pierre"
                  required
                />
              </div>
              {friends.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Inviter des amis</label>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {friends.map(f => (
                      <label key={f.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedFriends.includes(f.id)}
                          onChange={() => toggleFriend(f.id)}
                          className="rounded"
                        />
                        <div className="w-7 h-7 bg-pokemon-blue rounded-full flex items-center justify-center text-white text-xs font-bold">
                          {f.username?.[0]?.toUpperCase() || f.email?.[0]?.toUpperCase()}
                        </div>
                        <span className="text-sm text-gray-700">
                          {f.username || f.email}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowCreate(false)} className="btn-secondary flex-1">Annuler</button>
                <button type="submit" className="btn-primary flex-1" disabled={creating}>
                  {creating ? 'Création...' : 'Créer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Collections list */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-pokemon-red border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : collections.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="text-5xl mb-4">🤝</div>
          <p className="text-gray-500 font-medium">Pas encore de collection commune</p>
          <p className="text-gray-400 text-sm mt-1">Crée-en une et invite tes amis !</p>
          <button onClick={() => setShowCreate(true)} className="btn-primary inline-block mt-4">
            Créer une collection
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {collections.map((c, idx) => {
            const totalValue = (c.items || []).reduce((s, i) => s + (i.purchase_price || 0) * (i.quantity || 1), 0)
            const memberNames = (c.members || []).map(m => {
              const p = m.profiles
              return p ? (p.username || p.email?.split('@')[0] || '?') : '?'
            })
            // Deterministic gradient per collection based on its position
            const gradients = [
              'from-violet-500 to-indigo-600',
              'from-emerald-500 to-teal-600',
              'from-orange-500 to-red-500',
              'from-pink-500 to-rose-600',
              'from-cyan-500 to-blue-600',
              'from-amber-500 to-yellow-500',
            ]
            const grad = gradients[idx % gradients.length]
            return (
              <Link
                key={c.id}
                to={`/shared/${c.id}`}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden flex"
              >
                {/* Color bar */}
                <div className={`w-2 shrink-0 bg-gradient-to-b ${grad}`} />
                <div className="flex-1 p-4 flex items-center justify-between gap-3 min-w-0">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-11 h-11 shrink-0 bg-gradient-to-br ${grad} rounded-xl flex items-center justify-center text-xl shadow-sm`}>
                      🤝
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-bold text-gray-900 text-sm truncate">{c.name}</h3>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
                        <span className="text-xs text-gray-400">{c.items?.length || 0} item{c.items?.length !== 1 ? 's' : ''}</span>
                        <span className="text-gray-200">·</span>
                        <span className="text-xs text-gray-400 truncate">
                          {memberNames.slice(0, 3).join(', ')}{memberNames.length > 3 ? ` +${memberNames.length - 3}` : ''}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    {totalValue > 0 && (
                      <p className="text-sm font-bold text-gray-800">{totalValue.toFixed(0)} €</p>
                    )}
                    <div className="flex items-center gap-1.5 justify-end mt-0.5">
                      {(c.members || []).slice(0, 4).map((m, i) => (
                        <div key={m.user_id} className={`w-5 h-5 rounded-full bg-gradient-to-br ${grad} flex items-center justify-center text-white text-[9px] font-bold border border-white`}
                          title={m.profiles?.username || m.profiles?.email}>
                          {m.profiles?.username?.[0]?.toUpperCase() || m.profiles?.email?.[0]?.toUpperCase() || '?'}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
