import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

function TradeCard({ trade, onDelete }) {
  const [confirm, setConfirm] = useState(false)
  const date = trade.trade_date
    ? new Date(trade.trade_date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
    : '—'

  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-1.5 text-sm">
            <span className="font-semibold text-gray-800 truncate max-w-[140px]">🔴 {trade.given_description}</span>
            <span className="text-gray-400 shrink-0">↔️</span>
            <span className="font-semibold text-gray-800 truncate max-w-[140px]">🔵 {trade.received_description}</span>
          </div>
          {trade.friend_name && (
            <p className="text-xs text-gray-400 mt-0.5">avec <span className="font-medium">@{trade.friend_name}</span></p>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <span className="text-[10px] text-gray-400">{date}</span>
          {!confirm ? (
            <button onClick={() => setConfirm(true)} className="text-gray-300 hover:text-red-400 text-sm leading-none ml-1">✕</button>
          ) : (
            <div className="flex gap-1">
              <button onClick={() => onDelete(trade.id)} className="text-[10px] text-red-600 hover:underline">Suppr.</button>
              <button onClick={() => setConfirm(false)} className="text-[10px] text-gray-400 hover:underline">Non</button>
            </div>
          )}
        </div>
      </div>
      {trade.notes && <p className="text-xs text-gray-500 italic border-t border-gray-50 pt-2">{trade.notes}</p>}
    </div>
  )
}

export default function TradeLog() {
  const { user } = useAuth()
  const [trades, setTrades]       = useState([])
  const [loading, setLoading]     = useState(true)
  const [showForm, setShowForm]   = useState(false)
  const [saving, setSaving]       = useState(false)
  const [form, setForm]           = useState({
    given_description: '',
    received_description: '',
    friend_name: '',
    trade_date: new Date().toISOString().split('T')[0],
    notes: '',
  })

  const fetchTrades = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('trades')
      .select('*')
      .eq('user_id', user.id)
      .order('trade_date', { ascending: false })
    setTrades(data || [])
    setLoading(false)
  }

  useEffect(() => { fetchTrades() }, [user.id])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.given_description.trim() || !form.received_description.trim()) return
    setSaving(true)
    const { data, error } = await supabase.from('trades').insert({
      user_id: user.id,
      given_description: form.given_description.trim(),
      received_description: form.received_description.trim(),
      friend_name: form.friend_name.trim() || null,
      trade_date: form.trade_date || null,
      notes: form.notes.trim() || null,
    }).select().single()

    if (!error && data) {
      setTrades(prev => [data, ...prev])
      setForm({ given_description: '', received_description: '', friend_name: '', trade_date: new Date().toISOString().split('T')[0], notes: '' })
      setShowForm(false)
    }
    setSaving(false)
  }

  const handleDelete = async (id) => {
    await supabase.from('trades').delete().eq('id', id).eq('user_id', user.id)
    setTrades(prev => prev.filter(t => t.id !== id))
  }

  const update = (field, val) => setForm(prev => ({ ...prev, [field]: val }))

  return (
    <div className="card p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900">🤝 Journal des échanges</h2>
          <p className="text-xs text-gray-400 mt-0.5">{trades.length} échange{trades.length !== 1 ? 's' : ''} enregistré{trades.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={() => setShowForm(v => !v)}
          className="btn-primary text-sm py-2 px-4"
        >
          {showForm ? '✕ Annuler' : '+ Nouvel échange'}
        </button>
      </div>

      {/* Formulaire */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-gray-50 rounded-2xl p-4 space-y-3 border border-gray-100">
          <p className="text-sm font-semibold text-gray-700">Nouvel échange</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Ce que tu as donné 🔴</label>
              <input
                value={form.given_description}
                onChange={e => update('given_description', e.target.value)}
                className="input-field text-sm"
                placeholder="ex: ETB Paldea"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Ce que tu as reçu 🔵</label>
              <input
                value={form.received_description}
                onChange={e => update('received_description', e.target.value)}
                className="input-field text-sm"
                placeholder="ex: Booster Box EV"
                required
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Avec (pseudo, optionnel)</label>
              <input
                value={form.friend_name}
                onChange={e => update('friend_name', e.target.value)}
                className="input-field text-sm"
                placeholder="@pseudo"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Date</label>
              <input
                type="date"
                value={form.trade_date}
                onChange={e => update('trade_date', e.target.value)}
                className="input-field text-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Notes (optionnel)</label>
            <input
              value={form.notes}
              onChange={e => update('notes', e.target.value)}
              className="input-field text-sm"
              placeholder="Conditions de l'échange, lieu…"
            />
          </div>
          <button type="submit" disabled={saving} className="btn-primary text-sm w-full">
            {saving ? 'Enregistrement…' : '💾 Enregistrer l\'échange'}
          </button>
        </form>
      )}

      {/* Liste */}
      {loading ? (
        <div className="flex justify-center py-4">
          <div className="w-5 h-5 border-4 border-pokemon-red border-t-transparent rounded-full animate-spin" />
        </div>
      ) : trades.length === 0 ? (
        <div className="text-center py-8 text-gray-400">
          <p className="text-3xl mb-2">🤝</p>
          <p className="text-sm">Aucun échange enregistré pour l'instant</p>
          <p className="text-xs mt-1">Note tes échanges IRL pour garder une trace !</p>
        </div>
      ) : (
        <div className="space-y-2">
          {trades.map(t => <TradeCard key={t.id} trade={t} onDelete={handleDelete} />)}
        </div>
      )}
    </div>
  )
}
