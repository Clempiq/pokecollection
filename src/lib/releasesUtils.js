<<<<<<< HEAD
/**
 * Utilitaires pour la page des Sorties (Releases).
 * Extraits dans ce module pour permettre les tests unitaires.
 */

/**
 * Formate une date ISO (YYYY-MM-DD) en français lisible.
 * ex: "2026-03-20" → "vendredi 20 mars"
 */
export function formatDate(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
}

/**
 * Retourne le nombre de jours jusqu'à une date (positive = futur, 0 = aujourd'hui).
 * Retourne null si dateStr est falsy.
 */
export function daysUntil(dateStr) {
  if (!dateStr) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.round((new Date(dateStr + 'T00:00:00') - today) / 86_400_000)
}

/**
 * Retourne le nombre de jours écoulés depuis une date (positive = passé).
 * Retourne null si dateStr est falsy.
 */
export function daysAgo(dateStr) {
  if (!dateStr) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.round((today - new Date(dateStr + 'T00:00:00')) / 86_400_000)
}

/**
 * Groupe une liste de sorties par date et retourne un tableau trié
 * de paires [dateStr, releases[]] dans l'ordre chronologique ascendant.
 *
 * @param {Array<{releaseDate: string}>} releases
 * @returns {Array<[string, Array]>}
 */
export function groupByDate(releases) {
  const map = {}
  releases.forEach((r) => {
    if (!map[r.releaseDate]) map[r.releaseDate] = []
    map[r.releaseDate].push(r)
  })
  return Object.entries(map).sort((a, b) => new Date(a[0]) - new Date(b[0]))
}
=======
export function formatDate(date) {
  return new Date(date).toLocaleDateString('fr-FR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export function daysSince(date) {
  const now = new Date()
  const then = new Date(date)
  const diff = now.getTime() - then.getTime()
  return Math.floor(diff / (1000 * 60 * 60 * 24))
}

export function daysUntil(date) {
  const now = new Date()
  const target = new Date(date)
  const diff = target.getTime() - now.getTime()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

export function groupReleasesByDate(releases) {
  const grouped = {}
  releases.forEach(r => {
    const key = new Date(r.date).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
    })
    if (!grouped[key]) grouped[key] = []
    grouped[key].push(r)
  })
  return grouped
}
>>>>>>> 75bda405994aff8b32f967b0793cc12339417565
