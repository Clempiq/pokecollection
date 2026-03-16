import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

function StatCard({ label, value, sub, color, icon }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[10px] sm:text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">{label}</p>
          <p className={`text-xl sm:text-2xl font-bold truncate ${color || 'text-gray-900'}`}>{value}</p>
          {sub && <p className="text-[10px] sm:text-xs text-gray-400 mt-0.5">{sub}</p>}
        </div>
        {icon && <span className="text-2xl shrink-0 opacity-70">{icon}</span>}
      </div>
    </div>
  )
}

export default function Dashboard() {
  const { user, profile } = useAuth()
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
        setRecentItems([...items].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 5))
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

  const pnlColor = stats?.pnl >= 0 ? 'text-emerald-600' : 'text-red-600'

  return (
    <div className="space-y-6 sm:space-y-8">

      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
            Bonjour, {profile?.first_name || user.email} 👋
          </h1>
          <p className="text-gray-400 text-xs sm:text-sm mt-0.5">Voici un résumé de ta collection</p>
        </div>
        <Link to="/collection" className="btn-primary flex items-center gap-1.5 shrink-0 text-sm">
          <span>+</span>
          <span className="hidden sm:inline">Ajouter un item</span>
          <span className="sm:hidden">Ajouter</span>
        </Link>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          label="Items scellés"
          value={stats?.totalItems ?? 0}
          sub={`${stats?.count ?? 0} références`}
          icon="📦"
        />
        <StatCard
          label="Extensions"
          value={stats?.uniqueSets ?? 0}
          sub="sets différents"
          icon="🎴"
        />
        <StatCard
          label="Investissement"
          value={`${stats?.totalPurchase?.toFixed(0) ?? '0'} €`}
          sub={`${stats?.totalPurchase?.toFixed(2) ?? '0.00'} €`}
          icon="🛒"
        />
        <StatCard
          label="P&L"
          value={`${stats?.pnl >= 0 ? '+' : ''}${stats?.pnl?.toFixed(0) ?? '0'} €`}
          sub={`Valeur: ${stats?.totalCurrent?.toFixed(2) ?? '0.00'} €`}
          color={stats?.pnl ? pnlColor : 'text-gray-900'}
          icon={stats?.pnl >= 0 ? '📈' : '📉'}
        />
      </div>

      {/* Recent items */}
      <div>
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <h2 className="text-base sm:text-lg font-bold text-gray-900">Derniers ajouts</h2>
          <Link to="/collection" className="text-sm text-pokemon-red hover:underline font-medium">
            Voir tout →
          </Link>
        </div>

        {recentItems.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center">
            <div className="text-5xl mb-4">📦</div>
            <p className="text-gray-600 font-semibold">Ta collection est vide pour l'instant</p>
            <p className="text-gray-400 text-sm mt-1">Commence par ajouter ton premier item scellé !</p>
            <Link to="/collection" className="btn-primary inline-block mt-4">Ajouter un item</Link>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden sm:block bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
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
                      <td className="py-3 px-4 font-medium text-gray-900 max-w-48 truncate">
                        {item.name || <span className="text-gray-400 italic">Sans nom</span>}
                      </td>
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

            {/* Mobile cards */}
            <div className="sm:hidden space-y-2">
              {recentItems.map(item => (
                <div key={item.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center text-lg shrink-0">
                    📦
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 text-sm truncate">
                      {item.name || <span className="text-gray-400 italic font-normal">Sans nom</span>}
                    </p>
                    <p className="text-xs text-gray-400 truncate">{item.set_name} · {item.item_type}</p>
                  </div>
                  <div className="text-right shrink-0">
                    {item.current_value ? (
                      <p className="text-sm font-bold text-gray-800">{(item.current_value * item.quantity).toFixed(2)} €</p>
                    ) : (
                      <p className="text-sm text-gray-300">—</p>
                    )}
                    <p className="text-[10px] text-gray-400">×{item.quantity}</p>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Quick actions — mobile */}
      <div className="sm:hidden grid grid-cols-2 gap-3">
        <Link to="/collection" className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3 hover:shadow-md transition-shadow">
          <span className="text-2xl">📦</span>
          <div>
            <p className="text-sm font-semibold text-gray-800">Collection</p>
            <p className="text-[10px] text-gray-400">Gérer mes items</p>
          </div>
        </Link>
        <Link to="/friends" className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3 hover:shadow-md transition-shadow">
          <span className="text-2xl">👥</span>
          <div>
            <p className="text-sm font-semibold text-gray-800">Amis</p>
            <p className="text-[10px] text-gray-400">Voir les collections</p>
          </div>
        </Link>
      </div>
    </div>
  )
}
