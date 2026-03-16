import { useState, useEffect } from 'react'
import { usePokemonSets } from '../lib/pokemonSets'
import { useItemOptions } from '../lib/itemOptions'

const EMPTY_FORM = {
  name: '',
  set_name: '',
  item_type: '',
  quantity: 1,
  condition: '',
  purchase_price: '',
  current_value: '',
  notes: '',
  variant_notes: '',
}

export default function ItemFormModal({ item, onClose, onSave }) {
  const [form, setForm] = useState(EMPTY_FORM)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [customSet, setCustomSet] = useState(false)
  const { grouped, loading: setsLoading } = usePokemonSets()
  const { types, conditions, loading: optionsLoading } = useItemOptions()

  // Set default type/condition once options are loaded
  useEffect(() => {
    if (!item && types.length > 0 && !form.item_type) {
      setForm(prev => ({ ...prev, item_type: types[0].label }))
    }
    if (!item && conditions.length > 0 && !form.condition) {
      setForm(prev => ({ ...prev, condition: conditions[0].label }))
    }
  }, [types, conditions])

  useEffect(() => {
    if (item) {
      setForm({
        name: item.name || '',
        set_name: item.set_name || '',
        item_type: item.item_type || '',
        quantity: item.quantity || 1,
        condition: item.condition || '',
        purchase_price: item.purchase_price ?? '',
        current_value: item.current_value ?? '',
        notes: item.notes || '',
        variant_notes: item.variant_notes || '',
      })
    }
  }, [item])

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!form.set_name.trim()) {
      setError("L'extension (set) est obligatoire.")
      return
    }
    setLoading(true)
    const payload = {
      ...form,
      quantity: parseInt(form.quantity) || 1,
      purchase_price: form.purchase_price !== '' ? parseFloat(form.purchase_price) : null,
      current_value: form.current_value !== '' ? parseFloat(form.current_value) : null,
      notes: form.notes || null,
      variant_notes: form.variant_notes || null,
    }
    await onSave(payload)
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 sm:p-4">
      <div className="bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl w-full sm:max-w-lg max-h-[92vh] sm:max-h-[90vh] overflow-y-auto">
        {/* Drag handle (mobile only) */}
        <div className="sm:hidden flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-gray-200 rounded-full" />
        </div>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 sm:p-6 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">
            {item ? 'Modifier un item' : 'Ajouter un item'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            {/* Nom */}
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nom de l'item
                <span className="text-gray-400 font-normal ml-1">(facultatif)</span>
              </label>
              <input name="name" value={form.name} onChange={handleChange}
                className="input-field" placeholder="ex: Booster Box Écarlate et Violet" />
            </div>

            {/* Set */}
            <div className="col-span-2">
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium text-gray-700">Extension (Set) *</label>
                <button
                  type="button"
                  onClick={() => { setCustomSet(v => !v); setForm(prev => ({ ...prev, set_name: '' })) }}
                  className="text-xs text-pokemon-red hover:underline"
                >
                  {customSet ? '← Choisir dans la liste' : '+ Saisir manuellement'}
                </button>
              </div>
              {customSet ? (
                <input name="set_name" value={form.set_name} onChange={handleChange}
                  className="input-field" placeholder="ex: Mon Set Personnalisé" required />
              ) : (
                <select name="set_name" value={form.set_name} onChange={handleChange}
                  className="input-field" required>
                  <option value="">
                    {setsLoading ? 'Chargement des séries…' : '— Choisir une extension —'}
                  </option>
                  {Object.entries(grouped).map(([series, sets]) => (
                    <optgroup key={series} label={series}>
                      {sets.map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              )}
            </div>

            {/* Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select name="item_type" value={form.item_type} onChange={handleChange} className="input-field"
                disabled={optionsLoading}>
                {optionsLoading ? (
                  <option>Chargement…</option>
                ) : (
                  types.map(t => (
                    <option key={t.id} value={t.label}>{t.label}</option>
                  ))
                )}
              </select>
            </div>

            {/* État */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">État</label>
              <select name="condition" value={form.condition} onChange={handleChange} className="input-field"
                disabled={optionsLoading}>
                {optionsLoading ? (
                  <option>Chargement…</option>
                ) : (
                  conditions.map(c => (
                    <option key={c.id} value={c.label}>{c.label}</option>
                  ))
                )}
              </select>
            </div>

            {/* Quantité */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Quantité</label>
              <input name="quantity" type="number" min="1" value={form.quantity} onChange={handleChange}
                className="input-field" />
            </div>

            {/* Prix d'achat */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Prix d'achat (€)</label>
              <input name="purchase_price" type="number" step="0.01" min="0" value={form.purchase_price}
                onChange={handleChange} className="input-field" placeholder="0.00" />
            </div>

            {/* Valeur actuelle */}
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Valeur actuelle (€)</label>
              <input name="current_value" type="number" step="0.01" min="0" value={form.current_value}
                onChange={handleChange} className="input-field" placeholder="0.00" />
            </div>

            {/* Variante */}
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Variante / Particularité
                <span className="text-gray-400 font-normal ml-1">(facultatif)</span>
              </label>
              <input name="variant_notes" value={form.variant_notes} onChange={handleChange}
                className="input-field"
                placeholder="ex: Édition limitée, misprint, numéro de série, sous-édition…" />
            </div>

            {/* Notes */}
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes
                <span className="text-gray-400 font-normal ml-1">(facultatif)</span>
              </label>
              <textarea name="notes" value={form.notes} onChange={handleChange}
                className="input-field resize-none" rows={2}
                placeholder="Informations supplémentaires…" />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Annuler</button>
            <button type="submit" className="btn-primary flex-1" disabled={loading}>
              {loading ? 'Enregistrement...' : (item ? 'Modifier' : 'Ajouter')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
