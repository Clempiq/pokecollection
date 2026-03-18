import { useState } from 'react'
import { supabase } from '../lib/supabase'
import ProductCombobox from './ProductCombobox'

export default function WishlistFormModal({ onClose, onSuccess }) {
  const [step, setStep] = useState(1)
  const [searchMode, setSearchMode] = useState('api')
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [priority, setPriority] = useState('medium')
  const [targetPrice, setTargetPrice] = useState('')
  const [manualName, setManualName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleAddWishlist = async () => {
    setLoading(true)
    setError('')
    try {
      const { error: err } = await supabase.from('wishlists').insert({
        name: selectedProduct?.name || manualName,
        target_price: targetPrice ? parseFloat(targetPrice) : null,
        priority,
        image_url: selectedProduct?.image_url || null,
      })
      if (err) throw err
      onSuccess()
      onClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Ajouter à la wishlist</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">×</button>
        </div>
        <div className="p-6 space-y-4">
          {error && <div className="bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-200 text-sm px-4 py-3 rounded-lg">{error}</div>}
          {step === 1 ? (
            <>
              <div className="space-y-2">
                <button
                  onClick={() => setSearchMode('api')}
                  className={`w-full p-3 rounded-lg border transition-colors ${searchMode === 'api' ? 'border-pokemon-blue bg-blue-50 dark:bg-blue-900' : 'border-gray-200 dark:border-gray-700'}`}
                >
                  🔍 Chercher dans le catalogue
                </button>
                <button
                  onClick={() => setSearchMode('manual')}
                  className={`w-full p-3 rounded-lg border transition-colors ${searchMode === 'manual' ? 'border-pokemon-blue bg-blue-50 dark:bg-blue-900' : 'border-gray-200 dark:border-gray-700'}`}
                >
                  ✏ Ajouter manuellement
                </button>
              </div>
              {searchMode === 'api' ? (
                <ProductCombobox value={selectedProduct} onChange={setSelectedProduct} />
              ) : (
                <input type="text" value={manualName} onChange={e => setManualName(e.target.value)} placeholder="Nom du produit" className="input-field" />
              )}
              <button
                onClick={() => setStep(2)}
                disabled={!selectedProduct && !manualName}
                className="btn-primary w-full"
              >
                Continuer
              </button>
            </>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Priorité</label>
                <select value={priority} onChange={e => setPriority(e.target.value)} className="input-field">
                  <option value="low">🟢 Faible</option>
                  <option value="medium">🟡 Moyen</option>
                  <option value="high">🟠 Élevé</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Prix cible (optionnel)</label>
                <input type="number" value={targetPrice} onChange={e => setTargetPrice(e.target.value)} step="0.01" className="input-field" placeholder="0.00" />
              </div>
              <div className="flex gap-2">
                <button onClick={() => setStep(1)} className="flex-1 btn-secondary">
                  Retour
                </button>
                <button onClick={handleAddWishlist} disabled={loading} className="flex-1 btn-primary">
                  {loading ? 'Ajout...' : 'Ajouter'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
