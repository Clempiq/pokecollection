import { useState, useEffect } from 'react'

const TCGDEX_BASE = 'https://api.tcgdex.net/v2/fr'

// ────────────────────────────────────────────────────────────────
// Upcoming releases not yet in TCGdex (sourced from official Pokémon announcements)
// Keep sorted ascending by releaseDate.
// ────────────────────────────────────────────────────────────────
const STATIC_UPCOMING = [
  {
    id: 'sv-pe-fr',
    name: 'Méga Évolution — L\'Ordre Parfait',
    releaseDate: '2026-03-27',
    serie: { name: 'Écarlate et Violet' },
    cardCount: null,
    logo: null,
    static: true,
  },
  {
    id: 'sv-wcs2025',
    name: 'Decks Championnats du Monde 2025',
    releaseDate: '2026-04-03',
    serie: { name: 'Spécial' },
    cardCount: null,
    logo: null,
    static: true,
  },
  {
    id: 'sv-ah-bundle',
    name: 'Méga Évolution — Héros Ascendants Bundle',
    releaseDate: '2026-04-24',
    serie: { name: 'Écarlate et Violet' },
    cardCount: null,
    logo: null,
    static: true,
  },
  {
    id: 'sv-chaos-rising',
    name: 'Méga Évolution — Chaos en Hausse',
    releaseDate: '2026-05-22',
    serie: { name: 'Écarlate et Violet' },
    cardCount: null,
    logo: null,
    static: true,
  },
]

function formatDate(dateStr) {
  if (!dateStr) return '—'
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}

function daysUntil(dateStr) {
  if (!dateStr) return null
  const today = new Date(); today.setHours(0,0,0,0)
  const target = new Date(dateStr + 'T00:00:00')
  return Math.round((target - today) / 86400000)
}

function daysAgo(dateStr) {
  if (!dateStr) return null
  const today = new Date(); today.setHours(0,0,0,0)
  const target = new Date(dateStr + 'T00:00:00')
  return Math.round((today - target) / 86400000)
}

function SetCard({ set, type }) {
  const [imgErr, setImgErr] = useState(false)
  const days = type === 'upcoming' ? daysUntil(set.releaseDate) : daysAgo(set.releaseDate)

  const logoUrl = set.logo && !imgErr ? `${set.logo}.png` : null

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow flex flex-col">
      {/* Logo banner */}
      <div className={`h-28 flex items-center justify-center px-4 relative ${set.static ? 'bg-gradient-to-br from-indigo-50 to-purple-50' : 'bg-gradient-to-br from-blue-50 to-indigo-50'}`}>
        {logoUrl ? (
          <img
            src={logoUrl}
            alt={set.name}
            className="max-h-20 max-w-full object-contain drop-shadow-sm"
            onError={() => setImgErr(true)}
          />
        ) : (
          <div className="flex flex-col items-center gap-1 opacity-40">
            <span className="text-3xl">{set.static ? '🔮' : '📦'}</span>
            {set.static && <span className="text-[9px] font-bold text-indigo-400 uppercase tracking-widest">Annoncé</span>}
          </div>
        )}

        {/* Days badge */}
        {days !== null && (
          <span className={`absolute top-2 right-2 text-[10px] font-bold px-2 py-0.5 rounded-full ${
            type === 'upcoming'
              ? days <= 7  ? 'bg-red-100 text-red-700'
              : days <= 30 ? 'bg-orange-100 text-orange-700'
              : 'bg-indigo-100 text-indigo-700'
              : 'bg-emerald-100 text-emerald-700'
          }`}>
            {type === 'upcoming'
              ? days === 0 ? 'Auj.' : `J-${days}`
              : days === 0 ? 'Auj.' : `−${days}j`}
          </span>
        )}

        {/* Source badge for static entries */}
        {set.static && (
          <span className="absolute top-2 left-2 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-600">
            officiel
          </span>
        )}
      </div>

      {/* Info */}
      <div className="px-4 py-3 flex-1 flex flex-col justify-between gap-1">
        <p className="font-bold text-gray-900 text-sm leading-snug line-clamp-2">{set.name}</p>
        {set.serie?.name && (
          <p className="text-xs text-blue-600 font-medium truncate">{set.serie.name}</p>
        )}
        <div className="flex items-center justify-between mt-1">
          <span className="text-xs text-gray-400">📅 {formatDate(set.releaseDate)}</span>
          {set.cardCount?.official && (
            <span className="text-xs text-gray-400">{set.cardCount.official} cartes</span>
          )}
        </div>
      </div>
    </div>
  )
}

function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden animate-pulse">
      <div className="bg-gray-100 h-28" />
      <div className="px-4 py-3 space-y-2">
        <div className="h-3 bg-gray-200 rounded w-3/4" />
        <div className="h-3 bg-gray-100 rounded w-1/2" />
        <div className="h-3 bg-gray-100 rounded w-2/3" />
      </div>
    </div>
  )
}

export default function Releases() {
  const [tcgSets, setTcgSets]     = useState([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState(null)
  const [tab, setTab]             = useState('upcoming')
  const [monthsBack, setMonthsBack] = useState(6)

  useEffect(() => {
    async function fetchSets() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`${TCGDEX_BASE}/sets`)
        if (!res.ok) throw new Error('HTTP ' + res.status)
        const data = await res.json()
        setTcgSets(data || [])
      } catch (e) {
        setError('Impossible de charger TCGdex. Les sorties annoncées restent disponibles.')
      } finally {
        setLoading(false)
      }
    }
    fetchSets()
  }, [])

  const today = new Date(); today.setHours(0,0,0,0)
  const cutoff = new Date(today)
  cutoff.setMonth(cutoff.getMonth() - monthsBack)

  // Upcoming: static list + any TCGdex sets with future dates (sorted by date asc)
  const tcgUpcoming = tcgSets.filter(s => s.releaseDate && new Date(s.releaseDate + 'T00:00:00') > today)
  const staticIds = new Set(STATIC_UPCOMING.map(s => s.id))
  const mergedUpcoming = [
    ...STATIC_UPCOMING.filter(s => new Date(s.releaseDate + 'T00:00:00') > today),
    ...tcgUpcoming.filter(s => !staticIds.has(s.id)),
  ].sort((a, b) => new Date(a.releaseDate) - new Date(b.releaseDate))

  // Recent: TCGdex only, sorted by date desc
  const recentSets = tcgSets
    .filter(s => s.releaseDate
      && new Date(s.releaseDate + 'T00:00:00') <= today
      && new Date(s.releaseDate + 'T00:00:00') >= cutoff
    )
    .sort((a, b) => new Date(b.releaseDate) - new Date(a.releaseDate))

  const displaySets  = tab === 'upcoming' ? mergedUpcoming : recentSets
  const nextRelease  = mergedUpcoming[0] ?? null

  return (
    <div className="max-w-5xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">📅 Calendrier des sorties</h1>
          <p className="text-sm text-gray-500 mt-0.5">Extensions Pokémon TCG · TCGdex + annonces officielles</p>
        </div>
        {!loading && !error && (
          <span className="text-xs text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full hidden sm:inline">
            {tcgSets.length} extensions dans la base
          </span>
        )}
      </div>

      {/* Tabs */}
      <div className="flex bg-gray-100 rounded-xl p-1 w-full sm:w-auto sm:inline-flex gap-1">
        <button
          onClick={() => setTab('upcoming')}
          className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
            tab === 'upcoming' ? 'bg-white text-pokemon-blue shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          🔮 À venir
          {mergedUpcoming.length > 0 && (
            <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${tab === 'upcoming' ? 'bg-blue-100 text-blue-700' : 'bg-gray-200 text-gray-500'}`}>
              {mergedUpcoming.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setTab('recent')}
          className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
            tab === 'recent' ? 'bg-white text-pokemon-blue shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          ✅ Récentes
          {!loading && recentSets.length > 0 && (
            <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${tab === 'recent' ? 'bg-blue-100 text-blue-700' : 'bg-gray-200 text-gray-500'}`}>
              {recentSets.length}
            </span>
          )}
        </button>
      </div>

      {/* Error banner */}
      {error && (
        <div className="bg-orange-50 border border-orange-200 rounded-2xl p-3 text-sm text-orange-700 flex items-center gap-2">
          <span>⚠️</span> {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      )}

      {!loading && (
        <>
          {/* Next release highlight (upcoming tab only) */}
          {tab === 'upcoming' && nextRelease && (() => {
            const days = daysUntil(nextRelease.releaseDate)
            const logoUrl = nextRelease.logo ? `${nextRelease.logo}.png` : null
            return (
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-4 sm:p-5 text-white flex items-center gap-4 shadow-lg">
                <div className="bg-white/10 rounded-xl p-2.5 shrink-0 w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center">
                  {logoUrl
                    ? <img src={logoUrl} alt={nextRelease.name} className="max-h-14 max-w-full object-contain" onError={e => { e.target.style.display='none' }} />
                    : <span className="text-3xl">🔮</span>
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-blue-200 uppercase tracking-wide mb-0.5">Prochaine sortie</p>
                  <p className="text-base sm:text-lg font-bold leading-snug line-clamp-2">{nextRelease.name}</p>
                  {nextRelease.serie?.name && <p className="text-xs text-blue-200 mt-0.5">{nextRelease.serie.name}</p>}
                  <p className="text-sm font-medium text-blue-100 mt-1 flex items-center gap-2 flex-wrap">
                    📅 {formatDate(nextRelease.releaseDate)}
                    {days !== null && (
                      <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs font-bold">
                        {days === 0 ? 'Aujourd\'hui !' : days === 1 ? 'Demain !' : `dans ${days} jours`}
                      </span>
                    )}
                  </p>
                </div>
              </div>
            )
          })()}

          {/* Empty state */}
          {displaySets.length === 0 && (
            <div className="text-center py-14 space-y-3">
              <div className="text-5xl">{tab === 'upcoming' ? '🔮' : '📦'}</div>
              <p className="font-semibold text-gray-700">
                {tab === 'upcoming' ? 'Aucune sortie annoncée' : `Aucune extension dans les ${monthsBack} derniers mois`}
              </p>
              {tab === 'recent' && (
                <button
                  onClick={() => setMonthsBack(m => m + 6)}
                  className="text-sm text-blue-600 hover:underline font-medium"
                >
                  Voir les {monthsBack + 6} derniers mois
                </button>
              )}
            </div>
          )}

          {/* Grid */}
          {displaySets.length > 0 && (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {displaySets.map(set => (
                  <SetCard key={set.id} set={set} type={tab} />
                ))}
              </div>

              {tab === 'recent' && (
                <div className="flex justify-center pt-1">
                  <button
                    onClick={() => setMonthsBack(m => m + 6)}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1.5 bg-blue-50 hover:bg-blue-100 px-4 py-2 rounded-xl transition-colors"
                  >
                    Voir plus (+ 6 mois)
                  </button>
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* Credit */}
      {!loading && (
        <p className="text-center text-xs text-gray-300 pb-2">
          Données <a href="https://tcgdex.dev" target="_blank" rel="noreferrer" className="underline">TCGdex</a> + annonces <a href="https://www.pokemon.com/fr/pokemon-tcg" target="_blank" rel="noreferrer" className="underline">Pokémon.com</a>
        </p>
      )}
    </div>
  )
}
