import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

export default function SharedItemFormModal({ collectionId, sharedWith, onClose, onSuccess }) {
  const { user } = useAuth()
  const [quantity, setQuantity] = useState(1)
  const [paidBy, setPaidBy] = useState(user.id)
  const [splitWith, setSplitWith] = useState(new Set())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const toggleSplit = (userId) => {
    setSplitWith(prev => new Set([...prev].includes(userId) ? [...prev].filter(id => id !== userId) : [...prev, userId]))
  }

  const handleAddItem = async () => {
    setLoading(true)
    setError('')
    try {
      const expense = {
        collection_id: collectionId,
        paid_by: paidBy,
        split_between: Array.from(splitWith),
        quantity,
      }
      const { error: err } = await supabase.from('shared_expenses').insert(expense)
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
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Ajouter à la collection</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">×</button>
        </div>
        <div className="p-6 space-y-4">
          {error && <div className="bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-200 text-sm px-4 py-3 rounded-lg">{error}</div>}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Quantité</label>
            <input type="number" value={quantity} onChange={e => setQuantity(+e.target.value)} min="1" className="input-field" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Qui a payé ?</label>
            <select value={paidBy} onChange={e => setPaidBy(e.target.value)} className="input-field">
              <option value={user.id}>Moi</option>
              {sharedWith.map(friend => <option key={friend.id} value={friend.id}>{friend.username}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Partager avec</label>
            <div className="space-y-2">
              {sharedWith.map(friend => (
                <label key={friend.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer">
                  <input type="checkbox" checked={splitWith.has(friend.id)} onChange={() => toggleSplit(friend.id)} className="w-4 h-4" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">{friend.username}</span>
                </label>
              ))}
            </div>
          </div>
          <button onClick={handleAddItem} disabled={loading || splitWith.size === 0} className="btn-primary w-full">
            {loading ? 'Ajout...' : 'Ajouter'}
          </button>
        </div>
      </div>
    </div>
  )
}
