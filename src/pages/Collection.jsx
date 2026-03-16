import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import ItemCard from '../components/ItemCard'
import ItemFormModal from '../components/ItemFormModal'
import { useItemOptions } from '../lib/itemOptions'

export default function Collection() {
  const { user } = useAuth()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [filterType, setFilterType] = useState('Tous')
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState('created_at')
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [likeCounts, setLikeCounts] = useState({})
  const { types } = useItemOptions()

  const fetchItems = async () => {
    const { data } = await supabase
      .from('items')
      .select('*')
      .eq('user_id', user.id)
      .order(sortBy, { ascending: sortBy === 'name' })
    setItems(data || [])
    setLoading(false)

    if (data && data.length > 0) {
      const ids = data.map(i => i.id)
      const { data: likes } = await supabase
        .from('item_likes')
        .select('item_id')
        .in('item_id', ids)
      const counts = {}
      ;(likes || []).forEach(l => { counts[l.item_id] = (counts[l.item_id] || 0) + 1 })
      setLikeCounts(counts)
    }
  }

  useEffect(() => { fetchItems() }, [sortBy])

  const handleSave = async (formData) => {
    if (editingItem) {
      const { error } = await supabase
        .from('items')
        .update(formData)
        .eq('id', editingItem.id)
        .eq('user_id', user.id)
      if (!error) {
        setItems(prev => prev.map(i => i.id === editingItem.id ? { ...i, ...formData } : i))
      }
    } else {
      const { data, error } = await supabase
        .from('items')
        .insert({ ...formData, user_id: user.id })
        .select()
        .single()
      if (!error && data) {
        setItems(prev => [data, ...prev])
      }
    }
    setShowModal(false)
    setEditingItem(null)
  }

  const handleEdit = (item) => {
    setEditingItem(item)
    setShowModal(true)
  }

  const handleDelete = async (item) => {
    const { error } = await supabase
      .from('items')
      .delete()
      .eq('id', item.id)
      .eq('user_id', user.id)
    if (!error) {
      setItems(prev => prev.filter(i => i.id !== item.id))
    }
    setDeleteConfirm(null)
  }

  // Stats computation
  const totalRefs = items.length
  const totalUnits = items.reduce((s, i) => s + (i.quantity || 1), 0)
  const totalValue = items.reduce((s, i) => s + (i.current_value || 0) * (i.quantity || 1), 0)
  const totalBuy = items.reduce((s, i) => s + (i.purchase_price || 0) * (i.quantity || 1), 0)
  const totalPnl = totalBuy > 0 ? totalValue - totalBuy : null
  const totalPnlPct = totalBuy > 0 ? ((totalValue - totalBuy) / totalBuy) * 100 : null
  const totalLikes = Object.values(likeCounts).reduce((s, v) => s + v, 0)

  const filtered = items
    .filter(i => filterType === 'Tous' || i.item_type === filterType)
    .filter(i =>
      !search || i.name.toLowerCase().includes(search.toLowerCase()) ||
      i.set_name.toLowerCase().includes(search.toLowerCase())
    )

  return (
    <div className="space-y-6">

      {/* ── Page header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Ma Collection</h1>
          <p className="text-gray-400 text-sm mt-0.5">
            {totalRefs} référence{totalRefs !== 1 ? 's' : ''} · {totalUnits} unité{totalUnits !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={() => { setEditingItem(null); setShowModal(true) }}
          className="btn-primary flex items-center gap-2"
        >
          <span className="text-lg leading-none">+</span> Ajouter
        </button>
      </div>

      {/* ── Stats bar ── */}
      {!loading && items.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard
            label="Valeur totale"
            value={`${totalValue.toFixed(2)} €`}
            icon="💰"
            color="blue"
          />
          <StatCard
            label="Prix d'achat"
            value={totalBuy > 0 ? `${totalBuy.toFixed(2)} €` : '—'}
            icon="🛒"
            color="gray"
          />
          <StatCard
            label="P&L global"
            value={
              totalPnl !== null
                ? `${totalPnl >= 0 ? '+' : ''}${totalPnl.toFixed(2)} €`
                : '—'
            }
            sub={
              totalPnlPct !== null
                ? `${totalPnlPct >= 0 ? '+' : ''}${totalPnlPct.toFixed(1)}%`
                : null
            }
            icon={totalPnl !== null && totalPnl >= 0 ? '📈' : '📉'}
            color={totalPnl !== null ? (totalPnl >= 0 ? 'green' : 'red') : 'gray'}
          />
          <StatCard
            label="J'aimes reçus"
            value={totalLikes}
            icon="❤️"
            color="pink"
          />
        </div>
      )}

      {/* ── Search + Sort ── */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Rechercher par nom ou set..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input-field pl-9"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm"
            >
              ✕
            </button>
          )}
        </div>
        <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="input-field w-auto">
          <option value="created_at">📅 Plus récents</option>
          <option value="name">🔤 Nom A→Z</option>
          <option value="current_value">💰 Valeur</option>
          <option value="purchase_price">🛒 Prix d'achat</option>
        </select>
      </div>

      {/* ── Type filter pills ── */}
      <div className="flex flex-wrap gap-2">
        <FilterPill
          label="Tous"
          count={items.length}
          active={filterType === 'Tous'}
          onClick={() => setFilterType('Tous')}
        />
        {types.map(t => {
          const count = items.filter(i => i.item_type === t.label).length
          if (count === 0) return null
          return (
            <FilterPill
              key={t.id}
              label={t.label}
              count={count}
              active={filterType === t.label}
              onClick={() => setFilterType(t.label)}
            />
          )
        })}
      </div>

      {/* ── Grid ── */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-8 h-8 border-4 border-pokemon-red border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-14 text-center shadow-sm">
          <div className="text-5xl mb-4">{search || filterType !== 'Tous' ? '🔍' : '📦'}</div>
          <p className="text-gray-600 font-semibold text-base">
            {search || filterType !== 'Tous' ? 'Aucun item trouvé' : 'Ta collection est vide'}
          </p>
          <p className="text-gray-400 text-sm mt-1">
            {search
              ? `Aucun résultat pour "${search}"`
              : filterType !== 'Tous'
              ? `Aucun item de type "${filterType}"`
              : 'Commence par ajouter ton premier item sealed !'}
          </p>
          {!search && filterType === 'Tous' && (
            <button
              onClick={() => { setEditingItem(null); setShowModal(true) }}
              className="btn-primary inline-block mt-5"
            >
              + Ajouter un item
            </button>
          )}
        </div>
      ) : (
        <>
          <p className="text-xs text-gray-400">
            {filtered.length} résultat{filtered.length !== 1 ? 's' : ''}
            {filterType !== 'Tous' && ` · ${filterType}`}
            {search && ` · "${search}"`}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filtered.map(item => (
              <ItemCard
                key={item.id}
                item={item}
                onEdit={handleEdit}
                onDelete={setDeleteConfirm}
                likeCount={likeCounts[item.id] || 0}
              />
            ))}
          </div>
        </>
      )}

      {/* Modal */}
      {showModal && (
        <ItemFormModal
          item={editingItem}
          onClose={() => { setShowModal(false); setEditingItem(null) }}
          onSave={handleSave}
        />
      )}

      {/* Delete confirm */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">🗑</span>
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-1 text-center">Supprimer cet item ?</h3>
            <p className="text-gray-400 text-sm mb-6 text-center">
              <span className="font-semibold text-gray-600">"{deleteConfirm.name}"</span> sera définitivement supprimé.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="btn-secondary flex-1">Annuler</button>
              <button onClick={() => handleDelete(deleteConfirm)} className="btn-danger flex-1">Supprimer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ── Sub-components ── */

function StatCard({ label, value, sub, icon, color }) {
  const colors = {
    blue:  { bg: 'bg-blue-50',   text: 'text-blue-700',   sub: 'text-blue-500' },
    green: { bg: 'bg-emerald-50', text: 'text-emerald-700', sub: 'text-emerald-500' },
    red:   { bg: 'bg-red-50',    text: 'text-red-600',    sub: 'text-red-400' },
    pink:  { bg: 'bg-pink-50',   text: 'text-pink-600',   sub: 'text-pink-400' },
    gray:  { bg: 'bg-gray-50',   text: 'text-gray-700',   sub: 'text-gray-400' },
  }
  const c = colors[color] || colors.gray
  return (
    <div className={`${c.bg} rounded-2xl p-4 flex items-center gap-3`}>
      <span className="text-2xl shrink-0">{icon}</span>
      <div className="min-w-0">
        <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wide truncate">{label}</p>
        <p className={`text-base font-bold ${c.text} leading-tight`}>{value}</p>
        {sub && <p className={`text-xs font-semibold ${c.sub}`}>{sub}</p>}
      </div>
    </div>
  )
}

function FilterPill({ label, count, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full font-medium transition-all ${
        active
          ? 'bg-pokemon-blue text-white shadow-sm'
          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
      }`}
    >
      {label}
      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
        active ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-500'
      }`}>
        {count}
      </span>
    </button>
  )
}
