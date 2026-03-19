import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { clearItemOptionsCache } from '../../lib/itemOptions'

const DEFAULT_ITEM_TYPES = [
  { label: 'Booster Box (Display)',  icon: '🗃️', sort_order: 1 },
  { label: 'Elite Trainer Box (ETB)', icon: '🎁', sort_order: 2 },
  { label: 'Coffret Collection',      icon: '📦', sort_order: 3 },
  { label: 'Tin',                     icon: '🫙', sort_order: 4 },
  { label: 'Blister / Pack',          icon: '📋', sort_order: 5 },
  { label: 'Starter / Battle Deck',   icon: '⚔️', sort_order: 6 },
  { label: 'Bundle',                  icon: '🎀', sort_order: 7 },
  { label: 'Mini Booster',            icon: '✨', sort_order: 8 },
  { label: 'Promo / Spécial',         icon: '⭐', sort_order: 9 },
]

export default function ItemTypesManager() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState({ label: '', sort_order: 0 })
  const [showAdd, setShowAdd] = useState(false)
  const [addForm, setAddForm] = useState({ label: '', sort_order: 0 })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)

  const fetchItems = async () => {
    const { data } = await supabase.from('item_types').select('*').order('sort_order')
    setItems(data || [])
    setLoading(false)
  }
  useEffect(() => { fetchItems() }, [])

  const seedDefaults = async () => {
    setSaving(true)
    const toInsert = DEFAULT_ITEM_TYPES.filter(
      d => !items.some(existing => existing.label.toLowerCase() === d.label.toLowerCase())
    )
    if (toInsert.length === 0) {
      setError('Tous les types par défaut sont déjà présents.')
      setSaving(false)
      return
    }
    const { data } = await supabase.from('item_types').insert(toInsert).select()
    if (data) {
      setItems(prev => [...prev, ...data].sort((a, b) => a.sort_order - b.sort_order))
      clearItemOptionsCache()
    }
    setSaving(false)
  }

  const handleDelete = async (id) => {
    await supabase.from('item_types').delete().eq('id', id)
    setItems(prev => prev.filter(i => i.id !== id))
    setConfirmDeleteId(null)
    clearItemOptionsCache()
  }

  const saveEdit = async () => {
    setSaving(true)
    await supabase.from('item_types')
      .update({ label: editForm.label, sort_order: Number(editForm.sort_order) })
      .eq('id', editingId)
    setItems(prev => prev.map(i => i.id === editingId
      ? { ...i, label: editForm.label, sort_order: Number(editForm.sort_order) } : i))
    setEditingId(null)
    setSaving(false)
    clearItemOptionsCache()
  }

  const handleAdd = async (e) => {
    e.preventDefault()
    if (!addForm.label.trim()) return
    setSaving(true)
    const { data } = await supabase.from('item_types')
      .insert({ label: addForm.label, sort_order: Number(addForm.sort_order), icon: '📦' })
      .select().single()
    if (data) setItems(prev => [...prev, data].sort((a, b) => a.sort_order - b.sort_order))
    setAddForm({ label: '', sort_order: items.length })
    setShowAdd(false)
    setSaving(false)
    clearItemOptionsCache()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-lg font-bold text-gray-900">Types d'items</h2>
        <div className="flex gap-2 flex-wrap">
          {items.length === 0 && (
            <button
              onClick={seedDefaults}
              disabled={saving}
              className="text-sm font-medium px-4 py-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100 transition-colors"
            >
              {saving ? '⏳ Import...' : '🌱 Seeder les types par défaut'}
            </button>
          )}
          {items.length > 0 && (
            <button
              onClick={seedDefaults}
              disabled={saving}
              className="text-sm font-medium px-3 py-2 rounded-lg bg-gray-50 border border-gray-200 text-gray-600 hover:bg-gray-100 transition-colors"
            >
              {saving ? '⏳' : '🌱 Compléter avec les défauts'}
            </button>
          )}
          <button onClick={() => setShowAdd(v => !v)} className="btn-primary text-sm">
            {showAdd ? '✕ Annuler' : '+ Ajouter un type'}
          </button>
        </div>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">{error}</div>}

      {showAdd && (
        <form onSubmit={handleAdd} className="card p-4 space-y-3 border-2 border-pokemon-red/20">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Nom du type</label>
              <input value={addForm.label}
                onChange={e => setAddForm(p => ({ ...p, label: e.target.value }))}
                className="input-field text-sm" placeholder="ex: Coffret Premium" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Ordre d'affichage</label>
              <input type="number" value={addForm.sort_order}
                onChange={e => setAddForm(p => ({ ...p, sort_order: e.target.value }))}
                className="input-field text-sm" />
            </div>
          </div>
          <button type="submit" className="btn-primary text-sm" disabled={saving}>
            {saving ? 'Ajout...' : 'Ajouter'}
          </button>
        </form>
      )}

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="w-6 h-6 border-4 border-pokemon-red border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <div className="card overflow-hidden divide-y divide-gray-50">
          {items.map(item => (
            <div key={item.id} className="px-4 py-3">
              {editingId === item.id ? (
                <div className="flex items-center gap-2">
                  <input value={editForm.label}
                    onChange={e => setEditForm(p => ({ ...p, label: e.target.value }))}
                    className="input-field text-sm flex-1" />
                  <input type="number" value={editForm.sort_order}
                    onChange={e => setEditForm(p => ({ ...p, sort_order: e.target.value }))}
                    className="input-field text-sm w-20" />
                  <button onClick={saveEdit} disabled={saving}
                    className="text-xs bg-green-100 hover:bg-green-200 text-green-700 font-medium px-2 py-1 rounded-lg">✓</button>
                  <button onClick={() => setEditingId(null)}
                    className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-600 font-medium px-2 py-1 rounded-lg">✕</button>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-gray-800">{item.label}</span>
                    <span className="text-xs text-gray-400">ordre: {item.sort_order}</span>
                  </div>
                  <div className="flex gap-1.5 items-center">
                    <button onClick={() => { setEditingId(item.id); setEditForm({ label: item.label, sort_order: item.sort_order }) }}
                      className="text-xs text-blue-500 hover:text-blue-700 font-medium px-2 py-1 rounded hover:bg-blue-50">
                      Modifier
                    </button>
                    {confirmDeleteId === item.id ? (
                      <span className="flex items-center gap-1">
                        <span className="text-xs text-red-600 font-medium">Confirmer ?</span>
                        <button onClick={() => handleDelete(item.id)}
                          className="text-xs bg-red-500 hover:bg-red-600 text-white font-medium px-2 py-1 rounded-lg">Oui</button>
                        <button onClick={() => setConfirmDeleteId(null)}
                          className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-600 font-medium px-2 py-1 rounded-lg">Non</button>
                      </span>
                    ) : (
                      <button onClick={() => setConfirmDeleteId(item.id)}
                        className="text-xs text-red-400 hover:text-red-600 font-medium px-2 py-1 rounded hover:bg-red-50">
                        Supprimer
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
          {items.length === 0 && <p className="text-center text-gray-400 text-sm py-8">Aucun type</p>}
        </div>
      )}
    </div>
  )
}
