import { useEffect, useState } from 'react'
import { useBadges } from '../hooks/useBadges'

const CATEGORY_LABELS = {
  collection: 'Collection',
  valeur: 'Valeur',
  social: 'Social',
  fidelite: 'Fidélité',
  wishlist: 'Wishlist',
  special: 'Spécial',
}

const RARITY_COLORS = {
  common: 'var(--text-muted)',
  rare: '#3b82f6',
  epic: '#a855f7',
  legendary: '#fbbf24',
}

const RARITY_BG = {
  common: 'rgba(85, 85, 110, 0.2)',
  rare: 'rgba(59, 130, 246, 0.15)',
  epic: 'rgba(168, 85, 247, 0.15)',
  legendary: 'rgba(251, 191, 36, 0.15)',
}

export default function BadgesSection() {
  const { badges, userBadges, newBadges, setNewBadges, loading, checkBadges, isUnlocked, unlockedAt } = useBadges()
  const [notificationBadge, setNotificationBadge] = useState(null)
  const [notificationTimer, setNotificationTimer] = useState(null)

  // Appeler checkBadges au montage
  useEffect(() => {
    checkBadges()
  }, [checkBadges])

  // Afficher la notification des nouveaux badges
  useEffect(() => {
    if (newBadges && newBadges.length > 0) {
      const badge = badges.find(b => b.id === newBadges[0])
      if (badge) {
        setNotificationBadge(badge)
        clearTimeout(notificationTimer)
        const timer = setTimeout(() => {
          setNotificationBadge(null)
          setNewBadges([])
        }, 3000)
        setNotificationTimer(timer)
      }
    }
  }, [newBadges, badges, setNewBadges, notificationTimer])

  if (loading) {
    return (
      <div className="card p-6">
        <p className="text-sm text-gray-400">Chargement des trophées...</p>
      </div>
    )
  }

  const unlockedCount = userBadges.length
  const totalCount = badges.length

  // Grouper les badges par catégorie
  const badgesByCategory = {}
  badges.forEach(badge => {
    if (!badgesByCategory[badge.category]) {
      badgesByCategory[badge.category] = []
    }
    badgesByCategory[badge.category].push(badge)
  })

  // Trier les catégories dans un ordre défini
  const categoryOrder = ['collection', 'valeur', 'social', 'fidelite', 'wishlist', 'special']
  const sortedCategories = categoryOrder.filter(cat => badgesByCategory[cat])

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-bold text-gray-900">Mes Trophées</h2>
        <p className="text-sm text-gray-500">
          {unlockedCount} / {totalCount} débloqués
        </p>
      </div>

      {/* Notification des nouveaux badges */}
      {notificationBadge && (
        <div
          className="mb-4 p-4 rounded-lg flex items-center gap-3 animate-pulse"
          style={{
            background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.2), rgba(168, 85, 247, 0.2))',
            borderLeft: '4px solid var(--yellow)',
          }}
        >
          <span className="text-3xl">{notificationBadge.icon}</span>
          <div>
            <p className="font-semibold text-sm">🎉 Nouveau trophée débloqué !</p>
            <p className="text-xs text-gray-500">{notificationBadge.label}</p>
          </div>
        </div>
      )}

      {/* Catégories et badges */}
      <div className="space-y-8">
        {sortedCategories.map(category => (
          <div key={category}>
            <h3 className="text-sm font-semibold text-gray-600 mb-3 uppercase tracking-wide">
              {CATEGORY_LABELS[category]}
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {badgesByCategory[category].map(badge => {
                const unlocked = isUnlocked(badge.id)
                const unlockedTime = unlockedAt(badge.id)
                const rarityColor = RARITY_COLORS[badge.rarity] || RARITY_COLORS.common
                const rarityBg = RARITY_BG[badge.rarity] || RARITY_BG.common

                return (
                  <div
                    key={badge.id}
                    className="relative group"
                    title={unlocked ? `Débloqué le ${new Date(unlockedTime).toLocaleDateString('fr-FR')}` : badge.description}
                  >
                    {/* Badge card */}
                    <div
                      className={`
                        flex flex-col items-center justify-center
                        w-full aspect-square
                        rounded-lg border-2 transition-all duration-200
                        ${
                          unlocked
                            ? 'border-amber-400/50 bg-opacity-100 cursor-pointer hover:border-amber-300 hover:shadow-lg'
                            : 'border-gray-600 opacity-50 cursor-not-allowed'
                        }
                      `}
                      style={{
                        backgroundColor: unlocked ? rarityBg : 'rgba(0,0,0,0.15)',
                        borderColor: unlocked ? rarityColor : 'var(--border-strong)',
                      }}
                    >
                      {/* Icon ou cadenas */}
                      {unlocked ? (
                        <span className="text-4xl mb-1">{badge.icon}</span>
                      ) : (
                        <span className="text-4xl mb-1 opacity-40">🔒</span>
                      )}

                      {/* Label */}
                      <p
                        className="text-xs font-semibold text-center px-1 leading-tight"
                        style={{ color: unlocked ? rarityColor : 'var(--text-muted)' }}
                      >
                        {badge.label}
                      </p>
                    </div>

                    {/* Tooltip au survol */}
                    <div
                      className={`
                        absolute bottom-full left-1/2 transform -translate-x-1/2
                        mb-2 hidden group-hover:block
                        bg-gray-900 text-white text-xs px-2 py-1 rounded
                        whitespace-nowrap z-10 pointer-events-none
                        border border-gray-700 shadow-lg
                      `}
                    >
                      {badge.description}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
