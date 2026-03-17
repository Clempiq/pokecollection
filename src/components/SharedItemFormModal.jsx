import { useState, useEffect } from 'react'
import { useItemOptions } from '../lib/itemOptions'

const EMPTY_FORM = {
  name: '',
  set_name: '',
  item_type: '',
  condition: 'Neuf',
  quantity: 1,
  purchase_price: '',
  current_value: '',
  variant_notes: '',
  paid_by_user_id: '',
}

function memberDisplay(profile) {
  if (!profile) return { name: '?', initial: '?' }
  const name = profile.username || profile.email || '?'
  const initial = profile.username?.[0]?.toUpperCase() || profile.email?.[0]?.toUpperCase() || '?'
  return { name, initial }
}

export default function SharedItemFormModal({ item, members, currentUserId, onClose, onSave }) {
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [splitAll, setSplitAll] = useState(true)
  const [selectedSplitters, setSelectedSplitters] = useState([])
  const { types, conditions } = useItemOptions()

  useEffect(() => {
    const allIds = members.map(m => m.user_id)
    if (item) {
      setForm({
        name: item.name || '',
        set_name: item.set_name || '',
        item_type: item.item_type || '',
        condition: item.condition || 'Neuf',
        quantity: item.quantity || 1,
        purchase_price: item.purchase_price ?? '',
        current_value: item.current_value ?? '',
        variant_notes: item.variant_notes || '',
        paid_by_user_id: item.paid_by_user_id || item.user_id || currentUserId,
      })
      if (item.split_member_ids && item.split_member_ids.length > 0) {
        setSplitAll(false)
        setSelectedSplitters(item.split_member_ids)
      } else {
        setSplitAll(true)
        setSelectedSplitters(allIds)
      }
    } else {
      setForm({ ...EMPTY_FORM, paid_by_user_id: currentUserId })
      setSplitAll(true)
      setSelectedSplitters(allIds)
    }
  }, [item, currentUserId, members])

  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }))

  const toggleSplitter = (userId) => {
    setSplitAll(false)
    setSelectedSplitters(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    )
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.set_name.trim()) return
    setSaving(true)
    const payload = {
      name: form.name.trim() || '',
      set_name: form.set_name.trim(),
      item_type: form.item_type,
      condition: form.condition,
      quantity: parseInt(form.quantity) || 1,
      purchase_price: form.purchase_price !== '' ? parseFloat(form.purchase_price) : null,
      current_value: form.current_value !== '' ? parseFloat(form.current_value) : null,
      variant_notes: form.variant_notes.trim() || null,
      paid_by_user_id: form.paid_by_user_id || currentUserId,
      split_member_ids: splitAll ? null : (selectedSplitters.length > 0 ? selectedSplitters : null),
    }
    await onSave(payload)
    setSaving(false)
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 sm:p-4"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl w-full sm:max-w-lg flex flex-col max-h-[90vh]">

        {/* Drag handle (mobile) */}
        <div className="sm:hidden flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 bg-gray-200 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-4 pb-4 border-b border-gray-100 shrink-0">
          <h2 className="font-bold text-gray-900 text-lg">
            {item ? "Modifier l'item" : 'Ajouter un item'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
        </div>

        {/* Scrollable body */}
        <form id="shared-item-form" onSubmit={handleSubmit} className="overflow-y-auto flex-1 px-6 py-5 space-y-4">

          {/* Name (optional) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nom <span className="text-gray-400 font-normal text-xs">(facultatif)</span>
            </label>
            <input
              value={form.name}
              onChange={e => set('name', e.target.value)}
              className="input-field"
              placeholder="ex: Coffret Dresseur d'Élite"
            />
          </div>

          {/* Set + Type */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Extension *</label>
              <input
                value={form.set_name}
                onChange={e => set('set_name', e.target.value)}
                className="input-field"
                placeholder="ex: Scarlet & Violet"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select value={form.item_type} onChange={e => set('item_type', e.target.value)} className="input-field">
                <option value="">Sélectionner</option>
                {types.map(t => <option key={t.label} value={t.label}>{t.label}</option>)}
              </select>
            </div>
          </div>

          {/* Condition + Quantity */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">État</label>
              <select value={form.condition} onChange={e => set('condition', e.target.value)} className="input-field">
                {conditions.map(c => <option key={c.label} value={c.label}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Quantité</label>
              <input
                type="number" min="1" value={form.quantity}
                onChange={e => set('quantity', e.target.value)}
                className="input-field"
              />
            </div>
          </div>

          {/* Prices */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Prix d'achat (€)</label>
              <input
                type="number" step="0.01" min="0"
                value={form.purchase_price}
                onChange={e => set('purchase_price', e.target.value)}
                className="input-field" placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Valeur actuelle (€)</label>
              <input
                type="number" step="0.01" min="0"
                value={form.current_value}
                onChange={e => set('current_value', e.target.value)}
                className="input-field" placeholder="0.00"
              />
            </div>
          </div>

          {/* Variant notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes / variante</label>
            <input
              value={form.variant_notes}
              onChange={e => set('variant_notes', e.target.value)}
              className="input-field"
              placeholder="ex: Japonais, reverse holo..."
            />
          </div>

          {/* ── Expense split section ── */}
          <div className="border-t border-gray-100 pt-4">
            <p className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
              <span className="w-6 h-6 bg-pokemon-blue/10 rounded-lg flex items-center justify-center text-base">💸</span>
              Répartition des frais
            </p>

            {/* Paid by */}
            <div className="mb-4">
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Payé par</label>
              <div className="flex flex-wrap gap-2">
                {members.map(m => {
                  const { name, initial } = memberDisplay(m.profiles)
                  const isSelected = form.paid_by_user_id === m.user_id
                  const isMe = m.user_id === currentUserId
                  return (
                    <button
                      key={m.user_id}
                      type="button"
                      onClick={() => set('paid_by_user_id', m.user_id)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                        isSelected
                          ? 'bg-pokemon-blue text-white shadow-sm'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                        isSelected ? 'bg-white/30 text-white' : 'bg-gray-300 text-white'
                      }`}>
                        {initial}
                      </div>
                      {isMe ? 'Moi' : name}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Split among */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Répartir entre</label>
              <div className="flex flex-wrap gap-2">
                {/* "Tous" pill */}
                <button
                  type="button"
                  onClick={() => { setSplitAll(true); setSelectedSplitters(members.map(m => m.user_id)) }}
                  className={`px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                    splitAll ? 'bg-pokemon-blue text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Tous ({members.length})
                </button>
                {/* Individual member toggles (shown when not splitAll) */}
                {!splitAll && members.map(m => {
                  const { name, initial } = memberDisplay(m.profiles)
                  const isSelected = selectedSplitters.includes(m.user_id)
                  const isMe = m.user_id === currentUserId
                  return (
                    <button
                      key={m.user_id}
                      type="button"
                      onClick={() => toggleSplitter(m.user_id)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                        isSelected
                          ? 'bg-pokemon-blue text-white shadow-sm'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200 line-through opacity-50'
                      }`}
                    >
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                        isSelected ? 'bg-white/30 text-white' : 'bg-gray-300 text-white'
                      }`}>
                        {initial}
                      </div>
                      {isMe ? 'Moi' : name}
                    </button>
                  )
                })}
                {/* "Personnaliser" link when splitAll */}
                {splitAll && (
                  <button
                    type="button"
                    onClick={() => { setSplitAll(false); setSelectedSplitters(members.map(m => m.user_id)) }}
                    className="px-3 py-2 rounded-xl text-sm font-medium text-gray-400 hover:bg-gray-100 transition-colors border border-dashed border-gray-200"
                  >
                    Personnaliser…
                  </button>
                )}
              </div>
              {!splitAll && selectedSplitters.length > 0 && form.purchase_price && (
                <p className="text-xs text-gray-400 mt-2">
                  Part par personne : {(parseFloat(form.purchase_price) * (parseInt(form.quantity) || 1) / selectedSplitters.length).toFixed(2)} €
                </p>
              )}
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex gap-3 shrink-0">
          <button type="button" onClick={onClose} className="btn-secondary flex-1">Annuler</button>
          <button type="submit" form="shared-item-form" className="btn-primary flex-1" disabled={saving}>
            {saving ? 'Sauvegarde...' : item ? 'Modifier' : 'Ajouter'}
          </button>
        </div>

      </div>
    </div>
  )
}
