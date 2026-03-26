import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { formatDate, daysUntil, daysAgo, groupByDate } from '../lib/releasesUtils'

const TCGDEX_BASE = 'https://api.tcgdex.net/v2/fr'

// ─────────────────────────────────────────────────────────────────────────────
// Sorties récentes statiques (fallback si TCGdex indisponible)
// Tri descendant par releaseDate.
// ─────────────────────────────────────────────────────────────────────────────
const STATIC_RECENT = [
  {
    id: 'sv-prismatic-evolutions',
    name: 'Évolutions Prismatiques',
    releaseDate: '2026-01-17',
    category: 'Extension',
    serie: { name: 'Écarlate et Violet' },
    description: 'L\'extension Évolutions Prismatiques célèbre l\'évolution des Pokémon avec des illustrations spectaculaires. Elle introduit le mécanisme de cartes Tera Prismatique et des cartes illustrées rares.',
    tcgdexId: 'sv8pt5',
    static: true,
  },
  {
    id: 'sv-surging-sparks',
    name: 'Étincelles Déferlantes',
    releaseDate: '2025-11-08',
    category: 'Extension',
    serie: { name: 'Écarlate et Violet' },
    description: 'Étincelles Déferlantes met en vedette Terapagos et introduit de nouveaux mécanismes. Le set compte plus de 250 cartes dont de nombreuses cartes illustrées rares et des cartes spéciales Tera.',
    tcgdexId: 'sv8',
    static: true,
  },
  {
    id: 'sv-stellar-crown',
    name: 'Couronne Stellaire',
    releaseDate: '2025-09-13',
    category: 'Extension',
    serie: { name: 'Écarlate et Violet' },
    description: 'Couronne Stellaire met à l\'honneur Terapagos sous sa forme Tera Stellaire et explore le phénomène de la Téracristalisation. Le set introduit les cartes Pokémon ex Stellaire.',
    tcgdexId: 'sv7',
    static: true,
  },
  {
    id: 'sv-shrouded-fable',
    name: 'Fable Nébuleuse',
    releaseDate: '2025-08-02',
    category: 'Extension',
    serie: { name: 'Écarlate et Violet' },
    description: 'Fable Nébuleuse explore le mystère d\'Okidogi, Munkidori et Fezandipiti — les lieutenants masqués. Un mini-set très recherché pour ses cartes illus rares exclusives.',
    tcgdexId: 'sv6pt5',
    static: true,
  },
  {
    id: 'sv-twilight-masquerade',
    name: 'Mascarade Crépusculaire',
    releaseDate: '2025-05-24',
    category: 'Extension',
    serie: { name: 'Écarlate et Violet' },
    description: 'Mascarade Crépusculaire met en scène Ogerpon et ses différents masques. L\'extension introduit de nouveaux Pokémon ex et des cartes illustrées inédites.',
    tcgdexId: 'sv6',
    static: true,
  },
  {
    id: 'sv-temporal-forces',
    name: 'Forces Temporelles',
    releaseDate: '2025-03-22',
    category: 'Extension',
    serie: { name: 'Écarlate et Violet' },
    description: 'Forces Temporelles introduit les cartes Ancient et Future et met en vedette les Pokémon paradoxaux. Première apparition des cartes ACE SPEC dans l\'ère Écarlate et Violet.',
    tcgdexId: 'sv5',
    static: true,
  },
]

// ─────────────────────────────────────────────────────────────────────────────
// Calendrier statique : sets ET produits (coffrets, ETB, bundles…)
// Type 'Extension' = full booster set
// Type 'Coffret','ETB','Bundle','Deck','Promo' = produit individuel
// Tri ascendant par releaseDate.
// ─────────────────────────────────────────────────────────────────────────────
const STATIC_UPCOMING = [
  // ── 20 mars 2026 ─────────────────────────────────────────────────────────
  {
    id: 'coffret-mega-gardevoir-2026',
    name: "Coffret Dresseur d'Élite Méga Gardevoir-ex",
    releaseDate: '2026-03-20',
    category: 'Coffret',
    serie: { name: 'Méga Évolution' },
    searchKeyword: 'gardevoir mega',
    static: true,
  },
  {
    id: 'coffret-mega-lucario-2026',
    name: "Coffret Dresseur d'Élite Méga Lucario-ex",
    releaseDate: '2026-03-20',
    category: 'Coffret',
    serie: { name: 'Méga Évolution' },
    searchKeyword: 'lucario mega',
    static: true,
  },
  {
    id: 'coffret-premiers-partenaires-2026',
    name: 'Coffret Premiers Partenaires',
    releaseDate: '2026-03-20',
    category: 'Coffret',
    serie: { name: 'Méga Évolution' },
    searchKeyword: 'premiers partenaires',
    static: true,
  },
  // ── 27 mars 2026 ─────────────────────────────────────────────────────────
  {
    id: 'sv-pe-fr',
    name: "Méga Évolution — L'Ordre Parfait",
    releaseDate: '2026-03-27',
    category: 'Extension',
    serie: { name: 'Écarlate et Violet' },
    static: true,
  },
  // ── 3 avril 2026 ─────────────────────────────────────────────────────────
  {
    id: 'sv-wcs2025',
    name: 'Decks Championnats du Monde 2025',
    releaseDate: '2026-04-03',
    category: 'Deck',
    serie: { name: 'Spécial' },
    static: true,
  },
  // ── 24 avril 2026 ────────────────────────────────────────────────────────
  {
    id: 'sv-ah-bundle',
    name: 'Méga Évolution — Héros Ascendants Bundle',
    releaseDate: '2026-04-24',
    category: 'Bundle',
    serie: { name: 'Écarlate et Violet' },
    static: true,
  },
  // ── 22 mai 2026 ──────────────────────────────────────────────────────────
  {
    id: 'sv-chaos-rising',
    name: 'Méga Évolution — Chaos en Hausse',
    releaseDate: '2026-05-22',
    category: 'Extension',
    serie: { name: 'Écarlate et Violet' },
    static: true,
  },
]

const CATEGORY_STYLE = {
  Extension: { bg: 'from-blue-50 to-indigo-50',     badge: 'bg-blue-100 text-blue-700',     icon: '📋' },
  Coffret:   { bg: 'from-violet-50 to-purple-50',   badge: 'bg-violet-100 text-violet-700', icon: '🎁' },
  ETB:       { bg: 'from-red-50 to-pink-50',        badge: 'bg-red-100 text-red-700',       icon: '🎁' },
  Bundle:    { bg: 'from-emerald-50 to-teal-50',    badge: 'bg-emerald-100 text-emerald-700', icon: '🎀' },
  Deck:      { bg: 'from-orange-50 to-amber-50',    badge: 'bg-orange-100 text-orange-700', icon: '⚔️' },
  Tin:       { bg: 'from-cyan-50 to-sky-50',        badge: 'bg-cyan-100 text-cyan-700',     icon: '🫙' },
  Promo:     { bg: 'from-yellow-50 to-amber-50',    badge: 'bg-yellow-100 text-yellow-700', icon: '⭐' },
}
const catStyle = (cat) => CATEGORY_STYLE[cat] || { bg: 'from-gray-50 to-slate-50', badge: 'bg-gray-100 text-gray-600', icon: '📦' }

// formatDate, daysUntil, daysAgo, groupByDate → importés depuis ../lib/releasesUtils

// ─────────────────────────────────────────────────────────────────────────────
// Carte de sortie
// ─────────────────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
// Modale de détail d'une sortie
// ─────────────────────────────────────────────────────────────────────────────
function ReleaseDetailModal({ release, type, cachedImage, onClose }) {
  const cs = catStyle(release.category)
  const logoUrl = release.logo ? `${release.logo}.png` : null
  const imageUrl = cachedImage || logoUrl
  const days = type === 'upcoming' ? daysUntil(release.releaseDate) : daysAgo(release.releaseDate)

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 sm:p-4" onClick={onClose}>
      <div className="bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md flex flex-col max-h-[85vh]" onClick={e => e.stopPropagation()}>
        {/* Drag handle mobile */}
        <div className="sm:hidden flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 bg-gray-200 rounded-full" />
        </div>
        {/* Header coloré */}
        <div className={`relative bg-gradient-to-br ${cs.bg} p-5 flex items-start gap-4`}>
          <div className="w-16 h-16 rounded-xl bg-white/70 shrink-0 flex items-center justify-center overflow-hidden shadow-sm">
            {imageUrl
              ? <img src={imageUrl} alt={release.name} className="max-h-full max-w-full object-contain" onError={e => { e.target.style.display='none' }} />
              : <span className="text-3xl">{cs.icon}</span>}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${cs.badge}`}>{cs.icon} {release.category}</span>
              {days !== null && type === 'upcoming' && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
                  {days === 0 ? "Aujourd'hui !" : days === 1 ? 'Demain !' : `J-${days}`}
                </span>
              )}
              {days !== null && type === 'recent' && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">il y a {days}j</span>
              )}
            </div>
            <h2 className="font-bold text-gray-900 text-base leading-snug">{release.name}</h2>
            {release.serie?.name && <p className="text-xs text-indigo-500 font-medium mt-0.5">{release.serie.name}</p>}
          </div>
          <button onClick={onClose} className="shrink-0 text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
        </div>
        {/* Body */}
        <div className="p-5 space-y-3">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span>📅</span>
            <span className="capitalize font-medium">{formatDate(release.releaseDate)}</span>
          </div>
          {release.description && (
            <p className="text-sm text-gray-600 leading-relaxed">{release.description}</p>
          )}
          {!release.description && (
            <p className="text-sm text-gray-400 italic">Pas de description disponible pour cette sortie.</p>
          )}
        </div>
      </div>
    </div>
  )
}

function ReleaseCard({ release, type, cachedImage, onClick }) {
  const [imgErr, setImgErr] = useState(false)
  const days = type === 'upcoming' ? daysUntil(release.releaseDate) : daysAgo(release.releaseDate)
  const cs = catStyle(release.category)
  const logoUrl = release.logo && !imgErr ? `${release.logo}.png` : null
  const imageUrl = cachedImage || logoUrl
  const isToday = days === 0
  const isTomorrow = days === 1

  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-2xl shadow-sm border overflow-hidden hover:shadow-md transition-all duration-200 flex flex-col cursor-pointer active:scale-[0.98] ${isToday || isTomorrow ? 'border-pokemon-red/40 ring-1 ring-pokemon-red/20' : 'border-gray-100'}`}
    >

      {/* Visual */}
      <div
        className={`relative flex items-center justify-center bg-gradient-to-br ${imageUrl ? '' : cs.bg} overflow-hidden`}
        style={{ background: imageUrl ? '#fff' : undefined, height: imageUrl ? '10rem' : '7rem' }}
      >
        {imageUrl ? (
          <img src={imageUrl} alt={release.name} className="max-h-36 max-w-full object-contain p-2 drop-shadow-sm" onError={() => setImgErr(true)} />
        ) : (
          <>
            <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle, rgba(0,0,0,0.15) 1px, transparent 1px)', backgroundSize: '16px 16px' }} />
            <span className="text-4xl opacity-60 select-none">{cs.icon}</span>
          </>
        )}

        {/* Countdown */}
        {days !== null && type === 'upcoming' && (
          <span className={`absolute top-2 right-2 text-[10px] font-bold px-2 py-0.5 rounded-full ${
            isToday     ? 'bg-pokemon-red text-white'
            : isTomorrow ? 'bg-orange-500 text-white'
            : days <= 7  ? 'bg-orange-100 text-orange-700'
            : days <= 30 ? 'bg-amber-100 text-amber-700'
            : 'bg-indigo-100 text-indigo-700'
          }`}>
            {isToday ? "Aujourd'hui !" : isTomorrow ? 'Demain !' : `J-${days}`}
          </span>
        )}
        {days !== null && type === 'recent' && (
          <span className="absolute top-2 right-2 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">il y a {days}j</span>
        )}

        {/* Category */}
        <span className={`absolute top-2 left-2 text-[9px] font-bold px-1.5 py-0.5 rounded-full ${cs.badge}`}>
          {cs.icon} {release.category || 'Extension'}
        </span>
      </div>

      <div className="px-3.5 py-3 flex-1 flex flex-col gap-1">
        <p className="font-bold text-gray-900 text-sm leading-snug line-clamp-2">{release.name}</p>
        {release.serie?.name && <p className="text-[11px] text-indigo-500 font-medium truncate">{release.serie.name}</p>}
        <p className="text-[11px] text-gray-400 mt-auto pt-1 capitalize">📅 {formatDate(release.releaseDate)}</p>
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
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Page principale
// ─────────────────────────────────────────────────────────────────────────────
export default function Releases() {
  const [tcgSets, setTcgSets]           = useState([])
  const [loading, setLoading]           = useState(true)
  const [error, setError]               = useState(null)
  const [tab, setTab]                   = useState('upcoming')
  const [monthsBack, setMonthsBack]     = useState(6)
  const [cachedImages, setCachedImages] = useState({})
  const [selectedRelease, setSelectedRelease] = useState(null)

  useEffect(() => {
    async function fetchSets() {
      try {
        const res = await fetch(`${TCGDEX_BASE}/sets`)
        if (!res.ok) throw new Error('HTTP ' + res.status)
        setTcgSets((await res.json()) || [])
      } catch {
        setError('TCGdex indisponible — les annonces officielles sont toujours affichées.')
      } finally {
        setLoading(false)
      }
    }
    fetchSets()
  }, [])

  // Images depuis le cache Supabase pour les produits statiques
  useEffect(() => {
    async function fetchImages() {
      const withKeyword = STATIC_UPCOMING.filter(r => r.searchKeyword)
      if (withKeyword.length === 0) return
      const results = {}
      await Promise.all(withKeyword.map(async r => {
        const { data } = await supabase
          .from('pokemon_products')
          .select('image_url')
          .ilike('name', `%${r.searchKeyword}%`)
          .limit(1)
          .maybeSingle()
        if (data?.image_url) results[r.id] = data.image_url
      }))
      setCachedImages(results)
    }
    fetchImages()
  }, [])

  const today = new Date(); today.setHours(0,0,0,0)
  const cutoff = new Date(today); cutoff.setMonth(cutoff.getMonth() - monthsBack)

  const staticIds = new Set(STATIC_UPCOMING.map(s => s.id))
  const mergedUpcoming = [
    ...STATIC_UPCOMING.filter(s => new Date(s.releaseDate + 'T00:00:00') >= today),
    ...tcgSets
      .filter(s => s.releaseDate && new Date(s.releaseDate + 'T00:00:00') > today && !staticIds.has(s.id))
      .map(s => ({ ...s, category: 'Extension' })),
  ].sort((a, b) => new Date(a.releaseDate) - new Date(b.releaseDate))

  const staticRecentIds = new Set([
    ...STATIC_RECENT.map(s => s.id),
    ...STATIC_UPCOMING.map(s => s.id),
  ])
  const recentSets = [
    // STATIC_UPCOMING items dont la date est maintenant passée
    ...STATIC_UPCOMING.filter(s => {
      const d = new Date(s.releaseDate + 'T00:00:00')
      return d < today && d >= cutoff
    }),
    // Données statiques récentes toujours présentes
    ...STATIC_RECENT.filter(s => new Date(s.releaseDate + 'T00:00:00') >= cutoff),
    // Données TCGdex (si disponibles) — on exclut les doublons avec les statiques
    ...tcgSets
      .filter(s => s.releaseDate
        && new Date(s.releaseDate + 'T00:00:00') < today
        && new Date(s.releaseDate + 'T00:00:00') >= cutoff
        && !staticRecentIds.has(s.id))
      .map(s => ({ ...s, category: 'Extension' })),
  ].sort((a, b) => new Date(b.releaseDate) - new Date(a.releaseDate))

  const nextRelease = mergedUpcoming[0] ?? null
  const upcomingGrouped = groupByDate(mergedUpcoming)

  return (
    <div className="max-w-5xl mx-auto space-y-6">

      {/* Modal détail */}
      {selectedRelease && (
        <ReleaseDetailModal
          release={selectedRelease.release}
          type={selectedRelease.type}
          cachedImage={cachedImages[selectedRelease.release.id] || null}
          onClose={() => setSelectedRelease(null)}
        />
      )}

      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">📅 Calendrier des sorties</h1>
        <p className="text-sm text-gray-500 mt-0.5">Extensions, coffrets &amp; produits Pokémon TCG</p>
      </div>

      {/* Tabs */}
      <div className="flex bg-gray-100 rounded-xl p-1 w-full sm:w-auto sm:inline-flex gap-1">
        {[
          { id: 'upcoming', label: '🔮 À venir', count: mergedUpcoming.length },
          { id: 'recent',   label: '✅ Récentes', count: loading ? null : recentSets.length },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              tab === t.id ? 'bg-white text-pokemon-blue shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
            {t.count != null && t.count > 0 && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${tab === t.id ? 'bg-blue-100 text-blue-700' : 'bg-gray-200 text-gray-500'}`}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {error && (
        <div className="bg-orange-50 border border-orange-200 rounded-2xl p-3 text-sm text-orange-700 flex items-center gap-2">
          ⚠️ {error}
        </div>
      )}

      {/* ── À VENIR ──────────────────────────────────────────────────────── */}
      {tab === 'upcoming' && (
        <>
          {/* Hero banner */}
          {nextRelease && (() => {
            const days = daysUntil(nextRelease.releaseDate)
            const heroImg = cachedImages[nextRelease.id] || (nextRelease.logo ? `${nextRelease.logo}.png` : null)
            const cs = catStyle(nextRelease.category)
            return (
              <div onClick={() => setSelectedRelease({ release: nextRelease, type: 'upcoming' })} className="bg-gradient-to-r from-indigo-600 to-blue-600 rounded-2xl p-4 sm:p-5 text-white flex items-center gap-4 shadow-lg cursor-pointer hover:opacity-95 transition-opacity">
                <div className="bg-white/15 rounded-xl shrink-0 w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center overflow-hidden">
                  {heroImg
                    ? <img src={heroImg} alt={nextRelease.name} className="max-h-full max-w-full object-contain" onError={e => { e.target.style.display='none' }} />
                    : <span className="text-3xl">{cs.icon}</span>}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                    <p className="text-xs font-semibold text-blue-200 uppercase tracking-wide">Prochaine sortie</p>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full opacity-90 ${cs.badge}`}>{nextRelease.category}</span>
                  </div>
                  <p className="text-base sm:text-lg font-bold leading-snug line-clamp-2">{nextRelease.name}</p>
                  {nextRelease.serie?.name && <p className="text-xs text-blue-200 mt-0.5">{nextRelease.serie.name}</p>}
                  <p className="text-sm text-blue-100 mt-1.5 flex items-center gap-2 flex-wrap">
                    📅 <span className="capitalize">{formatDate(nextRelease.releaseDate)}</span>
                    {days !== null && (
                      <span className="bg-white/25 px-2 py-0.5 rounded-full text-xs font-bold">
                        {days === 0 ? "Aujourd'hui !" : days === 1 ? 'Demain !' : `dans ${days} jour${days > 1 ? 's' : ''}`}
                      </span>
                    )}
                  </p>
                </div>
              </div>
            )
          })()}

          {upcomingGrouped.length === 0 ? (
            <div className="text-center py-14 text-gray-400">
              <p className="text-5xl mb-3">🔮</p>
              <p className="font-semibold">Aucune sortie annoncée pour le moment</p>
            </div>
          ) : (
            <div className="space-y-6">
              {upcomingGrouped.map(([date, releases]) => {
                const days = daysUntil(date)
                const isToday = days === 0
                const isTomorrow = days === 1
                return (
                  <div key={date}>
                    <div className="flex items-center gap-3 mb-3">
                      <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-bold capitalize ${
                        isToday    ? 'bg-pokemon-red text-white'
                        : isTomorrow ? 'bg-orange-500 text-white'
                        : days !== null && days <= 7 ? 'bg-orange-100 text-orange-700'
                        : 'bg-gray-100 text-gray-600'
                      }`}>
                        {formatDate(date)}
                        {days !== null && (
                          <span className="text-xs opacity-80">
                            {isToday ? "· Aujourd'hui !" : isTomorrow ? '· Demain !' : `· J-${days}`}
                          </span>
                        )}
                      </div>
                      <div className="flex-1 h-px bg-gray-100" />
                      <span className="text-xs text-gray-400">{releases.length} sortie{releases.length > 1 ? 's' : ''}</span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                      {releases.map(r => (
                        <ReleaseCard key={r.id} release={r} type="upcoming" cachedImage={cachedImages[r.id]} onClick={() => setSelectedRelease({ release: r, type: 'upcoming' })} />
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* ── RÉCENTES ────────────────────────────────────────────────────── */}
      {tab === 'recent' && (
        loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : recentSets.length === 0 ? (
          <div className="text-center py-14 text-gray-400">
            <p className="text-5xl mb-3">📦</p>
            <p className="font-semibold">Aucune extension dans les {monthsBack} derniers mois</p>
            <button onClick={() => setMonthsBack(m => m + 6)} className="mt-3 text-sm text-blue-600 hover:underline font-medium">
              Voir les {monthsBack + 6} derniers mois
            </button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {recentSets.map(set => <ReleaseCard key={set.id} release={set} type="recent" cachedImage={cachedImages[set.id] || null} onClick={() => setSelectedRelease({ release: set, type: 'recent' })} />)}
            </div>
            <div className="flex justify-center">
              <button onClick={() => setMonthsBack(m => m + 6)} className="text-sm text-blue-600 font-medium bg-blue-50 hover:bg-blue-100 px-4 py-2 rounded-xl transition-colors">
                Voir plus (+ 6 mois)
              </button>
            </div>
          </>
        )
      )}

      <p className="text-center text-xs text-gray-300 pb-2">
        Données <a href="https://tcgdex.dev" target="_blank" rel="noreferrer" className="underline">TCGdex</a> · Annonces <a href="https://www.pokemon.com/fr/pokemon-tcg" target="_blank" rel="noreferrer" className="underline">Pokémon.com</a>
      </p>
    </div>
  )
}
