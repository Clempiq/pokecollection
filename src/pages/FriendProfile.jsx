import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

const TYPE_COLORS = {
  Normal:    'bg-gray-100 text-gray-700',
  Feu:       'bg-orange-100 text-orange-700',
  Eau:       'bg-blue-100 text-blue-700',
  Plante:    'bg-green-100 text-green-700',
  Électrik:  'bg-yellow-100 text-yellow-700',
  Glace:     'bg-cyan-100 text-cyan-700',
  Combat:    'bg-red-100 text-red-700',
  Poison:    'bg-purple-100 text-purple-700',
  Sol:       'bg-amber-100 text-amber-800',
  Vol:       'bg-sky-100 text-sky-700',
  Psy:       'bg-pink-100 text-pink-700',
  Insecte:   'bg-lime-100 text-lime-700',
  Roche:     'bg-stone-100 text-stone-700',
  Spectre:   'bg-indigo-100 text-indigo-700',
  Dragon:    'bg-violet-100 text-violet-700',
  Ténèbres:  'bg-gray-800 text-gray-100',
  Acier:     'bg-slate-100 text-slate-700',
  Fée:       'bg-rose-100 text-rose-700',
}

function BadgeRow({ icon, label, value, color = 'bg-gray-50 text-gray-700' }) {
  if (!value) return null
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border border-white/60 ${color}`}>
      {icon} {label ? <span className="text-[10px] opacity-70">{label}</span> : null}
      <span>{value}</span>
    </span>
  )
}

export default function FriendProfile() {
  const { userId } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [profile, setProfile] = useState(null)
  const [stats, setStats] = useState(null)
  const [recentItems, setRecentItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [notAuthorized, setNotAuthorized] = useState(false)

  const isOwnProfile = user?.id === userId

  useEffect(() => {
    async function load() {
      // If it's own profile, redirect to /profile
      if (user?.id === userId) {
        navigate('/profile', { replace: true })
        return
      }

      // Verify friendship (unless viewing own profile)
      const { data: friendship } = await supabase
        .from('friendships')
        .select('id')
        .eq('status', 'accepted')
        .or(
          `and(requester_id.eq.${user.id},addressee_id.eq.${userId}),` +
          `and(requester_id.eq.${userId},addressee_id.eq.${user.id})`
        )
        .single()

      if (!friendship) {
        setNotAuthorized(true)
        setLoading(false)
        return
      }

      // Fetch profile
      const { data: p } = await supabase
        .from('profiles')
        .select('id, username, email, bio, favorite_pokemon, favorite_extension, favorite_pokemon_type, trainer_since, play_style')
        .eq('id', userId)
        .single()
      setProfile(p)

      // Fetch stats
      const { data: items } = await supabase
        .from('items')
        .select('id, quantity, current_value, item_type, name, api_image_url, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (items) {
        const total = items.reduce((s, i) => s + i.quantity, 0)
        const value = items.reduce((s, i) => s + (i.current_value || 0) * i.quantity, 0)
        const typeMap = {}
        items.forEach(i => { if (i.item_type) typeMap[i.item_type] = (typeMap[i.item_type] || 0) + 1 })
        const topType = Object.entries(typeMap).sort((a,b)=>b[1]-a[1])[0]?.[0]
        setStats({ total, refs: items.length, value, topType })
        setRecentItems(items.slice(0, 4))
      }

      setLoading(false)
    }
    load()
  }, [userId, user.id, navigate])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-pokemon-red border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (notAuthorized) {
    return (
      <div className="text-center py-20 space-y-4">
        <div className="text-5xl">🔒</div>
        <p className="text-gray-500 font-medium">Vous n'êtes pas amis avec cet utilisateur</p>
        <Link to="/friends" className="btn-primary inline-block mt-2">← Retour aux amis</Link>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-400">Profil introuvable</p>
        <Link to="/friends" className="btn-primary inline-block mt-4">← Retour</Link>
      </div>
    )
  }

  const displayName = profile.username || profile.email || '?'
  const initial = displayName[0]?.toUpperCase() || '?'
  const typeColor = TYPE_COLORS[profile.favorite_pokemon_type] || 'bg-gray-100 text-gray-700'

  return (
    <div className="max-w-xl mx-auto space-y-5 pb-24">

      {/* Back nav */}
      <Link to="/friends" className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 transition-colors">
        ← Amis
      </Link>

      {/* Profile card */}
      <div className="card overflow-hidden">
        {/* Banner */}
        <div className="h-20 bg-gradient-to-r from-pokemon-blue via-blue-500 to-pokemon-red" />

        <div className="px-5 pb-5">
          {/* Avatar */}
          <div className="flex items-end justify-between -mt-8 mb-4">
            <div className="w-16 h-16 bg-pokemon-blue rounded-full border-4 border-white flex items-center justify-center text-white text-2xl font-bold shadow">
              {initial}
            </div>
            <Link
              to={`/friend/${userId}`}
              className="text-xs bg-pokemon-blue hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded-lg transition-colors"
            >
              📦 Voir la collection
            </Link>
          </div>

          <h1 className="text-xl font-bold text-gray-900">@{displayName}</h1>

          {profile.bio && (
            <p className="text-sm text-gray-500 italic mt-1">"{profile.bio}"</p>
          )}

          {/* Badges */}
          <div className="flex flex-wrap gap-2 mt-3">
            {profile.favorite_pokemon && (
              <BadgeRow icon="⭐" label="Pokémon favori" value={profile.favorite_pokemon} color="bg-yellow-50 text-yellow-700 border-yellow-100" />
            )}
            {profile.favorite_pokemon_type && (
              <BadgeRow icon="🔷" label="Type" value={profile.favorite_pokemon_type} color={`${typeColor} border-white/60`} />
            )}
            {profile.favorite_extension && (
              <BadgeRow icon="📦" label="Série" value={profile.favorite_extension} color="bg-purple-50 text-purple-700" />
            )}
            {profile.play_style && (
              <BadgeRow icon="🎯" value={profile.play_style} color="bg-gray-100 text-gray-600" />
            )}
            {profile.trainer_since && (
              <BadgeRow icon="🕹️" label="Dresseur depuis" value={profile.trainer_since} color="bg-green-50 text-green-700" />
            )}
          </div>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { value: stats.total,          label: 'items',      icon: '📦' },
            { value: stats.refs,           label: 'références', icon: '🗂️' },
            { value: `${stats.value.toFixed(0)} €`, label: 'valeur', icon: '💰' },
          ].map(({ value, label, icon }) => (
            <div key={label} className="card p-4 text-center">
              <div className="text-xl mb-0.5">{icon}</div>
              <p className="text-lg font-bold text-gray-900 leading-tight">{value}</p>
              <p className="text-[11px] text-gray-400 mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Recent items preview */}
      {recentItems.length > 0 && (
        <div className="card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700">Récemment ajouté</h2>
            <Link to={`/friend/${userId}`} className="text-xs text-pokemon-blue hover:underline font-medium">
              Tout voir →
            </Link>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {recentItems.map(item => (
              <div key={item.id} className="aspect-square rounded-lg overflow-hidden bg-gray-50 border border-gray-100 flex items-center justify-center">
                {item.api_image_url
                  ? <img src={item.api_image_url} alt={item.name} className="w-full h-full object-contain p-1" />
                  : <span className="text-2xl">📦</span>
                }
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <Link
          to={`/friend/${userId}`}
          className="flex-1 btn-primary text-center text-sm py-3"
        >
          📦 Voir la collection complète
        </Link>
      </div>
    </div>
  )
}
