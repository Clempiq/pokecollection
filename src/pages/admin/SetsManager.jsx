import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

export default function SetsManager() {
  const [sets, setSets] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState({ series: '', name: '', sort_order: 0 })
  const [editingSeries, setEditingSeries] = useState(null)
  const [editSeriesForm, setEditSeriesForm] = useState({ name: '', series_order: 0 })
  const [mode, setMode] = useState(null)
  const [addForm, setAddForm] = useState({ series: '', name: '', sort_order: 0 })
  const [newSeriesForm, setNewSeriesForm] = useState({ series: '', firstName: '', series_order: 100, sort_order: 1 })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState(null)

  const fetchSets = async () => {
    const { data } = await supabase.from('pokemon_sets').select('*').order('series_order').order('sort_order')
    setSets(data || [])
    setLoading(false)
  }
  useEffect(() => { fetchSets() }, [])

  const importFromTCGdex = async () => {
    setImporting(true)
    setImportResult(null)
    setError('')
    try {
      const resp = await fetch('https://api.tcgdex.net/v2/fr/sets')
      if (!resp.ok) throw new Error(`TCGdex API: ${resp.status}`)
      const data = await resp.json()

      const seriesOrderMap = {}
      let seriesIdx = 0
      data.forEach(s => {
        const seriesName = s.serie?.name || 'Autre'
        if (!(seriesName in seriesOrderMap)) {
          seriesOrderMap[seriesName] = ++seriesIdx
        }
      })

      const seriesSortMap = {}
      const rows = data.map(s => {
        const series = s.serie?.name || 'Autre'
        seriesSortMap[series] = (seriesSortMap[series] || 0) + 1
        return {
          name: s.name,
          series,
          series_order: seriesOrderMap[series],
          sort_order: seriesSortMap[series],
          tcgdex_id: s.id || null,
          release_date: s.releaseDate || null,
        }
      })

      let inserted = 0
      let updated = 0
      const existingNames = new Set(sets.map(s => s.name.toLowerCase()))

      const toInsert = rows.filter(r => !existingNames.has(r.name.toLowerCase()))
      const toUpdate = rows.filter(r => existingNames.has(r.name.toLowerCase()))

      if (toInsert.length > 0) {
        const { data: ins } = await supabase.from('pokemon_sets').insert(toInsert).select()
        inserted = ins?.length || 0
      }
      if (toUpdate.length > 0) {
        for (const row of toUpdate) {
          await supabase.from('pokemon_sets')
            .update({ series_order: row.series_order, sort_order: row.sort_order })
            .eq('name', row.name)
        }
        updated = toUpdate.length
      }

      setImportResult({ ok: true, inserted, updated, total: rows.length })
      await fetchSets()
    } catch (e) {
      setImportResult({ ok: false, error: e.message })
    } finally {
      setImporting(false)
    }
  }

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
        <div>
          <h2 className="text-lg font-bold text-gray-900">Extensions Pokémon</h2>
          {sets.length > 0 && <p className="text-xs text-gray-400">{sets.length} extensions · {[...new Set(sets.map(s => s.series))].length} séries</p>}
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={importFromTCGdex}
            disabled={importing}
            className="text-sm font-medium px-4 py-2 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 transition-colors flex items-center gap-1.5"
          >
            {importing
              ? <><span className="w-3.5 h-3.5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" /> Import…</>
              : '🌐 Importer depuis TCGdex'}
          </button>
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

      {importResult && (
        <div className={`rounded-xl p-3 text-sm font-medium ${importResult.ok ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>
          {importResult.ok
            ? `✅ Import terminé — ${importResult.inserted} nouvelles extensions ajoutées, ${importResult.updated} mises à jour (${importResult.total} au total depuis TCGdex)`
            : `❌ Erreur : ${importResult.error}`}
        </div>
      )}

      {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">{error}</div>}

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
