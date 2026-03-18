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
