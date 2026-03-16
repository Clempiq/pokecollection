import { useState, useEffect } from 'react'

const ITEM_TYPES = ['Booster Box', 'Elite Trainer Box', 'Tin', 'Booster Pack', 'Display', 'Collection Box', 'Autre']
const CONDITIONS = ['Mint', 'Near Mint', 'Lightly Played', 'Moderately Played', 'Heavily Played']

const EMPTY_FORM = {
  name: '',
  set_name: '',
  item_type: 'Booster Box',
  quantity: 1,
  condition: 'Mint',
  purchase_price: '',
  current_value: '',
  image_url: '',
  notes: '',
}

export default function ItemFormModal({ item, onClose, onSave }) {
  const [form, setForm] = useState(EMPTY_FORM)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (item) {
      setForm({
        name: item.name || '',
        set_name: item.set_name || '',
        item_type: item.item_type || 'Booster Box',
        quantity: item.quantity || 1,
        condition: item.condition || 'Mint',
        purchase_price: item.purchase_price ?? '',
        current_value: item.current_value ?? '',
        image_url: item.image_url || '',
        notes: item.notes || '',
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
    if (!form.name.trim() || !form.set_name.trim()) {
      setError('Le nom et le set sont obligatoires.')
      return
    }
    setLoading(true)
    const payload = {
      ...form,
      quantity: parseInt(form.quantity) || 1,
      purchase_price: form.purchase_price !== '' ? parseFloat(form.purchase_price) : null,
      current_value: form.current_value !== '' ? parseFloat(form.current_value) : null,
      image_url: form.image_url || null,
      notes: form.notes || null,
    }
    await onSave(payload)
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
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
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Nom de l'item *</label>
              <input name="name" value={form.name} onChange={handleChange}
                className="input-field" placeholder="ex: Écarlate et Violet Booster Box" required />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Extension (Set) *</label>
              <input name="set_name" value={form.set_name} onChange={handleChange}
                className="input-field" placeholder="ex: Écarlate et Violet, Celebrations..." required />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select name="item_type" value={form.item_type} onChange={handleChange} className="input-field">
                {ITEM_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">État</label>
              <select name="condition" value={form.condition} onChange={handleChange} className="input-field">
                {CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Quantité</label>
              <input name="quantity" type="number" min="1" value={form.quantity} onChange={handleChange}
                className="input-field" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Prix d'achat (€)</label>
              <input name="purchase_price" type="number" step="0.01" min="0" value={form.purchase_price}
                onChange={handleChange} className="input-field" placeholder="0.00" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Valeur actuelle (€)</label>
              <input name="current_value" type="number" step="0.01" min="0" value={form.current_value}
                onChange={handleChange} className="input-field" placeholder="0.00" />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">URL Image (optionnel)</label>
              <input name="image_url" type="url" value={form.image_url} onChange={handleChange}
                className="input-field" placeholder="https://..." />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optionnel)</label>
              <textarea name="notes" value={form.notes} onChange={handleChange}
                className="input-field resize-none" rows={2} placeholder="Informations supplémentaires..." />
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
