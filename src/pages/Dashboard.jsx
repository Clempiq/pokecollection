import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

function StatCard({ label, value, sub, color }) {
  return (
    <div className="card p-5">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">{label}</p>
      <p className={`text-2xl font-bold ${color || 'text-gray-900'}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  )
}

export default function Dashboard() {
  const { user } = useAuth()
  const [stats, setStats] = useState(null)
  const [recentItems, setRecentItems] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      const { data: items } = await supabase
        .from('items')
        .select('*')
        .eq('user_id', user.id)

      if (items) {
        const totalItems = items.reduce((sum, i) => sum + i.quantity, 0)
        const uniqueSets = new Set(items.map(i => i.set_name)).size
        const totalPurchase = items.reduce((sum, i) => sum + (i.purchase_price || 0) * i.quantity, 0)
        const totalCurrent = items.reduce((sum, i) => sum + (i.current_value || 0) * i.quantity, 0)
        const pnl = totalCurrent - totalPurchase

        setStats({ totalItems, uniqueSets, totalPurchase, totalCurrent, pnl, count: items.length })

        const recent = [...items].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 5)
        setRecentItems(recent)
      }
      setLoading(false)
    }
    fetchData()
  }, [user.id])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-pokemon-red border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  const pnlColor = stats?.pnl >= 0 ? 'text-green-600' : 'text-red-600'

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 text-sm mt-0.5">Bienvenue, {user.email}</p>
        </div>
        <Link to="/collection" className="btn-primary flex items-center gap-2">
          <span>+</span> Ajouter un item
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Items scellés" value={stats?.totalItems ?? 0} sub={`${stats?.count ?? 0} références`} />
        <StatCard label="Extensions" value={stats?.uniqueSets ?? 0} sub="sets différents" />
        <StatCard
          label="Investissement total"
          value={`${stats?.totalPurchase?.toFixed(2) ?? '0.00'} €`}
          sub="prix d'achat"
        />
        <StatCard
          label="P&L"
          value={`${stats?.pnl >= 0 ? '+' : ''}${stats?.pnl?.toFixed(2) ?? '0.00'} €`}
          sub={`Valeur actuelle: ${stats?.totalCurrent?.toFixed(2) ?? '0.00'} €`}
          color={stats?.pnl ? pnlColor : 'text-gray-900'}
        />
      </div>

      {/* Recent items */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900">Derniers ajouts</h2>
          <Link to="/collection" className="text-sm text-pokemon-red hover:underline font-medium">
            Voir tout →
          </Link>
        </div>

        {recentItems.length === 0 ? (
          <div className="card p-12 text-center">
            <div className="text-5xl mb-4">📦</div>
            <p className="text-gray-500 font-medium">Ta collection est vide pour l'instant</p>
            <p className="text-gray-400 text-sm mt-1">Commence par ajouter ton premier item scellé !</p>
            <Link to="/collection" className="btn-primary inline-block mt-4">
              Ajouter un item
            </Link>
          </div>
        ) : (
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Item</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Set</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Type</th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Qté</th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Valeur</th>
                </tr>
              </thead>
              <tbody>
                {recentItems.map((item, i) => (
                  <tr key={item.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                    <td className="py-3 px-4 font-medium text-gray-900 max-w-48 truncate">{item.name}</td>
                    <td className="py-3 px-4 text-gray-500 max-w-32 truncate">{item.set_name}</td>
                    <td className="py-3 px-4">
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{item.item_type}</span>
                    </td>
                    <td className="py-3 px-4 text-right text-gray-700">{item.quantity}</td>
                    <td className="py-3 px-4 text-right font-medium text-gray-700">
                      {item.current_value
                        ? `${(item.current_value * item.quantity).toFixed(2)} €`
                        : <span className="text-gray-300">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
