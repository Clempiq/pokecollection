import { useState, useEffect } from 'react'
import { extractPrice, extractImage } from '../lib/pokemonApi'
import SearchStep from './item-form/SearchStep'

export default function WishlistFormModal({ item, onClose, onSave }) {
  const isEdit = !!item

  const [step, setStep] = useState(isEdit ? 'form' : 'search')
  const [selectedProduct, setSelectedProduct] = useState(null)

  // Form fields
  const [manualName, setManualName]   = useState('')
  const [priority, setPriority]       = useState('medium')
  const [targetPrice, setTargetPrice] = useState('')
  const [notes, setNotes]             = useState('')
  const [loading, setLoading]         = useState(false)
  const [error, setError]             = useState('')

  // Conversion smallint DB → string UI (1=Urgent/high, 2=Normal/medium, 3=Un jour/low)
  const priorityNumToStr = { 1: 'high', 2: 'medium', 3: 'low' }
  const priorityStrToNum = { high: 1, medium: 2, low: 3 }

  useEffect(() => {
    if (item) {
      setManualName(item.name || '')
      setPriority(priorityNumToStr[item.priority] || 'medium')
      setTargetPrice(item.target_price != null ? String(item.target_price) : '')
      setNotes(item.notes || '')
    }
  }, [item])

  const handleSelectProduct = (product) => {
    setSelectedProduct(product)
    setManualName(product?.name || '')
    setStep('form')
  }

  const handleBack = () => {
    setStep('search')
    setSelectedProduct(null)
    setManualName('')
  }

  const productImage = selectedProduct ? extractImage(selectedProduct) : (isEdit ? item?.api_image_url : null)
  const marketPrice  = selectedProduct ? extractPrice(selectedProduct) : null

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const payload = {
        name:          selectedProduct?.name || manualName.trim(),
        set_name:      selectedProduct
          ? (selectedProduct.episode?.name || selectedProduct.setName || '')
          : (isEdit ? (item.set_name || '') : ''),
        target_price:  targetPrice ? parseFloat(targetPrice) : null,
        priority:      priorityStrToNum[priority] ?? 2,
        notes:         notes.trim() || null,
        api_image_url: selectedProduct ? extractImage(selectedProduct) : (isEdit ? item.api_image_url : null),
        api_product_id: selectedProduct?.id ? String(selectedProduct.id) : (isEdit ? item.api_product_id : null),
      }
      await onSave(payload)
    } catch (err) {
      setError(err.message)
      setLoading(false)
    }
  }

  const priorities = [
    { value: 'low',    label: '🟢 Faible' },
    { value: 'medium', label: '🟡 Moyen'  },
    { value: 'high',   label: '🔴 Élevé'  },
  ]

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 sm:p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl w-full sm:max-w-lg flex flex-col max-h-[92vh]"
        onClick={e => e.stopPropagation()}
      >

        {/* Drag handle mobile */}
        <div className="sm:hidden flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 bg-gray-200 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100 shrink-0">
          {step === 'form' && !isEdit && (
            <button onClick={handleBack} className="text-gray-400 hover:text-gray-600 text-xl leading-none">←</button>
          )}
          <h2 className="text-lg font-bold text-gray-900 flex-1">
            {isEdit ? '✏️ Modifier' : step === 'search' ? '⭐ Ajouter à la wishlist' : '⭐ Détails'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
        </div>

        {/* ── STEP 1 : Recherche ─────────────────────────────────── */}
        {step === 'search' && (
          <>
            <SearchStep
              onSelectProduct={handleSelectProduct}
              onGoToForm={() => setStep('form')}
            />
            {/* Saisie manuelle */}
            <div className="px-6 pb-4 shrink-0 border-t border-gray-100 pt-3">
              <button
                onClick={() => setStep('form')}
                className="w-full text-sm text-gray-400 hover:text-gray-600 underline underline-offset-2"
              >
                ✏️ Ajouter manuellement sans catalogue
              </button>
            </div>
          </>
        )}

        {/* ── STEP 2 : Formulaire wishlist ───────────────────────── */}
        {step === 'form' && (
          <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
            <div className="overflow-y-auto flex-1 p-6 space-y-4">

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">{error}</div>
              )}

              {/* Produit sélectionné */}
              {selectedProduct && (
                <div className="flex items-center gap-3 bg-gray-50 rounded-2xl p-3 border border-gray-100">
                  {productImage && (
                    <div className="w-14 h-14 rounded-xl overflow-hidden bg-white shrink-0 flex items-center justify-center">
                      <img src={productImage} alt="" className="max-w-full max-h-full object-contain" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-900 leading-snug">{selectedProduct.name}</p>
                    {marketPrice && (
                      <p className="text-xs text-blue-600 font-semibold mt-1">
                        💰 Prix Cardmarket : {marketPrice.toFixed(2)} €
                      </p>
                    )}
                  </div>
                  {!isEdit && (
                    <button type="button" onClick={handleBack} className="text-gray-300 hover:text-gray-500 text-lg shrink-0">✕</button>
                  )}
                </div>
              )}

              {/* Nom (mode manuel uniquement) */}
              {!selectedProduct && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nom du produit
                  </label>
                  <input
                    type="text"
                    value={manualName}
                    onChange={e => setManualName(e.target.value)}
                    placeholder="ex: Display Écarlate et Violet Base"
                    className="input-field"
                    autoFocus={!isEdit}
                  />
                </div>
              )}

              {/* Priorité */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Priorité</label>
                <div className="grid grid-cols-3 gap-2">
                  {priorities.map(p => (
                    <button
                      key={p.value}
                      type="button"
                      onClick={() => setPriority(p.value)}
                      className={`py-2.5 rounded-xl text-sm font-semibold border transition-all ${
                        priority === p.value
                          ? 'border-pokemon-blue bg-blue-50 text-blue-700'
                          : 'border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Prix cible */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Prix cible <span className="text-gray-400 text-xs font-normal">(optionnel)</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={targetPrice}
                    onChange={e => setTargetPrice(e.target.value)}
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    className="input-field pr-8"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">€</span>
                </div>
                <p className="text-xs text-gray-400 mt-1">Alerte quand le prix Cardmarket passe sous ce seuil.</p>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes <span className="text-gray-400 text-xs font-normal">(optionnel)</span>
                </label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  rows={2}
                  placeholder="Raisons, variante souhaitée…"
                  className="input-field resize-none"
                />
              </div>
            </div>

            {/* Action bar */}
            <div className="shrink-0 px-6 py-4 border-t border-gray-100 flex gap-2">
              <button
                type="button"
                onClick={isEdit ? onClose : handleBack}
                className="btn-secondary flex-none px-5"
              >
                {isEdit ? 'Annuler' : '← Retour'}
              </button>
              <button
                type="submit"
                disabled={loading || (!selectedProduct && !manualName.trim() && !(isEdit && item?.name))}
                className="btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-40"
              >
                {loading
                  ? <><span className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin" />{isEdit ? 'Enregistrement…' : 'Ajout…'}</>
                  : isEdit ? '✅ Enregistrer' : '⭐ Ajouter à la wishlist'
                }
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
