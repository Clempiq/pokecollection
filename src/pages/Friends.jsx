import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

export default function Friends() {
  const { user } = useAuth()
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResult, setSearchResult] = useState(null)
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchError, setSearchError] = useState('')

  const [friends, setFriends] = useState([])
  const [pendingReceived, setPendingReceived] = useState([])
  const [pendingSent, setPendingSent] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchFriendships = async () => {
    const { data } = await supabase
      .from('friendships')
      .select(`
        *,
        requester:profiles!friendships_requester_id_fkey(id, username, email),
        addressee:profiles!friendships_addressee_id_fkey(id, username, email)
      `)
      .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)

    if (data) {
      const accepted = data.filter(f => f.status === 'accepted')
      const received = data.filter(f => f.status === 'pending' && f.addressee_id === user.id)
      const sent = data.filter(f => f.status === 'pending' && f.requester_id === user.id)
      setFriends(accepted)
      setPendingReceived(received)
      setPendingSent(sent)
    }
    setLoading(false)
  }

  useEffect(() => { fetchFriendships() }, [])

  const getFriendProfile = (f) =>
    f.requester_id === user.id ? f.addressee : f.requester

  const handleSearch = async (e) => {
    e.preventDefault()
    setSearchError('')
    setSearchResult(null)
    if (!searchQuery.trim()) return
    setSearchLoading(true)

    const { data } = await supabase
      .from('profiles')
      .select('id, username, email')
      .ilike('username', searchQuery.trim())
      .neq('id', user.id)
      .maybeSingle()

    if (!data) {
      setSearchError('Aucun utilisateur trouvé avec ce pseudo.')
    } else {
      // Check if already friends or request pending
      const { data: existing } = await supabase
        .from('friendships')
        .select('id, status')
        .or(
          `and(requester_id.eq.${user.id},addressee_id.eq.${data.id}),and(requester_id.eq.${data.id},addressee_id.eq.${user.id})`
        )
        .maybeSingle()
      setSearchResult({ ...data, existingFriendship: existing || null })
    }
    setSearchLoading(false)
  }

  const sendRequest = async (addresseeId) => {
    await supabase.from('friendships').insert({
      requester_id: user.id,
      addressee_id: addresseeId,
      status: 'pending',
    })
    setSearchResult(prev => ({ ...prev, existingFriendship: { status: 'pending' } }))
    fetchFriendships()
  }

  const respondToRequest = async (friendshipId, status) => {
    await supabase.from('friendships').update({ status }).eq('id', friendshipId)
    fetchFriendships()
  }

  const removeFriend = async (friendshipId) => {
    await supabase.from('friendships').delete().eq('id', friendshipId)
    fetchFriendships()
  }

  const getFriendshipLabel = (f) => {
    if (!f) return null
    if (f.status === 'accepted') return { text: 'Déjà amis ✅', color: 'text-green-600' }
    if (f.status === 'pending') return { text: 'Demande envoyée ⏳', color: 'text-yellow-600' }
    return null
  }

  return (
    <div className="space-y-8 max-w-2xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Amis</h1>
        <p className="text-gray-500 text-sm mt-0.5">Ajoute des amis pour voir leur collection et créer des collections communes</p>
      </div>

      {/* Search */}
      <div className="card p-6">
        <h2 className="font-semibold text-gray-800 mb-4">🔍 Chercher un ami par pseudo</h2>
        <form onSubmit={handleSearch} className="flex gap-2">
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="input-field flex-1"
            placeholder="ex: ash_ketchum"
          />
          <button type="submit" className="btn-primary whitespace-nowrap" disabled={searchLoading}>
            {searchLoading ? '...' : 'Rechercher'}
          </button>
        </form>

        {searchError && (
          <p className="text-red-500 text-sm mt-3">{searchError}</p>
        )}

        {searchResult && (
          <div className="mt-4 flex items-center justify-between bg-gray-50 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-pokemon-blue rounded-full flex items-center justify-center text-white font-bold text-sm">
                {searchResult.username[0].toUpperCase()}
              </div>
              <div>
                <p className="font-semibold text-gray-900">@{searchResult.username}</p>
                <p className="text-xs text-gray-400">{searchResult.email}</p>
              </div>
            </div>
            {searchResult.existingFriendship ? (
              <span className={`text-sm font-medium ${getFriendshipLabel(searchResult.existingFriendship)?.color}`}>
                {getFriendshipLabel(searchResult.existingFriendship)?.text}
              </span>
            ) : (
              <button
                onClick={() => sendRequest(searchResult.id)}
                className="btn-primary text-sm"
              >
                Ajouter ✚
              </button>
            )}
          </div>
        )}
      </div>

      {/* Pending received */}
      {pendingReceived.length > 0 && (
        <div className="card p-6">
          <h2 className="font-semibold text-gray-800 mb-4">📬 Demandes reçues ({pendingReceived.length})</h2>
          <div className="space-y-3">
            {pendingReceived.map(f => (
              <div key={f.id} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-pokemon-red rounded-full flex items-center justify-center text-white font-bold text-sm">
                    {f.requester?.username?.[0]?.toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">@{f.requester?.username}</p>
                    <p className="text-xs text-gray-400">{f.requester?.email}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => respondToRequest(f.id, 'accepted')}
                    className="text-xs bg-green-100 hover:bg-green-200 text-green-700 font-medium px-3 py-1.5 rounded-lg transition-colors"
                  >
                    Accepter ✓
                  </button>
                  <button
                    onClick={() => respondToRequest(f.id, 'rejected')}
                    className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-600 font-medium px-3 py-1.5 rounded-lg transition-colors"
                  >
                    Refuser
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pending sent */}
      {pendingSent.length > 0 && (
        <div className="card p-6">
          <h2 className="font-semibold text-gray-800 mb-4">⏳ Demandes envoyées</h2>
          <div className="space-y-3">
            {pendingSent.map(f => (
              <div key={f.id} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-yellow-400 rounded-full flex items-center justify-center text-white font-bold text-sm">
                    {f.addressee?.username?.[0]?.toUpperCase()}
                  </div>
                  <p className="font-medium text-gray-700">@{f.addressee?.username}</p>
                </div>
                <button
                  onClick={() => removeFriend(f.id)}
                  className="text-xs text-gray-400 hover:text-red-500 transition-colors"
                >
                  Annuler
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Friends list */}
      <div className="card p-6">
        <h2 className="font-semibold text-gray-800 mb-4">👥 Mes amis ({friends.length})</h2>
        {loading ? (
          <div className="flex justify-center py-6">
            <div className="w-6 h-6 border-2 border-pokemon-red border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : friends.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-6">
            Pas encore d'amis. Cherche quelqu'un par pseudo !
          </p>
        ) : (
          <div className="space-y-3">
            {friends.map(f => {
              const friend = getFriendProfile(f)
              return (
                <div key={f.id} className="flex items-center justify-between py-1">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-pokemon-blue rounded-full flex items-center justify-center text-white font-bold text-sm">
                      {friend?.username?.[0]?.toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">@{friend?.username}</p>
                      <p className="text-xs text-gray-400">{friend?.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link
                      to={`/friend/${friend?.id}`}
                      className="text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 font-medium px-3 py-1.5 rounded-lg transition-colors"
                    >
                      Voir collection
                    </Link>
                    <button
                      onClick={() => removeFriend(f.id)}
                      className="text-xs text-gray-300 hover:text-red-400 transition-colors px-1"
                      title="Retirer ami"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
