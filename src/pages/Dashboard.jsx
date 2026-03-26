import { useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import PWAInstallButton from '../components/PWAInstallButton'

// ─────────────────────────────────────────────────────────────────────────────
// Stat card
// ─────────────────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, color, icon }) {
  // color can be 'emerald' | 'red' | undefined (neutral)
  const valueStyle = color === 'emerald'
    ? { color: 'var(--green)' }
    : color === 'red'
    ? { color: 'var(--red)' }
    : { color: 'var(--text-primary)' }
  return (
    <div className="rounded-2xl p-4 sm:p-5" style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[10px] sm:text-xs font-medium uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>{label}</p>
          <p className="text-xl sm:text-2xl font-bold truncate" style={valueStyle}>{value}</p>
          {sub && <p className="text-[10px] sm:text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{sub}</p>}
        </div>
        {icon && <span className="text-2xl shrink-0 opacity-70">{icon}</span>}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// SVG sparkline chart
// ─────────────────────────────────────────────────────────────────────────────
function ValueChart({ snapshots }) {
  const W = 600
  const H = 90
  const PAD_X = 2
  const PAD_Y = 10

  const points = useMemo(() => {
    if (!snapshots || snapshots.length === 0) return []
    return snapshots
      .slice()
      .sort((a, b) => a.snapshot_date.localeCompare(b.snapshot_date))
  }, [snapshots])

  if (points.length < 2) {
    return (
      <div className="flex flex-col items-center justify-center h-24 text-xs gap-1" style={{ color: 'var(--text-muted)' }}>
        <span className="text-2xl">📊</span>
        <span>Le graphe s'enrichit chaque jour automatiquement</span>
      </div>
    )
  }

  const values   = points.map(p => Number(p.total_value))
  const minV     = Math.min(...values)
  const maxV     = Math.max(...values)
  const rangeV   = maxV - minV || 1

  const toX = (i) => PAD_X + (i / (points.length - 1)) * (W - PAD_X * 2)
  const toY = (v) => PAD_Y + (1 - (v - minV) / rangeV) * (H - PAD_Y * 2)

  const linePath = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${toX(i).toFixed(1)},${toY(Number(p.total_value)).toFixed(1)}`)
    .join(' ')

  const fillPath =
    `M${toX(0).toFixed(1)},${H} ` +
    points.map((p, i) => `L${toX(i).toFixed(1)},${toY(Number(p.total_value)).toFixed(1)}`).join(' ') +
    ` L${toX(points.length - 1).toFixed(1)},${H} Z`

  const first   = values[0]
  const last    = values[values.length - 1]
  const isUp    = last >= first
  const color   = isUp ? '#10b981' : '#ef4444'
  const fillId  = 'chartFill'

  // Change % labels
  const weekAgo  = points.length >= 7  ? values[Math.max(0, points.length - 8)]  : first
  const monthAgo = points.length >= 30 ? values[Math.max(0, points.length - 31)] : first
  const pctWeek  = weekAgo  > 0 ? ((last - weekAgo)  / weekAgo  * 100) : 0
  const pctMonth = monthAgo > 0 ? ((last - monthAgo) / monthAgo * 100) : 0

  return (
    <div className="space-y-3">
      {/* Delta badges */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-xs font-bold" style={{ color: 'var(--text-secondary)' }}>Valeur estimée</span>
        {points.length >= 7 && (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
            style={pctWeek >= 0
              ? { backgroundColor: 'var(--green-subtle)', color: 'var(--green)' }
              : { backgroundColor: 'var(--red-subtle)', color: 'var(--red)' }}>
            7j : {pctWeek >= 0 ? '+' : ''}{pctWeek.toFixed(1)}%
          </span>
        )}
        {points.length >= 30 && (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
            style={pctMonth >= 0
              ? { backgroundColor: 'var(--green-subtle)', color: 'var(--green)' }
              : { backgroundColor: 'var(--red-subtle)', color: 'var(--red)' }}>
            30j : {pctMonth >= 0 ? '+' : ''}{pctMonth.toFixed(1)}%
          </span>
        )}
        <span className="ml-auto text-[10px]" style={{ color: 'var(--text-muted)' }}>{points.length} points · {points[0].snapshot_date} → {points[points.length - 1].snapshot_date}</span>
      </div>

      {/* SVG chart */}
      <div className="relative overflow-hidden rounded-xl">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          className="w-full"
          style={{ height: '80px' }}
        >
          <defs>
            <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.25" />
              <stop offset="100%" stopColor={color} stopOpacity="0.02" />
            </linearGradient>
          </defs>

          {/* Grid lines (faint) — use theme-aware opacity instead of hardcoded color */}
          {[0.25, 0.5, 0.75].map(r => (
            <line
              key={r}
              x1={PAD_X} y1={(H * r).toFixed(1)}
              x2={W - PAD_X} y2={(H * r).toFixed(1)}
              stroke="currentColor" strokeWidth="0.8" strokeOpacity="0.12"
            />
          ))}

          {/* Gradient fill */}
          <path d={fillPath} fill={`url(#${fillId})`} />

          {/* Line */}
          <path d={linePath} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

          {/* Last point dot */}
          <circle
            cx={toX(points.length - 1).toFixed(1)}
            cy={toY(last).toFixed(1)}
            r="4" fill={color} stroke="white" strokeWidth="2"
          />
        </svg>

        {/* Y labels */}
        <div className="absolute inset-y-0 right-1 flex flex-col justify-between py-1 pointer-events-none">
          <span className="text-[9px] leading-none" style={{ color: 'var(--text-muted)' }}>{maxV.toFixed(0)} €</span>
          <span className="text-[9px] leading-none" style={{ color: 'var(--text-muted)' }}>{minV.toFixed(0)} €</span>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Dashboard
// ─────────────────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const { user, profile } = useAuth()
  const [stats, setStats]           = useState(null)
  const [recentItems, setRecentItems] = useState([])
  const [snapshots, setSnapshots]   = useState([])
  const [loading, setLoading]       = useState(true)

  useEffect(() => {
    async function fetchData() {
      // ── Load items ──────────────────────────────────────────────────────
      const { data: items } = await supabase
        .from('items')
        .select('*')
        .eq('user_id', user.id)

      let computedStats = null
      if (items) {
        // Seuls les items scellés (active) comptent pour la valeur de la collection
        const activeItems  = items.filter(i => !i.status || i.status === 'active')
        const soldItems    = items.filter(i => i.status === 'sold')
        const openedItems  = items.filter(i => i.status === 'opened')

        const totalItems    = activeItems.reduce((s, i) => s + i.quantity, 0)
        const uniqueSets    = new Set(activeItems.map(i => i.set_name)).size
        const totalPurchase = activeItems.reduce((s, i) => s + (i.purchase_price || 0) * i.quantity, 0)
        const totalCurrent  = activeItems.reduce((s, i) => s + (i.current_value  || 0) * i.quantity, 0)
        const pnl           = totalCurrent - totalPurchase

        // Stats items vendus
        const soldCount   = soldItems.reduce((s, i) => s + i.quantity, 0)
        const soldRevenue = soldItems.reduce((s, i) => s + (i.sold_price    || 0) * i.quantity, 0)
        const soldCost    = soldItems.reduce((s, i) => s + (i.purchase_price || 0) * i.quantity, 0)
        const soldPnL     = soldRevenue - soldCost

        // Stats items descellés (valeur "consommée")
        const openedCount = openedItems.reduce((s, i) => s + i.quantity, 0)
        const openedCost  = openedItems.reduce((s, i) => s + (i.purchase_price || 0) * i.quantity, 0)

        computedStats = { totalItems, uniqueSets, totalPurchase, totalCurrent, pnl, count: activeItems.length, soldCount, soldRevenue, soldCost, soldPnL, openedCount, openedCost }
        setStats(computedStats)
        setRecentItems([...items].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 5))

        // ── Auto-save today's snapshot (upsert — idempotent) ────────────
        const today = new Date().toISOString().split('T')[0]
        if (totalCurrent > 0 || totalPurchase > 0) {
          await supabase
            .from('collection_snapshots')
            .upsert({
              user_id:       user.id,
              snapshot_date: today,
              total_value:   totalCurrent,
              total_cost:    totalPurchase,
              item_count:    totalItems,
            }, { onConflict: 'user_id,snapshot_date' })
        }
      }

      // ── Load snapshot history (last 90 days) ────────────────────────
      const since = new Date()
      since.setDate(since.getDate() - 90)
      const { data: snaps } = await supabase
        .from('collection_snapshots')
        .select('snapshot_date, total_value, total_cost, item_count')
        .eq('user_id', user.id)
        .gte('snapshot_date', since.toISOString().split('T')[0])
        .order('snapshot_date', { ascending: true })

      setSnapshots(snaps || [])
      setLoading(false)
    }
    fetchData()
  }, [user.id])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-pokemon-red border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const pnlColor = stats?.pnl >= 0 ? 'emerald' : 'red'

  return (
    <div className="space-y-6 sm:space-y-8">

      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
            Bonjour, {profile?.username || user.email?.split('@')[0]} 👋
          </h1>
          <p className="text-gray-400 text-xs sm:text-sm mt-0.5">Voici un résumé de ta collection</p>
        </div>
        <Link to="/collection" className="btn-primary flex items-center gap-1.5 shrink-0 text-sm">
          <span>+</span>
          <span className="hidden sm:inline">Ajouter un item</span>
          <span className="sm:hidden">Ajouter</span>
        </Link>
      </div>

      {/* PWA install — mobile only */}
      <div className="sm:hidden">
        <PWAInstallButton variant="banner" />
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard label="Items scellés"   value={stats?.totalItems ?? 0}                                           sub={`${stats?.count ?? 0} référence${(stats?.count ?? 0) > 1 ? 's' : ''}`} icon="📦" />
        <StatCard label="Extensions"      value={stats?.uniqueSets ?? 0}                                           sub="sets différents"                               icon="🎴" />
        <StatCard label="Investissement"  value={`${stats?.totalPurchase?.toFixed(0) ?? '0'} €`}                   sub={`Valeur : ${stats?.totalCurrent?.toFixed(2) ?? '0.00'} €`} icon="🛒" />
        <StatCard label="P&L"
          value={`${stats?.pnl >= 0 ? '+' : ''}${stats?.pnl?.toFixed(0) ?? '0'} €`}
          sub={`Valeur: ${stats?.totalCurrent?.toFixed(2) ?? '0.00'} €`}
          color={stats?.pnl ? pnlColor : undefined}
          icon={stats?.pnl >= 0 ? '📈' : '📉'}
        />
      </div>

      {/* Stats items vendus / descellés */}
      {((stats?.soldCount ?? 0) > 0 || (stats?.openedCount ?? 0) > 0) && (
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          {(stats?.soldCount ?? 0) > 0 && (
            <div className="rounded-2xl p-4 flex items-center gap-3" style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
              <span className="text-2xl">💸</span>
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Vendus</p>
                <p className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{stats.soldCount} item{stats.soldCount > 1 ? 's' : ''}</p>
                {stats.soldRevenue > 0 && (
                  <p className="text-xs font-medium" style={{ color: 'var(--green)' }}>+{stats.soldRevenue.toFixed(0)} € encaissés</p>
                )}
                {stats.soldCost > 0 && (
                  <p className="text-xs" style={{ color: stats.soldPnL >= 0 ? 'var(--green)' : 'var(--red)' }}>
                    P&L vente : {stats.soldPnL >= 0 ? '+' : ''}{stats.soldPnL.toFixed(0)} €
                  </p>
                )}
              </div>
            </div>
          )}
          {(stats?.openedCount ?? 0) > 0 && (
            <div className="rounded-2xl p-4 flex items-center gap-3" style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
              <span className="text-2xl">📭</span>
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Descellés</p>
                <p className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{stats.openedCount} item{stats.openedCount > 1 ? 's' : ''}</p>
                {stats.openedCost > 0 && (
                  <p className="text-xs font-medium" style={{ color: 'var(--red)' }}>−{stats.openedCost.toFixed(0)} € de valeur scellée perdue</p>
                )}
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Non comptés dans la collection</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Value evolution chart ─────────────────────────────────────────── */}
      <div className="rounded-2xl p-4 sm:p-5" style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
        <ValueChart snapshots={snapshots} />
      </div>

      {/* Recent items */}
      <div>
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <h2 className="text-base sm:text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Derniers ajouts</h2>
          <Link to="/" className="text-sm font-medium" style={{ color: 'var(--red)' }}>Voir tout →</Link>
        </div>

        {recentItems.length === 0 ? (
          <div className="rounded-2xl p-10 text-center" style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
            <div className="text-5xl mb-4">📦</div>
            <p className="font-semibold" style={{ color: 'var(--text-secondary)' }}>Ta collection est vide pour l'instant</p>
            <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Commence par ajouter ton premier item scellé !</p>
            <Link to="/" className="btn-primary inline-block mt-4">Ajouter un item</Link>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden sm:block rounded-2xl overflow-hidden" style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
              <table className="w-full text-sm">
                <thead style={{ backgroundColor: 'var(--bg-subtle)', borderBottom: '1px solid var(--border)' }}>
                  <tr>
                    {['Item', 'Set', 'Type', 'Qté', 'Valeur'].map((h, i) => (
                      <th key={h} className={`py-3 px-4 text-xs font-semibold uppercase ${i >= 3 ? 'text-right' : 'text-left'}`} style={{ color: 'var(--text-muted)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {recentItems.map((item, i) => (
                    <tr key={item.id} style={{ backgroundColor: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.025)' }}>
                      <td className="py-3 px-4 font-medium max-w-48 truncate" style={{ color: 'var(--text-primary)' }}>
                        {item.full_data?.name_fr || item.name || <span className="italic font-normal" style={{ color: 'var(--text-muted)' }}>Sans nom</span>}
                      </td>
                      <td className="py-3 px-4 max-w-32 truncate" style={{ color: 'var(--text-secondary)' }}>{item.set_name}</td>
                      <td className="py-3 px-4">
                        <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: 'var(--accent-subtle)', color: 'var(--accent-text)' }}>{item.item_type}</span>
                      </td>
                      <td className="py-3 px-4 text-right" style={{ color: 'var(--text-secondary)' }}>{item.quantity}</td>
                      <td className="py-3 px-4 text-right font-medium" style={{ color: 'var(--text-secondary)' }}>
                        {item.current_value
                          ? `${(item.current_value * item.quantity).toFixed(2)} €`
                          : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="sm:hidden space-y-2">
              {recentItems.map(item => (
                <div key={item.id} className="rounded-xl p-3 flex items-center gap-3" style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
                  {item.api_image_url ? (
                    <img src={item.api_image_url} alt={item.name} className="w-10 h-10 object-contain rounded-lg shrink-0" style={{ backgroundColor: 'var(--bg-subtle)' }} onError={e => { e.target.style.display='none' }} />
                  ) : (
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0" style={{ backgroundColor: 'var(--accent-subtle)' }}>📦</div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate" style={{ color: 'var(--text-primary)' }}>
                      {item.full_data?.name_fr || item.name || <span className="italic font-normal" style={{ color: 'var(--text-muted)' }}>Sans nom</span>}
                    </p>
                    <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{item.set_name} · {item.item_type}</p>
                  </div>
                  <div className="text-right shrink-0">
                    {item.current_value
                      ? <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{(item.current_value * item.quantity).toFixed(2)} €</p>
                      : <p className="text-sm" style={{ color: 'var(--text-muted)' }}>—</p>}
                    <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>×{item.quantity}</p>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Quick actions — mobile */}
      <div className="sm:hidden grid grid-cols-2 gap-3">
        <Link to="/" className="rounded-2xl p-4 flex items-center gap-3 transition-opacity hover:opacity-80" style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
          <span className="text-2xl">📦</span>
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Collection</p>
            <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Gérer mes items</p>
          </div>
        </Link>
        <Link to="/friends" className="rounded-2xl p-4 flex items-center gap-3 transition-opacity hover:opacity-80" style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
          <span className="text-2xl">👥</span>
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Amis</p>
            <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Voir les collections</p>
          </div>
        </Link>
      </div>
    </div>
  )
}
