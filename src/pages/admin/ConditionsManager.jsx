import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { clearItemOptionsCache } from '../../lib/itemOptions'

const DEFAULT_CONDITIONS = [
  { label: 'Neuf Scellé',    color_class: 'bg-green-100 text-green-700',   sort_order: 1 },
  { label: 'Neuf Ouvert',    color_class: 'bg-blue-100 text-blue-700',     sort_order: 2 },
  { label: 'Très Bon État',  color_class: 'bg-yellow-100 text-yellow-700', sort_order: 3 },
  { label: 'Bon État',       color_class: 'bg-orange-100 text-orange-700', sort_order: 4 },
  { label: 'Usagé',          color_class: 'bg-gray-100 text-gray-600',     sort_order: 5 },
]

export default function ConditionsManager() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState({ label: '', color_class: '', sort_order: 0 })
  const [showAdd, setShowAdd] = useState(false)
  const [addForm, setAddForm] = useState({ label: '', color_class: '', sort_order: 0 })
  const [saving, setSaving] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)

  const fetchItems = async () => {
    const { data } = await supabase.from('item_conditions').select('*').order('sort_order')
    setItems(data || [])
    setLoading(false)
  }
  useEffect(() => { fetchItems() }, [])

  const handleDelete = async (id) => {
    await supabase.from('item_conditions').delete().eq('id', id)
    setItems(prev => prev.filter(i => i.id !== id))
    setConfirmDeleteId(null)
    clearItemOptionsCache()
  }

  const saveEdit = async () => {
    setSaving(true)
    await supabase.from('item_conditions')
      .update({ label: editForm.label, color_class: editForm.color_class, sort_order: Number(editForm.sort_order) })
      .eq('id', editingId)
    setItems(prev => prev.map(i => i.id === editingId
      ? { ...i, ...editForm, sort_order: Number(editForm.sort_order) } : i))
    setEditingId(null)
    setSaving(false)
    clearItemOptionsCache()
  }

  const handleAdd = async (e) => {
    e.preventDefault()
    if (!addForm.label.trim()) return
    setSaving(true)
    const { data } = await supabase.from('item_conditions')
      .insert({ label: addForm.label, color_class: addForm.color_class || 'bg-gray-100 text-gray-600', sort_order: Number(addForm.sort_order) })
      .select().single()
    if (data) setItems(prev => [...prev, data].sort((a, b) => a.sort_order - b.sort_order))
    setAddForm({ label: '', color_class: '', sort_order: items.length })
    setShowAdd(false)
    setSaving(false)
    clearItemOptionsCache()
  }

  const seedDefaults = async () => {
    setSaving(true)
    const toInsert = DEFAULT_CONDITIONS.filter(
      d => !items.some(existing => existing.label.toLowerCase() === d.label.toLowerCase())
    )
    if (toInsert.length === 0) {
      setSaving(false)
      return
    }
    const { data } = await supabase.from('item_conditions').insert(toInsert).select()
    if (data) {
      setItems(prev => [...prev, ...data].sort((a, b) => a.sort_order - b.sort_order))
      clearItemOptionsCache()
    }
    setSaving(false)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-lg font-bold text-gray-900">Conditions</h2>
        <div className="flex gap-2 flex-wrap">
          {items.length === 0 && (
            <button
              onClick={seedDefaults}
              disabled={saving}
              className="text-sm font-medium px-4 py-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100 transition-colors"
            >
              {saving ? '⏳ Import...' : '🌱 Seeder les conditions par défaut'}
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
            {showAdd ? '✕ Annuler' : '+ Ajouter une condition'}
          </button>
        </div>
      </div>

      {showAdd && (
        <form onSubmit={handleAdd} className="card p-4 space-y-3 border-2 border-pokemon-red/20">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Nom</label>
              <input value={addForm.label}
                onChange={e => setAddForm(p => ({ ...p, label: e.target.value }))}
                className="input-field text-sm" placeholder="ex: Excellent" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Classes couleur Tailwind</label>
              <input value={addForm.color_class}
                onChange={e => setAddForm(p => ({ ...p, color_class: e.target.value }))}
                className="input-field text-sm" placeholder="ex: bg-green-100 text-green-700" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Ordre</label>
              <input type="number" value={addForm.sort_order}
                onChange={e => setAddForm(p => ({ ...p, sort_order: e.target.value }))}
                className="input-field text-sm" />
            </div>
          </div>
          {addForm.color_class && addForm.label && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">Aperçu :</span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${addForm.color_class}`}>{addForm.label}</span>
            </div>
          )}
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
                <div className="grid grid-cols-3 gap-2 items-center">
                  <input value={editForm.label}
                    onChange={e => setEditForm(p => ({ ...p, label: e.target.value }))}
                    className="input-field text-sm" />
                  <input value={editForm.color_class}
                    onChange={e => setEditForm(p => ({ ...p, color_class: e.target.value }))}
                    className="input-field text-sm" />
                  <div className="flex items-center gap-2">
                    <input type="number" value={editForm.sort_order}
                      onChange={e => setEditForm(p => ({ ...p, sort_order: e.target.value }))}
                      className="input-field text-sm w-16" />
                    <button onClick={saveEdit} disabled={saving}
                      className="text-xs bg-green-100 hover:bg-green-200 text-green-700 font-medium px-2 py-1 rounded-lg">✓</button>
                    <button onClick={() => setEditingId(null)}
                      className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-600 font-medium px-2 py-1 rounded-lg">✕</button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${item.color_class}`}>{item.label}</span>
                    <span className="text-xs text-gray-400">ordre: {item.sort_order}</span>
                  </div>
                  <div className="flex gap-1.5 items-center">
                    <button onClick={() => { setEditingId(item.id); setEditForm({ label: item.label, color_class: item.color_class, sort_order: item.sort_order }) }}
                      className="text-xs text-blue-500 hover:text-blue-700 font-medium px-2 py-1 rounded hover:bg-blue-50">Modifier</button>
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
                        className="text-xs text-red-400 hover:text-red-600 font-medium px-2 py-1 rounded hover:bg-red-50">Supprimer</button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
          {items.length === 0 && <p className="text-center text-gray-400 text-sm py-8">Aucune condition</p>}
        </div>
      )}
    </div>
  )
}
