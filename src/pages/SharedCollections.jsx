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
        members:shared_collection_members(user_id, role, profiles(first_name, last_name, email)),
        items:shared_collection_items(id)
      `)
      .order('created_at', { ascending: false })
    setCollections(colls || [])

    // Get friends for invite
    const { data: friendships } = await supabase
      .from('friendships')
      .select(`
        requester_id, addressee_id,
        requester:profiles!friendships_requester_id_fkey(id, first_name, last_name, email),
        addressee:profiles!friendships_addressee_id_fkey(id, first_name, last_name, email)
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
                          {f.first_name?.[0]?.toUpperCase() || f.email?.[0]?.toUpperCase()}
                        </div>
                        <span className="text-sm text-gray-700">
                          {[f.first_name, f.last_name].filter(Boolean).join(' ') || f.email}
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
          {collections.map(c => (
            <Link
              key={c.id}
              to={`/shared/${c.id}`}
              className="card p-5 flex items-center justify-between hover:shadow-md transition-shadow block"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-pokemon-yellow to-yellow-400 rounded-xl flex items-center justify-center text-2xl shadow-sm">
                  🤝
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{c.name}</h3>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-xs text-gray-400">{c.items?.length || 0} items</span>
                    <span className="text-xs text-gray-300">·</span>
                    <span className="text-xs text-gray-400">
                      {c.members?.map(m => {
                        const p = m.profiles
                        return p ? ([p.first_name, p.last_name].filter(Boolean).join(' ') || p.email) : '?'
                      }).join(', ')}
                    </span>
                  </div>
                </div>
              </div>
              <span className="text-gray-300 text-xl">→</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
