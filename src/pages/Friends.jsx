import { useEffect, useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

function displayName(p) {
  if (!p) return '?'
  return p.username || p.email || '?'
}

function Avatar({ profile, size = 'md', color = 'bg-pokemon-blue' }) {
  const s = size === 'sm' ? 'w-8 h-8 text-xs' : 'w-10 h-10 text-sm'
  const initial = profile?.username?.[0]?.toUpperCase() || profile?.email?.[0]?.toUpperCase() || '?'
  return (
    <div className={`${s} ${color} rounded-full flex items-center justify-center text-white font-bold shrink-0`}>
      {initial}
    </div>
  )
}

export default function Friends() {
  const { user } = useAuth()
  const [searchQuery, setSearchQuery]         = useState('')
  const [searchResults, setSearchResults]     = useState([])
  const [searchLoading, setSearchLoading]     = useState(false)
  const [showDropdown, setShowDropdown]       = useState(false)
  const [friendships, setFriendships]         = useState([])
  const [pendingReceived, setPendingReceived] = useState([])
  const [pendingSent, setPendingSent]         = useState([])
  const [loading, setLoading]                 = useState(true)
  const [confirmRemoveId, setConfirmRemoveId] = useState(null)
  const searchRef                             = useRef(null)
  const debounceRef                           = useRef(null)

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Dynamic search (300ms debounce)
  useEffect(() => {
    clearTimeout(debounceRef.current)
    if (!searchQuery.trim() || searchQuery.trim().length < 2) {
      setSearchResults([])
      setShowDropdown(false)
      return
    }
    debounceRef.current = setTimeout(async () => {
      setSearchLoading(true)
      const q = searchQuery.trim()
      const { data } = await supabase
        .from('profiles')
        .select('id, username, email')
        .or(`username.ilike.%${q}%,email.ilike.%${q}%`)
        .neq('id', user.id)
        .limit(8)
      setSearchResults(data || [])
      setShowDropdown(true)
      setSearchLoading(false)
    }, 300)
    return () => clearTimeout(debounceRef.current)
  }, [searchQuery, user.id])

  // Load friendships
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
      setFriendships(data.filter(f => f.status === 'accepted'))
      setPendingReceived(data.filter(f => f.status === 'pending' && f.addressee_id === user.id))
      setPendingSent(data.filter(f => f.status === 'pending' && f.requester_id === user.id))
    }
    setLoading(false)
  }

  useEffect(() => { fetchFriendships() }, [])

  const getFriendProfile = (f) => f.requester_id === user.id ? f.addressee : f.requester

  const getStatus = (profileId) => {
    const f = [...friendships, ...pendingReceived, ...pendingSent].find(f =>
      (f.requester_id === user.id && f.addressee_id === profileId) ||
      (f.addressee_id === user.id && f.requester_id === profileId)
    )
    if (!f) return null
    return f.status === 'accepted' ? 'friends' : 'pending'
  }

  const sendRequest = async (addresseeId) => {
    // Get the profile of current user to get username
    const { data: profileData } = await supabase
      .from('profiles')
      .select('username, email')
      .eq('id', user.id)
      .single()

    await supabase.from('friendships').insert({ requester_id: user.id, addressee_id: addresseeId, status: 'pending' })

    // Trigger push + email notifications
    try {
      await supabase.functions.invoke('send-notification', {
        body: { addresseeId, fromUsername: profileData?.username || profileData?.email || user.email }
      })
    } catch (err) {
      console.error('Failed to send notification:', err)
    }

    setShowDropdown(false)
    setSearchQuery('')
    fetchFriendships()
  }

  const respondToRequest = async (id, status) => {
    await supabase.from('friendships').update({ status }).eq('id', id)
    fetchFriendships()
  }

  const removeFriend = async (id) => {
    await supabase.from('friendships').delete().eq('id', id)
    setConfirmRemoveId(null)
    fetchFriendships()
  }

  return (
    <div className="space-y-8 max-w-2xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Amis</h1>
        <p className="text-gray-500 text-sm mt-0.5">Ajoute des amis pour voir leur collection et créer des collections communes</p>
      </div>

      {/* Dynamic search */}
      <div className="card p-6">
        <h2 className="font-semibold text-gray-800 mb-4">🔍 Trouver quelqu'un</h2>
        <div className="relative" ref={searchRef}>
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onFocus={() => searchResults.length > 0 && setShowDropdown(true)}
              className="input-field pr-10"
              placeholder="Cherche par prénom, nom ou email…"
            />
            {searchLoading && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <div className="w-4 h-4 border-2 border-pokemon-red border-t-transparent rounded-full animate-spin"></div>
              </div>
            )}
          </div>

          {/* Results dropdown */}
          {showDropdown && (
            <div className="absolute z-20 left-0 right-0 mt-1 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden">
              {searchResults.length === 0 ? (
                <p className="text-sm text-gray-400 px-4 py-3 text-center">Aucun résultat pour "{searchQuery}"</p>
              ) : (
                searchResults.map(p => {
                  const status = getStatus(p.id)
                  return (
                    <div key={p.id} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center gap-3">
                        <Avatar profile={p} size="sm" />
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{displayName(p)}</p>
                          <p className="text-xs text-gray-400">{p.email}</p>
                        </div>
                      </div>
                      {status === 'friends' ? (
                        <span className="text-xs text-green-600 font-medium">Déjà amis ✓</span>
                      ) : status === 'pending' ? (
                        <span className="text-xs text-yellow-600 font-medium">En attente ⏳</span>
                      ) : (
                        <button
                          onClick={() => sendRequest(p.id)}
                          className="text-xs btn-primary py-1 px-3"
                        >
                          + Ajouter
                        </button>
                      )}
                    </div>
                  )
                })
              )}
            </div>
          )}
        </div>
      </div>

      {/* Pending received */}
      {pendingReceived.length > 0 && (
        <div className="card p-6">
          <h2 className="font-semibold text-gray-800 mb-4">
            📬 Demandes reçues
            <span className="ml-2 bg-pokemon-red text-white text-xs font-bold px-2 py-0.5 rounded-full">
              {pendingReceived.length}
            </span>
          </h2>
          <div className="space-y-3">
            {pendingReceived.map(f => (
              <div key={f.id} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar profile={f.requester} color="bg-pokemon-red" />
                  <div>
                    <p className="font-medium text-gray-900">{displayName(f.requester)}</p>
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
                  <Avatar profile={f.addressee} color="bg-yellow-400" />
                  <div>
                    <p className="font-medium text-gray-700">{displayName(f.addressee)}</p>
                    <p className="text-xs text-gray-400">{f.addressee?.email}</p>
                  </div>
                </div>
                {confirmRemoveId === f.id ? (
                  <span className="flex items-center gap-1">
                    <span className="text-xs text-red-600 font-medium">Annuler ?</span>
                    <button onClick={() => removeFriend(f.id)}
                      className="text-xs bg-red-500 hover:bg-red-600 text-white font-medium px-2 py-1 rounded-lg">Oui</button>
                    <button onClick={() => setConfirmRemoveId(null)}
                      className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-600 font-medium px-2 py-1 rounded-lg">Non</button>
                  </span>
                ) : (
                  <button onClick={() => setConfirmRemoveId(f.id)}
                    className="text-xs text-gray-400 hover:text-red-500 transition-colors">
                    Annuler
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Friends list */}
      <div className="card p-6">
        <h2 className="font-semibold text-gray-800 mb-4">👥 Mes amis ({friendships.length})</h2>
        {loading ? (
          <div className="flex justify-center py-6">
            <div className="w-6 h-6 border-2 border-pokemon-red border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : friendships.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-6">
            Pas encore d'amis. Cherche quelqu'un ci-dessus !
          </p>
        ) : (
          <div className="space-y-3">
            {friendships.map(f => {
              const friend = getFriendProfile(f)
              return (
                <div key={f.id} className="flex items-center justify-between py-1">
                  <div className="flex items-center gap-3">
                    <Avatar profile={friend} />
                    <div>
                      <p className="font-semibold text-gray-900">{displayName(friend)}</p>
                      <p className="text-xs text-gray-400">{friend?.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Link
                      to={`/friend/${friend?.id}`}
                      className="text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 font-medium px-2.5 py-1.5 rounded-lg transition-colors whitespace-nowrap"
                    >
                      👀 Collection
                    </Link>
                    {confirmRemoveId === f.id ? (
                      <span className="flex items-center gap-1">
                        <button onClick={() => removeFriend(f.id)}
                          className="text-xs bg-red-500 hover:bg-red-600 text-white font-medium px-2 py-1 rounded-lg">Oui</button>
                        <button onClick={() => setConfirmRemoveId(null)}
                          className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-600 font-medium px-2 py-1 rounded-lg">Non</button>
                      </span>
                    ) : (
                      <button
                        onClick={() => setConfirmRemoveId(f.id)}
                        className="text-xs text-gray-300 hover:text-red-400 transition-colors p-1.5"
                        title="Retirer ami"
                      >
                        ✕
                      </button>
                    )}
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
