import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const STATIC_RELEASES = [
  { name: 'Stellar Crown', date: '2024-09-13', type: 'booster' },
  { name: 'Surging Sparks', date: '2024-12-13', type: 'booster' },
  { name: 'Shrouded Folds', date: '2025-01-24', type: 'booster' },
]

function formatDate(date) {
  return new Date(date).toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' })
}

function daysUntil(date) {
  const now = new Date()
  const target = new Date(date)
  const diff = target.getTime() - now.getTime()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

function groupByDate(releases) {
  const grouped = {}
  releases.forEach(r => {
    const key = new Date(r.date).toLocaleDateString('fr-FR', { year: 'numeric', month: 'long' })
    if (!grouped[key]) grouped[key] = []
    grouped[key].push(r)
  })
  return grouped
}

export default function Releases() {
  const [releases, setReleases] = useState(STATIC_RELEASES)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchSets = async () => {
      try {
        const res = await fetch('https://api.tcgdex.net/v2/en/sets')
        const data = await res.json()
        const futureReleases = data
          .filter(s => s.releaseDate && new Date(s.releaseDate) > new Date())
          .map(s => ({ name: s.name, date: s.releaseDate, type: 'booster' }))
        setReleases([...STATIC_RELEASES, ...futureReleases].sort((a, b) => new Date(a.date) - new Date(b.date)))
      } catch (err) {
        console.error('Failed to fetch releases:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchSets()
  }, [])

  const grouped = groupByDate(releases)

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Calendrier des sorties</h1>
        <p className="text-gray-500 text-sm mt-1">Consultez les sorties prévues des nouveaux sets</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-2 border-pokemon-red border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([month, items]) => (
            <div key={month}>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">{month}</h2>
              <div className="space-y-2">
                {items.map((r, i) => {
                  const days = daysUntil(r.date)
                  return (
                    <div key={i} className="card p-4 flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">{r.name}</p>
                        <p className="text-xs text-gray-500">{formatDate(r.date)}</p>
                      </div>
                      <span className={`text-sm font-medium px-3 py-1 rounded-full ${
                        days <= 7 ? 'bg-red-100 text-red-700' :
                        days <= 30 ? 'bg-yellow-100 text-yellow-700' :
                        'bg-blue-100 text-blue-700'
                      }`}>
                        {days > 0 ? `J-${days}` : 'Disponible'}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
