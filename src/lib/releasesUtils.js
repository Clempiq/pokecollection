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
