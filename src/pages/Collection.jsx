import { useEffect, useState, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import ItemCard from '../components/ItemCard'
import ItemFormModal from '../components/ItemFormModal'
import { useItemOptions } from '../lib/itemOptions'

const GridIcon   = () => <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M3 3h5v5H3V3zm0 9h5v5H3v-5zm9-9h5v5h-5V3zm0 9h5v5h-5v-5z" clipRule="evenodd"/></svg>
const ListIcon   = () => <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd"/></svg>
const FilterIcon = () => <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-.293.707L13 9.414V15a1 1 0 01-.553.894l-4 2A1 1 0 017 17v-7.586L3.293 5.707A1 1 0 013 5V3z" clipRule="evenodd"/></svg>

export default function Collection() {
  const { user } = useAuth()
  const [items, setItems]             = useState([])
  const [loading, setLoading]         = useState(true)
  const [showModal, setShowModal]     = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [likeCounts, setLikeCounts]   = useState({})

  const [viewMode, setViewMode]         = useState(() => localStorage.getItem('collection_view') || 'grid')
  const [search, setSearch]             = useState('')
  const [filterType, setFilterType]     = useState('Tous')
  const [filterSet, setFilterSet]       = useState('')
  const [filterCondition, setFilterCondition] = useState('')
  const [sortBy, setSortBy]             = useState('created_at')
  const [showFilters, setShowFilters]   = useState(false)

  const [selectMode, setSelectMode]     = useState(false)
  const [selectedIds, setSelectedIds]   = useState(new Set())
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false)
  const [bulkDeleting, setBulkDeleting] = useState(false)

  const { types, conditions } = useItemOptions()

  const setView = (mode) => { setViewMode(mode); localStorage.setItem('collection_view', mode) }

  const exportCollection = (data) => {
    const headers = ['Nom', 'Extension', 'Type', 'Variante', 'Quantité', 'Condition', 'Prix achat (€)', 'Date achat', 'Valeur actuelle (€)', 'Notes', 'Ajouté le']
    const rows = data.map(i => [
      i.name || '',
      i.set_name || '',
      i.item_type || '',
      i.variant_notes || '',
      i.quantity || 1,
      i.condition || '',
      i.purchase_price != null ? i.purchase_price.toFixed(2) : '',
      i.purchased_at || '',
      i.current_value != null ? i.current_value.toFixed(2) : '',
      (i.notes || '').replace(/"/g, '""'),
      i.created_at ? new Date(i.created_at).toLocaleDateString('fr-FR') : '',
    ])
    const csv = [headers, ...rows]
      .map(r => r.map(v => `"${v}"`).join(';'))
      .join('\n')
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `pokecollection_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const fetchItems = async () => {
    setLoading(true)
    const { data } = await supabase.from('items').select('*').eq('user_id', user.id)
      .order(sortBy, { ascending: sortBy === 'name' })
    setItems(data || [])
    setLoading(false)
    if (data?.length > 0) {
      const { data: likes } = await supabase.from('item_likes').select('item_id').in('item_id', data.map(i => i.id))
      const counts = {}
      ;(likes || []).forEach(l => { counts[l.item_id] = (counts[l.item_id] || 0) + 1 })
      setLikeCounts(counts)
    }
  }

  useEffect(() => { fetchItems() }, [sortBy])

  const handleEdit = (item) => { setEditingItem(item); setShowModal(true) }

  const handleSave = async (formData) => {
    if (editingItem) {
      const { error } = await supabase.from('items').update(formData).eq('id', editingItem.id).eq('user_id', user.id)
      if (!error) {
        setItems(prev => prev.map(i => i.id === editingItem.id ? { ...i, ...formData } : i))
        setShowModal(false); setEditingItem(null)
      }
      return { error }
    } else {
      const { data, error } = await supabase.from('items').insert({ ...formData, user_id: user.id }).select().single()
      if (!error && data) {
        setItems(prev => [data, ...prev])
        setShowModal(false); setEditingItem(null)
      }
      return { error }
    }
  }

  const handleDelete = async (item) => {
    const { error } = await supabase.from('items').delete().eq('id', item.id).eq('user_id', user.id)
    if (!error) setItems(prev => prev.filter(i => i.id !== item.id))
    setDeleteConfirm(null)
  }

  const handleBulkDelete = async () => {
    setBulkDeleting(true)
    const ids = [...selectedIds]
    const { error } = await supabase.from('items').delete().in('id', ids).eq('user_id', user.id)
    if (!error) setItems(prev => prev.filter(i => !selectedIds.has(i.id)))
    setSelectedIds(new Set()); setSelectMode(false); setBulkDeleteConfirm(false); setBulkDeleting(false)
  }

  const toggleSelect = (id) => setSelectedIds(prev => {
    const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next
  })
  const exitSelectMode = () => { setSelectMode(false); setSelectedIds(new Set()) }

  const distinctSets = useMemo(() =>
    [...new Set(items.map(i => i.set_name).filter(Boolean))].sort(), [items])

  const totalRefs   = items.length
  const totalUnits  = items.reduce((s, i) => s + (i.quantity || 1), 0)
  const totalValue  = items.reduce((s, i) => s + (i.current_value || 0) * (i.quantity || 1), 0)
  const totalBuyAgg = items.reduce((s, i) => s + (i.purchase_price || 0) * (i.quantity || 1), 0)
  const totalPnl    = totalBuyAgg > 0 ? totalValue - totalBuyAgg : null
  const totalPnlPct = totalBuyAgg > 0 ? ((totalValue - totalBuyAgg) / totalBuyAgg) * 100 : null
  const totalLikes  = Object.values(likeCounts).reduce((s, v) => s + v, 0)

  const filtered = useMemo(() => items
    .filter(i => filterType === 'Tous' || i.item_type === filterType)
    .filter(i => !filterSet || i.set_name === filterSet)
    .filter(i => !filterCondition || i.condition === filterCondition)
    .filter(i => !search ||
      (i.name || '').toLowerCase().includes(search.toLowerCase()) ||
      (i.set_name || '').toLowerCase().includes(search.toLowerCase())),
    [items, filterType, filterSet, filterCondition, search]
  )

  const activeFilterCount = [filterSet, filterCondition].filter(Boolean).length + (filterType !== 'Tous' ? 1 : 0)

  return (
    <div className="space-y-6 pb-28">

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Ma Collection</h1>
          <p className="text-gray-400 text-sm mt-0.5">
            {totalRefs} référence{totalRefs !== 1 ? 's' : ''} · {totalUnits} unité{totalUnits !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!selectMode && items.length > 0 && (
            <>
              <button onClick={() => setSelectMode(true)}
                className="text-xs px-3 py-2 rounded-xl text-gray-500 hover:bg-gray-100 border border-gray-200 font-medium transition-colors">
                ☑️ Sélectionner
              </button>
              <button onClick={() => exportCollection(items)}
                className="text-xs px-3 py-2 rounded-xl text-gray-500 hover:bg-gray-100 border border-gray-200 font-medium transition-colors"
                title="Exporter ma collection">
                ⬇️ Export
              </button>
            </>
          )}
          <button onClick={() => { setEditingItem(null); setShowModal(true) }} className="btn-primary flex items-center gap-2">
            <span className="text-lg leading-none">+</span> Ajouter
          </button>
        </div>
      </div>

      {!loading && items.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard label="Valeur totale" value={`${totalValue.toFixed(2)} €`} icon="💰" color="blue" />
          <StatCard label="Prix d'achat"  value={totalBuyAgg > 0 ? `${totalBuyAgg.toFixed(2)} €` : '—'} icon="🛒" color="gray" />
          <StatCard
            label="P&L global"
            value={totalPnl !== null ? `${totalPnl >= 0 ? '+' : ''}${totalPnl.toFixed(2)} €` : '—'}
            sub={totalPnlPct !== null ? `${totalPnlPct >= 0 ? '+' : ''}${totalPnlPct.toFixed(1)}%` : null}
            icon={totalPnl !== null && totalPnl >= 0 ? '📈' : '📉'}
            color={totalPnl !== null ? (totalPnl >= 0 ? 'green' : 'red') : 'gray'}
          />
          <StatCard label="J'aimes reçus" value={totalLikes} icon="❤️" color="pink" />
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input type="text" placeholder="Rechercher par nom ou set…" value={search}
            onChange={e => setSearch(e.target.value)} className="input-field pl-9" />
          {search && (
            <button onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm">✕</button>
          )}
        </div>
        <div className="flex gap-2 shrink-0">
          <button onClick={() => setShowFilters(f => !f)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium border transition-colors ${
              showFilters || activeFilterCount > 0
                ? 'bg-blue-50 border-blue-200 text-blue-700'
                : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}>
            <FilterIcon />
            Filtres
            {activeFilterCount > 0 && (
              <span className="bg-blue-600 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>
          <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="input-field w-auto text-sm">
            <option value="created_at">📅 Récents</option>
            <option value="name">🔤 A→Z</option>
            <option value="current_value">💰 Valeur</option>
            <option value="purchase_price">🛒 Achat</option>
          </select>
          <div className="flex items-center bg-gray-100 rounded-xl p-1 gap-0.5">
            <button onClick={() => setView('grid')} title="Vue grille"
              className={`p-1.5 rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-white shadow text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}>
              <GridIcon />
            </button>
            <button onClick={() => setView('list')} title="Vue liste"
              className={`p-1.5 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-white shadow text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}>
              <ListIcon />
            </button>
          </div>
        </div>
      </div>

      {showFilters && (
        <div className="bg-white border border-gray-200 rounded-2xl p-4 space-y-3 shadow-sm">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Type</label>
              <select value={filterType} onChange={e => setFilterType(e.target.value)} className="input-field text-sm">
                <option value="Tous">Tous les types</option>
                {types.map(t => <option key={t.id} value={t.label}>{t.icon ? `${t.icon} ${t.label}` : t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Extension</label>
              <select value={filterSet} onChange={e => setFilterSet(e.target.value)} className="input-field text-sm">
                <option value="">Toutes les extensions</option>
                {distinctSets.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">État</label>
              <select value={filterCondition} onChange={e => setFilterCondition(e.target.value)} className="input-field text-sm">
                <option value="">Tous les états</option>
                {conditions.map(c => <option key={c.id} value={c.label}>{c.label}</option>)}
              </select>
            </div>
          </div>
          {activeFilterCount > 0 && (
            <button onClick={() => { setFilterType('Tous'); setFilterSet(''); setFilterCondition('') }}
              className="text-xs text-red-500 hover:text-red-700 font-medium flex items-center gap-1">
              ✕ Réinitialiser les filtres
            </button>
          )}
        </div>
      )}

      {!showFilters && (
        <div className="flex flex-wrap gap-2">
          <FilterPill label="Tous" count={items.length} active={filterType === 'Tous'} onClick={() => setFilterType('Tous')} />
          {types.map(t => {
            const count = items.filter(i => i.item_type === t.label).length
            if (count === 0) return null
            return (
              <FilterPill key={t.id} label={`${t.icon ? t.icon + ' ' : ''}${t.label}`} count={count}
                active={filterType === t.label} onClick={() => setFilterType(t.label)} />
            )
          })}
        </div>
      )}

      {selectMode && (
        <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-2xl px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => selectedIds.size === filtered.length
                ? setSelectedIds(new Set())
                : setSelectedIds(new Set(filtered.map(i => i.id)))}
              className="text-sm font-medium text-blue-700 hover:text-blue-900">
              {selectedIds.size === filtered.length ? 'Tout désélectionner' : 'Tout sélectionner'}
            </button>
            <span className="text-sm text-blue-600 font-semibold">
              {selectedIds.size > 0
                ? `${selectedIds.size} sélectionné${selectedIds.size > 1 ? 's' : ''}`
                : 'Sélectionne des items'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {selectedIds.size > 0 && (
              <button onClick={() => setBulkDeleteConfirm(true)}
                className="text-xs font-semibold text-white bg-red-500 hover:bg-red-600 px-3 py-1.5 rounded-xl transition-colors">
                🗑 Supprimer ({selectedIds.size})
              </button>
            )}
            <button onClick={exitSelectMode}
              className="text-xs text-gray-500 hover:text-gray-700 px-3 py-1.5 rounded-xl hover:bg-white border border-transparent hover:border-gray-200 transition-colors">
              Annuler
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-8 h-8 border-4 border-pokemon-red border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-14 text-center shadow-sm">
          <div className="text-5xl mb-4">{search || activeFilterCount > 0 ? '🔍' : '📦'}</div>
          <p className="text-gray-600 font-semibold text-base">
            {search || activeFilterCount > 0 ? 'Aucun item trouvé' : 'Ta collection est vide'}
          </p>
          <p className="text-gray-400 text-sm mt-1">
            {search ? `Aucun résultat pour "${search}"` : activeFilterCount > 0 ? 'Essaie de modifier tes filtres' : 'Commence par ajouter ton premier item sealed !'}
          </p>
          {!search && activeFilterCount === 0 && (
            <button onClick={() => { setEditingItem(null); setShowModal(true) }} className="btn-primary inline-block mt-5">
              + Ajouter un item
            </button>
          )}
        </div>
      ) : (
        <>
          <p className="text-xs text-gray-400">
            {filtered.length} résultat{filtered.length !== 1 ? 's' : ''}
            {filterType !== 'Tous' && ` · ${filterType}`}
            {filterSet && ` · ${filterSet}`}
            {filterCondition && ` · ${filterCondition}`}
            {search && ` · "${search}"`}
          </p>

          {viewMode === 'grid' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filtered.map(item => (
                <div key={item.id} className="relative">
                  {selectMode && (
                    <button onClick={() => toggleSelect(item.id)}
                      className={`absolute top-2 left-2 z-10 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all shadow-sm ${
                        selectedIds.has(item.id)
                          ? 'bg-blue-600 border-blue-600 text-white'
                          : 'bg-white border-gray-300 hover:border-blue-400'
                      }`}>
                      {selectedIds.has(item.id) && <span className="text-[10px] font-bold leading-none">✓</span>}
                    </button>
                  )}
                  <div onClick={() => selectMode && toggleSelect(item.id)}
                    className={selectMode ? 'cursor-pointer' : ''}
                    style={{ opacity: selectMode && !selectedIds.has(item.id) ? 0.6 : 1, transition: 'opacity 0.15s' }}>
                    <ItemCard item={item}
                      onEdit={selectMode ? () => {} : handleEdit}
                      onDelete={selectMode ? () => {} : setDeleteConfirm}
                      likeCount={likeCounts[item.id] || 0}
                      readOnly={selectMode} />
                  </div>
                </div>
              ))}
            </div>
          )}

          {viewMode === 'list' && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden divide-y divide-gray-50">
              {filtered.map(item => (
                <CollectionListRow key={item.id} item={item}
                  onEdit={handleEdit} onDelete={setDeleteConfirm}
                  selectMode={selectMode} selected={selectedIds.has(item.id)}
                  onToggle={() => toggleSelect(item.id)} />
              ))}
            </div>
          )}
        </>
      )}

      {showModal && (
        <ItemFormModal item={editingItem}
          onClose={() => { setShowModal(false); setEditingItem(null) }}
          onSave={handleSave} />
      )}

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

      {bulkDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">🗑</span>
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-1 text-center">
              Supprimer {selectedIds.size} item{selectedIds.size > 1 ? 's' : ''} ?
            </h3>
            <p className="text-gray-400 text-sm mb-6 text-center">Cette action est irréversible.</p>
            <div className="flex gap-3">
              <button onClick={() => setBulkDeleteConfirm(false)} className="btn-secondary flex-1" disabled={bulkDeleting}>Annuler</button>
              <button onClick={handleBulkDelete} className="btn-danger flex-1" disabled={bulkDeleting}>
                {bulkDeleting ? 'Suppression…' : `Supprimer (${selectedIds.size})`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function CollectionListRow({ item, onEdit, onDelete, selectMode, selected, onToggle }) {
  const { conditionColor } = useItemOptions()
  const [imgErr, setImgErr] = useState(false)
  const hasImage = !!item.api_image_url && !imgErr
  const totalVal = item.current_value  ? item.current_value  * (item.quantity || 1) : null
  const totalBuy = item.purchase_price ? item.purchase_price * (item.quantity || 1) : null
  const pnl = totalVal !== null && totalBuy !== null ? totalVal - totalBuy : null

  return (
    <div onClick={selectMode ? onToggle : undefined}
      className={`flex items-center gap-3 px-4 py-3 transition-colors ${selected ? 'bg-blue-50' : 'hover:bg-gray-50'} ${selectMode ? 'cursor-pointer' : ''}`}>
      {selectMode && (
        <button onClick={e => { e.stopPropagation(); onToggle() }}
          className={`w-5 h-5 shrink-0 rounded border-2 flex items-center justify-center transition-all ${
            selected ? 'bg-blue-600 border-blue-600 text-white' : 'border-gray-300 hover:border-blue-400'
          }`}>
          {selected && <span className="text-[9px] font-bold leading-none">✓</span>}
        </button>
      )}
      <div className="w-10 h-10 rounded-xl overflow-hidden bg-gray-100 shrink-0 flex items-center justify-center border border-gray-100">
        {hasImage
          ? <img src={item.api_image_url} alt="" className="w-full h-full object-contain" onError={() => setImgErr(true)} />
          : <span className="text-lg">📦</span>}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900 truncate leading-snug">
          {item.name || <span className="text-gray-400 italic font-normal">Sans nom</span>}
          {item.quantity > 1 && <span className="ml-1 text-[10px] text-gray-400 font-normal">×{item.quantity}</span>}
        </p>
        <p className="text-xs text-gray-400 truncate">{item.set_name}</p>
      </div>
      <span className="hidden sm:inline-flex shrink-0 text-[10px] font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
        {item.item_type}
      </span>
      <span className={`hidden sm:inline-flex shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full ${conditionColor(item.condition)}`}>
        {item.condition}
      </span>
      <div className="text-right shrink-0 min-w-[5rem]">
        {totalVal !== null && <p className="text-sm font-bold text-gray-800">{totalVal.toFixed(2)} €</p>}
        {pnl !== null && (
          <p className={`text-[10px] font-semibold ${pnl >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
            {pnl >= 0 ? '+' : ''}{pnl.toFixed(2)} €
          </p>
        )}
      </div>
      {!selectMode && (
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={e => { e.stopPropagation(); onEdit(item) }}
            className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors" title="Modifier">
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
            </svg>
          </button>
          <button onClick={e => { e.stopPropagation(); onDelete(item) }}
            className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors" title="Supprimer">
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      )}
    </div>
  )
}

function StatCard({ label, value, sub, icon, color }) {
  const colors = {
    blue:  { bg: 'bg-blue-50',    text: 'text-blue-700',    sub: 'text-blue-500' },
    green: { bg: 'bg-emerald-50', text: 'text-emerald-700', sub: 'text-emerald-500' },
    red:   { bg: 'bg-red-50',     text: 'text-red-600',     sub: 'text-red-400' },
    pink:  { bg: 'bg-pink-50',    text: 'text-pink-600',    sub: 'text-pink-400' },
    gray:  { bg: 'bg-gray-50',    text: 'text-gray-700',    sub: 'text-gray-400' },
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
    <button onClick={onClick}
      className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full font-medium transition-all ${
        active ? 'bg-pokemon-blue text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
      }`}>
      {label}
      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
        active ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-500'
      }`}>{count}</span>
    </button>
  )
}
