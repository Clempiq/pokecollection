import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { validatePassword } from '../components/PasswordInput'
import PasswordInput from '../components/PasswordInput'
import { clearItemOptionsCache } from '../lib/itemOptions'

// ─── Gestion des types d'items (label + sort_order uniquement) ──────────────

function TypesManager() {
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
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-900">Types d'items</h2>
        <button onClick={() => setShowAdd(v => !v)} className="btn-primary text-sm">
          {showAdd ? '✕ Annuler' : '+ Ajouter un type'}
        </button>
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

// ─── Gestion des conditions (label + couleur Tailwind) ──────────────────────

function ConditionsManager() {
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-900">Conditions</h2>
        <button onClick={() => setShowAdd(v => !v)} className="btn-primary text-sm">
          {showAdd ? '✕ Annuler' : '+ Ajouter une condition'}
        </button>
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

// ─── Gestion des utilisateurs ────────────────────────────────────────────────

function UsersManager() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [itemCounts, setItemCounts] = useState({})

  useEffect(() => {
    async function fetchUsers() {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username, email, is_admin, created_at')
        .order('created_at')
      setUsers(profiles || [])

      const { data: counts } = await supabase.from('items').select('user_id')
      if (counts) {
        const map = {}
        counts.forEach(i => { map[i.user_id] = (map[i.user_id] || 0) + 1 })
        setItemCounts(map)
      }
      setLoading(false)
    }
    fetchUsers()
  }, [])

  const toggleAdmin = async (userId, currentValue) => {
    const { error } = await supabase.from('profiles')
      .update({ is_admin: !currentValue }).eq('id', userId)
    if (!error) {
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_admin: !currentValue } : u))
    }
  }

  if (loading) return (
    <div className="flex justify-center py-8">
      <div className="w-6 h-6 border-4 border-pokemon-red border-t-transparent rounded-full animate-spin"></div>
    </div>
  )

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-gray-900">Utilisateurs ({users.length})</h2>
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Utilisateur</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Email</th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Items</th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Inscrit le</th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Rôle</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {users.map(u => (
              <tr key={u.id} className="hover:bg-gray-50/50">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 bg-pokemon-blue rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0">
                      {u.username?.[0]?.toUpperCase() || u.email?.[0]?.toUpperCase() || '?'}
                    </div>
                    <span className="font-medium text-gray-800">
                      @{u.username || u.email}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-500 text-xs">{u.email}</td>
                <td className="px-4 py-3 text-center">
                  <span className="text-xs font-semibold text-gray-700 bg-gray-100 px-2 py-0.5 rounded-full">
                    {itemCounts[u.id] || 0}
                  </span>
                </td>
                <td className="px-4 py-3 text-center text-xs text-gray-400">
                  {new Date(u.created_at).toLocaleDateString('fr-FR')}
                </td>
                <td className="px-4 py-3 text-center">
                  <button
                    onClick={() => toggleAdmin(u.id, u.is_admin)}
                    className={`text-xs font-medium px-3 py-1 rounded-full transition-colors ${
                      u.is_admin
                        ? 'bg-pokemon-yellow/20 text-yellow-700 hover:bg-red-50 hover:text-red-600'
                        : 'bg-gray-100 text-gray-500 hover:bg-green-50 hover:text-green-600'
                    }`}
                    title={u.is_admin ? 'Retirer admin' : 'Rendre admin'}
                  >
                    {u.is_admin ? '⭐ Admin' : 'Utilisateur'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Gestion des séries et extensions ─────────────────────────────────────

function SetsManager() {
  const [sets, setSets] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState({ series: '', name: '', sort_order: 0 })
  const [editingSeries, setEditingSeries] = useState(null) // series name being edited
  const [editSeriesForm, setEditSeriesForm] = useState({ name: '', series_order: 0 })
  const [mode, setMode] = useState(null) // null | 'add-ext' | 'new-series'
  const [addForm, setAddForm] = useState({ series: '', name: '', sort_order: 0 })
  const [newSeriesForm, setNewSeriesForm] = useState({ series: '', firstName: '', series_order: 100, sort_order: 1 })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)

  const fetchSets = async () => {
    const { data } = await supabase.from('pokemon_sets').select('*').order('series_order').order('sort_order')
    setSets(data || [])
    setLoading(false)
  }
  useEffect(() => { fetchSets() }, [])

  // Grouper par série, triées par series_order
  const groupedMap = sets
    .filter(s => !search ||
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.series.toLowerCase().includes(search.toLowerCase()))
    .reduce((acc, s) => {
      if (!acc[s.series]) acc[s.series] = { items: [], series_order: s.series_order ?? 100 }
      acc[s.series].items.push(s)
      return acc
    }, {})

  const grouped = Object.entries(groupedMap)
    .sort((a, b) => a[1].series_order - b[1].series_order)

  const allSeries = [...new Set(sets.map(s => s.series))]

  const handleDelete = async (id) => {
    await supabase.from('pokemon_sets').delete().eq('id', id)
    setSets(prev => prev.filter(s => s.id !== id))
    setConfirmDeleteId(null)
  }

  const saveEdit = async () => {
    setSaving(true)
    await supabase.from('pokemon_sets')
      .update({ series: editForm.series, name: editForm.name, sort_order: Number(editForm.sort_order) })
      .eq('id', editingId)
    setSets(prev => prev.map(s => s.id === editingId
      ? { ...s, ...editForm, sort_order: Number(editForm.sort_order) } : s))
    setEditingId(null)
    setSaving(false)
  }

  // Modifier le nom et l'ordre d'une série entière
  const saveSeriesEdit = async () => {
    setSaving(true)
    const newName = editSeriesForm.name.trim()
    const newOrder = Number(editSeriesForm.series_order)
    const { error: err } = await supabase.from('pokemon_sets')
      .update({ series: newName, series_order: newOrder })
      .eq('series', editingSeries)
    if (err) { setSaving(false); return }
    setSets(prev => prev.map(s => s.series === editingSeries
      ? { ...s, series: newName, series_order: newOrder } : s))
    setEditingSeries(null)
    setSaving(false)
  }

  const handleAddExt = async (e) => {
    e.preventDefault()
    if (!addForm.series.trim() || !addForm.name.trim()) {
      setError('Le nom de la série et de l\'extension sont obligatoires.')
      return
    }
    setSaving(true)
    setError('')
    // Récupérer le series_order de la série choisie
    const seriesOrder = sets.find(s => s.series === addForm.series)?.series_order ?? 100
    const { data, error: insertError } = await supabase.from('pokemon_sets')
      .insert({ series: addForm.series, name: addForm.name, sort_order: Number(addForm.sort_order), series_order: seriesOrder })
      .select().single()
    if (insertError) {
      setError('Erreur lors de l\'ajout : ' + insertError.message)
      setSaving(false)
      return
    }
    if (data) setSets(prev => [...prev, data])
    setAddForm({ series: '', name: '', sort_order: 0 })
    setMode(null)
    setSaving(false)
  }

  const handleNewSeries = async (e) => {
    e.preventDefault()
    if (!newSeriesForm.series.trim() || !newSeriesForm.firstName.trim()) {
      setError('Remplis le nom de la série et au moins une première extension.')
      return
    }
    setSaving(true)
    setError('')
    const { data, error: insertError } = await supabase.from('pokemon_sets')
      .insert({
        series: newSeriesForm.series,
        name: newSeriesForm.firstName,
        sort_order: Number(newSeriesForm.sort_order),
        series_order: Number(newSeriesForm.series_order),
      })
      .select().single()
    if (insertError) {
      setError('Erreur lors de la création : ' + insertError.message)
      setSaving(false)
      return
    }
    if (data) setSets(prev => [...prev, data])
    setNewSeriesForm({ series: '', firstName: '', series_order: 100, sort_order: 1 })
    setMode(null)
    setSaving(false)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-lg font-bold text-gray-900">Extensions Pokémon</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setMode(mode === 'new-series' ? null : 'new-series')}
            className={`text-sm font-medium px-4 py-2 rounded-lg transition-colors border ${
              mode === 'new-series' ? 'bg-gray-100 border-gray-300 text-gray-700' : 'bg-pokemon-yellow border-transparent text-pokemon-blue hover:bg-yellow-400'
            }`}
          >
            {mode === 'new-series' ? '✕ Annuler' : '🆕 Nouvelle série'}
          </button>
          <button
            onClick={() => setMode(mode === 'add-ext' ? null : 'add-ext')}
            className={`text-sm font-medium px-4 py-2 rounded-lg transition-colors ${
              mode === 'add-ext' ? 'bg-gray-100 text-gray-700' : 'btn-primary'
            }`}
          >
            {mode === 'add-ext' ? '✕ Annuler' : '+ Ajouter une extension'}
          </button>
        </div>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">{error}</div>}

      {/* Formulaire nouvelle série */}
      {mode === 'new-series' && (
        <form onSubmit={handleNewSeries} className="card p-4 space-y-3 border-2 border-pokemon-yellow/40 bg-pokemon-yellow/5">
          <h3 className="font-semibold text-sm text-gray-700">🆕 Créer une nouvelle série</h3>
          <p className="text-xs text-gray-500">Une série est un bloc d'extensions (ex: "Écarlate et Violet"). Tu pourras y ajouter d'autres extensions ensuite.</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Nom de la série</label>
              <input
                value={newSeriesForm.series}
                onChange={e => setNewSeriesForm(p => ({ ...p, series: e.target.value }))}
                className="input-field text-sm"
                placeholder="ex: Écarlate et Violet — Voyage dans le Temps"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Première extension</label>
              <input
                value={newSeriesForm.firstName}
                onChange={e => setNewSeriesForm(p => ({ ...p, firstName: e.target.value }))}
                className="input-field text-sm"
                placeholder="ex: Dresseurs de Légende (EV1)"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Ordre de la série <span className="text-gray-400 font-normal">(position dans la liste)</span></label>
              <input type="number" value={newSeriesForm.series_order}
                onChange={e => setNewSeriesForm(p => ({ ...p, series_order: e.target.value }))}
                className="input-field text-sm" placeholder="ex: 5" />
            </div>
          </div>
          <button type="submit" className="btn-primary text-sm" disabled={saving}>
            {saving ? 'Création...' : 'Créer la série'}
          </button>
        </form>
      )}

      {/* Formulaire ajouter une extension à une série existante */}
      {mode === 'add-ext' && (
        <form onSubmit={handleAddExt} className="card p-4 space-y-3 border-2 border-pokemon-red/20">
          <h3 className="font-semibold text-sm text-gray-700">Ajouter une extension à une série existante</h3>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Série</label>
              <input
                list="series-list"
                value={addForm.series}
                onChange={e => setAddForm(p => ({ ...p, series: e.target.value }))}
                className="input-field text-sm"
                placeholder="Choisir une série…"
              />
              <datalist id="series-list">
                {allSeries.map(s => <option key={s} value={s} />)}
              </datalist>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Nom de l'extension</label>
              <input
                value={addForm.name}
                onChange={e => setAddForm(p => ({ ...p, name: e.target.value }))}
                className="input-field text-sm"
                placeholder="ex: Stellar Crown (EV7)"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Ordre dans la série</label>
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

      <input
        type="text"
        placeholder="Rechercher une extension ou une série..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="input-field"
      />

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="w-6 h-6 border-4 border-pokemon-red border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <div className="space-y-4">
          {grouped.map(([series, { items: seriesSets, series_order: seriesOrder }]) => (
            <div key={series} className="card overflow-hidden">
              {/* Header de série : éditable */}
              {editingSeries === series ? (
                <div className="bg-pokemon-blue/5 border-b border-gray-100 px-4 py-2 flex items-center gap-2">
                  <input
                    value={editSeriesForm.name}
                    onChange={e => setEditSeriesForm(p => ({ ...p, name: e.target.value }))}
                    className="input-field text-sm flex-1 font-semibold"
                    placeholder="Nom de la série"
                  />
                  <div className="flex items-center gap-1">
                    <label className="text-xs text-gray-500 whitespace-nowrap">Ordre :</label>
                    <input type="number"
                      value={editSeriesForm.series_order}
                      onChange={e => setEditSeriesForm(p => ({ ...p, series_order: e.target.value }))}
                      className="input-field text-sm w-20"
                    />
                  </div>
                  <button onClick={saveSeriesEdit} disabled={saving}
                    className="text-xs bg-green-100 hover:bg-green-200 text-green-700 font-medium px-2 py-1 rounded-lg shrink-0">✓ Sauver</button>
                  <button onClick={() => setEditingSeries(null)}
                    className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-600 font-medium px-2 py-1 rounded-lg shrink-0">✕</button>
                </div>
              ) : (
                <div className="bg-pokemon-blue/5 border-b border-gray-100 px-4 py-2 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <h3 className="font-semibold text-pokemon-blue text-sm">{series}</h3>
                    <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">ordre: {seriesOrder}</span>
                    <span className="text-xs text-gray-400">{seriesSets.length} extension{seriesSets.length > 1 ? 's' : ''}</span>
                  </div>
                  <button
                    onClick={() => { setEditingSeries(series); setEditSeriesForm({ name: series, series_order: seriesOrder }) }}
                    className="text-xs text-blue-500 hover:text-blue-700 font-medium px-2 py-1 rounded hover:bg-blue-50">
                    ✏️ Modifier la série
                  </button>
                </div>
              )}
              <div className="divide-y divide-gray-50">
                {seriesSets.map(set => (
                  <div key={set.id} className="px-4 py-2.5">
                    {editingId === set.id ? (
                      <div className="grid grid-cols-3 gap-2 items-center">
                        <input list="series-list" value={editForm.series}
                          onChange={e => setEditForm(p => ({ ...p, series: e.target.value }))}
                          className="input-field text-sm" />
                        <input value={editForm.name}
                          onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))}
                          className="input-field text-sm" />
                        <div className="flex items-center gap-2">
                          <input type="number" value={editForm.sort_order}
                            onChange={e => setEditForm(p => ({ ...p, sort_order: e.target.value }))}
                            className="input-field text-sm w-20" />
                          <button onClick={saveEdit} disabled={saving}
                            className="text-xs bg-green-100 hover:bg-green-200 text-green-700 font-medium px-2 py-1 rounded-lg">✓</button>
                          <button onClick={() => setEditingId(null)}
                            className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-600 font-medium px-2 py-1 rounded-lg">✕</button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-sm text-gray-800">{set.name}</span>
                          <span className="text-xs text-gray-400 ml-2">ordre: {set.sort_order}</span>
                        </div>
                        <div className="flex gap-1.5 items-center">
                          <button onClick={() => { setEditingId(set.id); setEditForm({ series: set.series, name: set.name, sort_order: set.sort_order }) }}
                            className="text-xs text-blue-500 hover:text-blue-700 font-medium px-2 py-1 rounded hover:bg-blue-50">Modifier</button>
                          {confirmDeleteId === set.id ? (
                            <span className="flex items-center gap-1">
                              <span className="text-xs text-red-600 font-medium">Confirmer ?</span>
                              <button onClick={() => handleDelete(set.id)}
                                className="text-xs bg-red-500 hover:bg-red-600 text-white font-medium px-2 py-1 rounded-lg">Oui</button>
                              <button onClick={() => setConfirmDeleteId(null)}
                                className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-600 font-medium px-2 py-1 rounded-lg">Non</button>
                            </span>
                          ) : (
                            <button onClick={() => setConfirmDeleteId(set.id)}
                              className="text-xs text-red-400 hover:text-red-600 font-medium px-2 py-1 rounded hover:bg-red-50">Supprimer</button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Changement de mot de passe ───────────────────────────────────────────

function PasswordManager() {
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess(false)
    if (!validatePassword(newPassword)) {
      setError('Le nouveau mot de passe ne respecte pas les règles de sécurité.')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas.')
      return
    }
    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) {
      setError(error.message)
    } else {
      setSuccess(true)
      setNewPassword('')
      setConfirmPassword('')
    }
    setLoading(false)
  }

  return (
    <div className="card p-6 max-w-md">
      <h2 className="text-lg font-bold text-gray-900 mb-4">Changer mon mot de passe</h2>
      {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg mb-4">{error}</div>}
      {success && <div className="bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-3 rounded-lg mb-4">✓ Mot de passe mis à jour avec succès !</div>}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nouveau mot de passe</label>
          <PasswordInput name="new-password" value={newPassword}
            onChange={e => setNewPassword(e.target.value)} placeholder="Nouveau mot de passe" showStrength />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Confirmer</label>
          <PasswordInput name="confirm-password" value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)} placeholder="Confirmer le mot de passe" />
          {confirmPassword && confirmPassword !== newPassword && (
            <p className="text-xs text-red-500 mt-1">Les mots de passe ne correspondent pas</p>
          )}
          {confirmPassword && confirmPassword === newPassword && (
            <p className="text-xs text-green-600 mt-1">✓ Les mots de passe correspondent</p>
          )}
        </div>
        <button type="submit" className="btn-primary w-full" disabled={loading}>
          {loading ? 'Mise à jour...' : 'Mettre à jour le mot de passe'}
        </button>
      </form>
    </div>
  )
}

// ─── Page principale Admin ────────────────────────────────────────────────

const TABS = [
  { id: 'sets',       label: '📋 Extensions' },
  { id: 'types',      label: '🃏 Types d\'items' },
  { id: 'conditions', label: '⭐ Conditions' },
  { id: 'users',      label: '👥 Utilisateurs' },
  { id: 'password',   label: '🔒 Mot de passe' },
]

export default function Admin() {
  const [activeTab, setActiveTab] = useState('sets')

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-pokemon-red rounded-xl flex items-center justify-center text-white text-lg">⚙️</div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard Admin</h1>
          <p className="text-gray-400 text-xs">Accès restreint — administrateur uniquement</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`text-sm font-medium px-4 py-2 rounded-lg transition-colors ${
              activeTab === tab.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'sets'       && <SetsManager />}
      {activeTab === 'types'      && <TypesManager />}
      {activeTab === 'conditions' && <ConditionsManager />}
      {activeTab === 'users'      && <UsersManager />}
      {activeTab === 'password'   && <PasswordManager />}
    </div>
  )
}
