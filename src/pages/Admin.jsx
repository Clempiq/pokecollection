import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { validatePassword } from '../components/PasswordInput'
import PasswordInput from '../components/PasswordInput'
import { clearItemOptionsCache } from '../lib/itemOptions'

// ─── Données par défaut pour le seeding ───────────────────────────────────

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

const DEFAULT_CONDITIONS = [
  { label: 'Neuf Scellé',    color_class: 'bg-green-100 text-green-700',   sort_order: 1 },
  { label: 'Neuf Ouvert',    color_class: 'bg-blue-100 text-blue-700',     sort_order: 2 },
  { label: 'Très Bon État',  color_class: 'bg-yellow-100 text-yellow-700', sort_order: 3 },
  { label: 'Bon État',       color_class: 'bg-orange-100 text-orange-700', sort_order: 4 },
  { label: 'Usagé',          color_class: 'bg-gray-100 text-gray-600',     sort_order: 5 },
]

// ─── Vue d'ensemble ───────────────────────────────────────────────────────

function OverviewPanel({ onNavigate }) {
  const [counts, setCounts] = useState(null)
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    const [
      { count: typesCount },
      { count: conditionsCount },
      { count: setsCount },
      { count: productsCount },
      { count: usersCount },
      { count: itemsCount },
    ] = await Promise.all([
      supabase.from('item_types').select('*', { count: 'exact', head: true }),
      supabase.from('item_conditions').select('*', { count: 'exact', head: true }),
      supabase.from('pokemon_sets').select('*', { count: 'exact', head: true }),
      supabase.from('pokemon_products').select('*', { count: 'exact', head: true }),
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase.from('items').select('*', { count: 'exact', head: true }),
    ])
    setCounts({ typesCount, conditionsCount, setsCount, productsCount, usersCount, itemsCount })
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  if (loading) return (
    <div className="flex justify-center py-12">
      <div className="w-7 h-7 border-4 border-pokemon-red border-t-transparent rounded-full animate-spin" />
    </div>
  )

  const checks = [
    {
      label: "Types d'items", count: counts.typesCount, needed: 5,
      tab: 'types', icon: '🃏',
      hint: "Définit les catégories disponibles dans les formulaires d'ajout",
    },
    {
      label: 'Conditions', count: counts.conditionsCount, needed: 3,
      tab: 'conditions', icon: '⭐',
      hint: 'État du produit (Neuf Scellé, Bon État, etc.)',
    },
    {
      label: 'Extensions / Sets', count: counts.setsCount, needed: 10,
      tab: 'sets', icon: '📋',
      hint: 'Liste des extensions Pokémon TCG sélectionnables',
    },
    {
      label: 'Produits en cache', count: counts.productsCount, needed: 100,
      tab: 'sync', icon: '🔄',
      hint: 'Catalogue produits RapidAPI mis en cache localement',
    },
  ]

  return (
    <div className="space-y-6">
      {/* Titre */}
      <div>
        <h2 className="text-lg font-bold text-gray-900">📊 Vue d'ensemble</h2>
        <p className="text-sm text-gray-400 mt-0.5">État de la base de données et accès rapide aux outils de configuration.</p>
      </div>

      {/* Stats utilisateurs & items */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Utilisateurs', value: counts.usersCount, icon: '👥', color: 'text-blue-600' },
          { label: 'Items en BDD', value: counts.itemsCount, icon: '📦', color: 'text-emerald-600' },
          { label: 'Extensions', value: counts.setsCount, icon: '📋', color: 'text-violet-600' },
          { label: 'Produits', value: counts.productsCount, icon: '📦', color: 'text-orange-600' },
        ].map(({ label, value, icon, color }) => (
          <div key={label} className="bg-white rounded-lg p-3 border border-gray-200">
            <p className="text-2xl">{icon}</p>
            <p className="text-xs text-gray-400 mt-1">{label}</p>
            <p className={`text-lg font-bold mt-1 ${color}`}>{value ?? '...'}</p>
          </div>
        ))}
      </div>

      {/* Check list */}
      <div className="space-y-3">
        {checks.map(check => {
          const ok = (check.count ?? 0) >= check.needed
          const pct = check.needed > 0 ? Math.min(100, Math.round(((check.count ?? 0) / check.needed) * 100)) : 0
          return (
            <div key={check.tab} className="bg-white rounded-lg border border-gray-200 p-4 cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => onNavigate(check.tab)}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{check.icon}</span>
                  <div>
                    <p className="font-semibold text-gray-900">{check.label}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{check.hint}</p>
                  </div>
                </div>
                <span className={`text-sm font-bold ${ok ? 'text-green-600' : 'text-orange-600'}`}>
                  {check.count ?? 0} / {check.needed}
                </span>
              </div>
              <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full bg-pokemon-blue rounded-full" style={{ width: `${pct}%` }} />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Types d'items ───────────────────────────────────────────────────────

function ItemTypesPanel() {
  const [types, setTypes] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState({})

  const load = async () => {
    setLoading(true)
    const { data } = await supabase.from('item_types').select('*').order('sort_order')
    setTypes(data ?? [])
    setLoading(false)
  }

  const save = async () => {
    if (editingId) {
      await supabase.from('item_types').update(editForm).eq('id', editingId)
    } else {
      await supabase.from('item_types').insert([{ ...editForm, sort_order: (types.length ?? 0) + 1 }])
    }
    clearItemOptionsCache()
    setEditingId(null)
    load()
  }

  const delete_ = async (id) => {
    await supabase.from('item_types').delete().eq('id', id)
    clearItemOptionsCache()
    load()
  }

  const seed = async () => {
    const { error } = await supabase.from('item_types').upsert(DEFAULT_ITEM_TYPES, { onConflict: 'label' })
    if (error) alert(`Erreur: ${error.message}`)
    else { clearItemOptionsCache(); load() }
  }

  useEffect(() => { load() }, [])

  if (loading) return <div className="flex justify-center py-8"><div className="w-5 h-5 border-3 border-pokemon-blue border-t-transparent rounded-full animate-spin" /></div>

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900">Types d'items</h3>
        <button onClick={seed} className="btn-secondary text-xs">🌱 Seed</button>
      </div>

      {/* Add button */}
      {editingId === null && (
        <button onClick={() => setEditingId('new')} className="btn-primary text-xs mb-4 w-full">
          + Ajouter un type
        </button>
      )}

      {/* List */}
      <div className="space-y-2">
        {editingId === 'new' && (
          <div className="px-4 py-3 bg-blue-50 rounded-lg border border-blue-200">
            <div className="grid grid-cols-3 gap-2 items-center mb-2">
              <input placeholder="Label" value={editForm.label ?? ''} onChange={e => setEditForm(p => ({ ...p, label: e.target.value }))} className="input-field text-sm" />
              <input placeholder="Icon" value={editForm.icon ?? ''} onChange={e => setEditForm(p => ({ ...p, icon: e.target.value }))} className="input-field text-sm" />
              <input placeholder="Color CSS" value={editForm.color_class ?? ''} onChange={e => setEditForm(p => ({ ...p, color_class: e.target.value }))} className="input-field text-sm" />
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setEditingId(null)} className="btn-secondary text-xs">Annuler</button>
              <button onClick={save} className="btn-primary text-xs">Ajouter</button>
            </div>
          </div>
        )}

        {types.map(item => (
          <div key={item.id} className="px-4 py-3">
            {editingId === item.id ? (
              <div className="grid grid-cols-3 gap-2 items-center">
                <input value={editForm.label} onChange={e => setEditForm(p => ({ ...p, label: e.target.value }))} className="input-field text-sm" />
                <input value={editForm.color_class} onChange={e => setEditForm(p => ({ ...p, color_class: e.target.value }))} className="input-field text-sm" />
                <div className="flex gap-1">
                  <button onClick={() => { setEditingId(null); save() }} className="btn-primary text-xs flex-1">✓</button>
                  <button onClick={() => setEditingId(null)} className="btn-secondary text-xs flex-1">✕</button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-2">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{item.icon} {item.label}</p>
                  <p className="text-xs text-gray-400">{item.color_class}</p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => { setEditingId(item.id); setEditForm(item) }} className="btn-secondary text-xs">✏️</button>
                  <button onClick={() => delete_(item.id)} className="btn-secondary text-xs">🗑️</button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Conditions ───────────────────────────────────────────────────────

function ConditionsPanel() {
  const [conditions, setConditions] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState({})

  const load = async () => {
    setLoading(true)
    const { data } = await supabase.from('item_conditions').select('*').order('sort_order')
    setConditions(data ?? [])
    setLoading(false)
  }

  const save = async () => {
    if (editingId) {
      await supabase.from('item_conditions').update(editForm).eq('id', editingId)
    } else {
      await supabase.from('item_conditions').insert([{ ...editForm, sort_order: (conditions.length ?? 0) + 1 }])
    }
    clearItemOptionsCache()
    setEditingId(null)
    load()
  }

  const delete_ = async (id) => {
    await supabase.from('item_conditions').delete().eq('id', id)
    clearItemOptionsCache()
    load()
  }

  const seed = async () => {
    const { error } = await supabase.from('item_conditions').upsert(DEFAULT_CONDITIONS, { onConflict: 'label' })
    if (error) alert(`Erreur: ${error.message}`)
    else { clearItemOptionsCache(); load() }
  }

  useEffect(() => { load() }, [])

  if (loading) return <div className="flex justify-center py-8"><div className="w-5 h-5 border-3 border-pokemon-blue border-t-transparent rounded-full animate-spin" /></div>

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900">Conditions</h3>
        <button onClick={seed} className="btn-secondary text-xs">🌱 Seed</button>
      </div>

      {editingId === null && (
        <button onClick={() => setEditingId('new')} className="btn-primary text-xs mb-4 w-full">
          + Ajouter une condition
        </button>
      )}

      <div className="space-y-2">
        {editingId === 'new' && (
          <div className="px-4 py-3 bg-blue-50 rounded-lg border border-blue-200">
            <div className="grid grid-cols-2 gap-2 items-center mb-2">
              <input placeholder="Label" value={editForm.label ?? ''} onChange={e => setEditForm(p => ({ ...p, label: e.target.value }))} className="input-field text-sm" />
              <input placeholder="Color CSS" value={editForm.color_class ?? ''} onChange={e => setEditForm(p => ({ ...p, color_class: e.target.value }))} className="input-field text-sm" />
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setEditingId(null)} className="btn-secondary text-xs">Annuler</button>
              <button onClick={save} className="btn-primary text-xs">Ajouter</button>
            </div>
          </div>
        )}

        {conditions.map(item => (
          <div key={item.id} className="px-4 py-3">
            {editingId === item.id ? (
              <div className="grid grid-cols-2 gap-2 items-center">
                <input value={editForm.label} onChange={e => setEditForm(p => ({ ...p, label: e.target.value }))} className="input-field text-sm" />
                <input value={editForm.color_class} onChange={e => setEditForm(p => ({ ...p, color_class: e.target.value }))} className="input-field text-sm" />
              </div>
            ) : (
              <div className="flex items-center justify-between gap-2">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{item.label}</p>
                  <div className={`inline-block text-xs px-2 py-1 rounded mt-1 ${item.color_class}`}>{item.color_class}</div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => { setEditingId(item.id); setEditForm(item) }} className="btn-secondary text-xs">✏️</button>
                  <button onClick={() => delete_(item.id)} className="btn-secondary text-xs">🗑️</button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Sets ───────────────────────────────────────────────────────

function SetsPanel() {
  const [sets, setSets] = useState([])
  const [loading, setLoading] = useState(true)
  const [newSet, setNewSet] = useState('')

  const load = async () => {
    setLoading(true)
    const { data } = await supabase.from('pokemon_sets').select('*').order('name')
    setSets(data ?? [])
    setLoading(false)
  }

  const add = async () => {
    if (!newSet.trim()) return
    const { error } = await supabase.from('pokemon_sets').upsert([{ name: newSet }], { onConflict: 'name' })
    if (error) alert(`Erreur: ${error.message}`)
    else { setNewSet(''); load() }
  }

  const delete_ = async (id) => {
    await supabase.from('pokemon_sets').delete().eq('id', id)
    load()
  }

  useEffect(() => { load() }, [])

  if (loading) return <div className="flex justify-center py-8"><div className="w-5 h-5 border-3 border-pokemon-blue border-t-transparent rounded-full animate-spin" /></div>

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <h3 className="font-semibold text-gray-900 mb-4">Extensions / Sets</h3>

      <div className="flex gap-2 mb-4">
        <input value={newSet} onChange={e => setNewSet(e.target.value)} placeholder="Ex: Écarlate et Violet" className="input-field text-sm flex-1" onKeyDown={e => e.key === 'Enter' && add()} />
        <button onClick={add} className="btn-primary text-xs">+ Ajouter</button>
      </div>

      <div className="space-y-1 max-h-96 overflow-y-auto">
        {sets.map(set => (
          <div key={set.id} className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-lg text-sm">
            <span className="text-gray-900">{set.name}</span>
            <button onClick={() => delete_(set.id)} className="text-gray-400 hover:text-red-500 text-xs">✕</button>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Sync Produits ───────────────────────────────────────────────────────

function SyncPanel() {
  const [syncing, setSyncing] = useState(false)
  const [syncLog, setSyncLog] = useState([])

  const sync = async () => {
    setSyncing(true)
    setSyncLog(['Démarrage de la synchronisation...'])

    try {
      const response = await fetch('/api/sync-pokemon', { method: 'POST' })
      const result = await response.json()
      setSyncLog(prev => [...prev, result.message ?? 'Synchronisation terminée'])
    } catch (e) {
      setSyncLog(prev => [...prev, `Erreur: ${e.message}`])
    }

    setSyncing(false)
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <h3 className="font-semibold text-gray-900 mb-4">Synchronisation Produits</h3>

      <button onClick={sync} disabled={syncing} className="btn-primary text-sm w-full mb-4">
        {syncing ? '⏳ Synchronisation...' : '🔄 Synchroniser'}
      </button>

      <div className="bg-gray-50 rounded-lg p-3 font-mono text-xs text-gray-700 max-h-64 overflow-y-auto space-y-1">
        {syncLog.map((line, i) => <div key={i}>{line}</div>)}
      </div>
    </div>
  )
}

// ─── Users Manager ───────────────────────────────────────────────────────

function UsersManager() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false })
    setUsers(data ?? [])
    setLoading(false)
  }

  const delete_ = async (id) => {
    if (!confirm('Confirmer la suppression?')) return
    await supabase.from('profiles').delete().eq('id', id)
    load()
  }

  useEffect(() => { load() }, [])

  if (loading) return <div className="flex justify-center py-8"><div className="w-5 h-5 border-3 border-pokemon-blue border-t-transparent rounded-full animate-spin" /></div>

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <h3 className="font-semibold text-gray-900 mb-4">Utilisateurs ({users.length})</h3>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-gray-200">
            <tr>
              <th className="text-left py-2 px-2">Email</th>
              <th className="text-left py-2 px-2">Créé</th>
              <th className="text-left py-2 px-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="py-2 px-2">{user.email}</td>
                <td className="py-2 px-2 text-gray-400 text-xs">{new Date(user.created_at).toLocaleDateString('fr')}</td>
                <td className="py-2 px-2">
                  <button onClick={() => delete_(user.id)} className="text-red-500 hover:text-red-700 text-xs">Supprimer</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Password Manager ───────────────────────────────────────────────────────

function PasswordManager() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const save = async () => {
    setError('')
    setSuccess(false)

    if (!validatePassword(password)) {
      setError('Mot de passe invalide')
      return
    }

    // Mock save
    setSuccess(true)
    setPassword('')
    setTimeout(() => setSuccess(false), 3000)
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <h3 className="font-semibold text-gray-900 mb-4">Gestionnaire Admin</h3>

      <div className="space-y-4">
        <PasswordInput password={password} onChange={setPassword} />

        {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded">{error}</div>}
        {success && <div className="bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-3 rounded">Mot de passe mis à jour !</div>}

        <button onClick={save} className="btn-primary w-full">
          Sauvegarder
        </button>
      </div>
    </div>
  )
}

// ─── Main Admin Panel ───────────────────────────────────────────────────────

export default function Admin() {
  const [password, setPassword] = useState('')
  const [authenticated, setAuthenticated] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')

  const handlePasswordSubmit = async (submittedPassword) => {
    // Validating password
    if (validatePassword(submittedPassword)) {
      setPassword(submittedPassword)
      setAuthenticated(true)
    } else {
      alert('Mot de passe incorrect')
    }
  }

  if (!authenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100 p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
          <h1 className="text-2xl font-bold text-gray-900 mb-6 text-center">Admin Panel</h1>
          <PasswordInput password={password} onChange={setPassword} onSubmit={handlePasswordSubmit} />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">🔧 Admin Panel</h1>
            <p className="text-gray-400 mt-1">Gestion de la base de données</p>
          </div>
          <button onClick={() => setAuthenticated(false)} className="btn-secondary">
            Déconnexion
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-3 mb-6 pb-3 border-b border-gray-200 overflow-x-auto">
          {[
            { id: 'overview', label: '📊 Aperçu', icon: '📊' },
            { id: 'types', label: '🃏 Types', icon: '🃏' },
            { id: 'conditions', label: '⭐ Conditions', icon: '⭐' },
            { id: 'sets', label: '📋 Sets', icon: '📋' },
            { id: 'sync', label: '🔄 Sync', icon: '🔄' },
            { id: 'users', label: '👥 Users', icon: '👥' },
            { id: 'password', label: '🔐 Password', icon: '🔐' },
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 font-medium text-sm rounded-lg whitespace-nowrap transition-colors ${activeTab === tab.id ? 'bg-pokemon-blue text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="space-y-6">
          {activeTab === 'overview'   && <OverviewPanel onNavigate={setActiveTab} />}
          {activeTab === 'types'      && <ItemTypesPanel />}
          {activeTab === 'conditions' && <ConditionsPanel />}
          {activeTab === 'sets'       && <SetsPanel />}
          {activeTab === 'sync'       && <SyncPanel />}
          {activeTab === 'users'      && <UsersManager />}
          {activeTab === 'password'   && <PasswordManager />}
        </div>
      </div>
    </div>
  )
}