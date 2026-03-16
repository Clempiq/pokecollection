import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import ItemCard from '../components/ItemCard'
import ItemFormModal from '../components/ItemFormModal'

const ITEM_TYPES = ['Tous', 'Booster Box', 'Coffret Dresseur Élite', 'Boîte Métal', 'Booster', 'Display', 'Coffret Collection', 'Autre']

export default function Collection() {
  const { user } = useAuth()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [filterType, setFilterType] = useState('Tous')
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState('created_at')
  const [deleteConfirm, setDeleteConfirm] = useState(null)

  const fetchItems = async () => {
    const { data } = await supabase
      .from('items')
      .select('*')
      .eq('user_id', user.id)
      .order(sortBy, { ascending: sortBy === 'name' })
    setItems(data || [])
    setLoading(false)
  }

  useEffect(() => { fetchItems() }, [sortBy])

  const handleSave = async (formData) => {
    if (editingItem) {
      const { error } = await supabase
        .from('items')
        .update(formData)
        .eq('id', editingItem.id)
        .eq('user_id', user.id)
      if (!error) {
        setItems(prev => prev.map(i => i.id === editingItem.id ? { ...i, ...formData } : i))
      }
    } else {
      const { data, error } = await supabase
        .from('items')
        .insert({ ...formData, user_id: user.id })
        .select()
        .single()
      if (!error && data) {
        setItems(prev => [data, ...prev])
      }
    }
    setShowModal(false)
    setEditingItem(null)
  }

  const handleEdit = (item) => {
    setEditingItem(item)
    setShowModal(true)
  }

  const handleDelete = async (item) => {
    const { error } = await supabase
      .from('items')
      .delete()
      .eq('id', item.id)
      .eq('user_id', user.id)
    if (!error) {
      setItems(prev => prev.filter(i => i.id !== item.id))
    }
    setDeleteConfirm(null)
  }

  const filtered = items
    .filter(i => filterType === 'Tous' || i.item_type === filterType)
    .filter(i =>
      !search || i.name.toLowerCase().includes(search.toLowerCase()) ||
      i.set_name.toLowerCase().includes(search.toLowerCase())
    )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Ma Collection</h1>
          <p className="text-gray-500 text-sm mt-0.5">{items.length} référence{items.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={() => { setEditingItem(null); setShowModal(true) }}
          className="btn-primary flex items-center gap-2"
        >
          <span>+</span> Ajouter
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          placeholder="Rechercher par nom ou set..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="input-field flex-1 max-w-sm"
        />
        <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="input-field w-auto">
          <option value="created_at">Trier par date</option>
          <option value="name">Trier par nom</option>
          <option value="current_value">Trier par valeur</option>
          <option value="purchase_price">Trier par prix d'achat</option>
        </select>
      </div>

      {/* Type filter pills */}
      <div className="flex flex-wrap gap-2">
        {ITEM_TYPES.map(type => (
          <button
            key={type}
            onClick={() => setFilterType(type)}
            className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${
              filterType === type
                ? 'bg-pokemon-blue text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {type}
          </button>
        ))}
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-8 h-8 border-4 border-pokemon-red border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="text-5xl mb-4">{search || filterType !== 'Tous' ? '🔍' : '📦'}</div>
          <p className="text-gray-500 font-medium">
            {search || filterType !== 'Tous' ? 'Aucun item trouvé' : 'Ta collection est vide'}
          </p>
          {!search && filterType === 'Tous' && (
            <button
              onClick={() => { setEditingItem(null); setShowModal(true) }}
              className="btn-primary inline-block mt-4"
            >
              Ajouter ton premier item
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered.map(item => (
            <ItemCard
              key={item.id}
              item={item}
              onEdit={handleEdit}
              onDelete={setDeleteConfirm}
            />
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <ItemFormModal
          item={editingItem}
          onClose={() => { setShowModal(false); setEditingItem(null) }}
          onSave={handleSave}
        />
      )}

      {/* Delete confirm */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Supprimer cet item ?</h3>
            <p className="text-gray-500 text-sm mb-6">
              <span className="font-medium text-gray-700">"{deleteConfirm.name}"</span> sera définitivement supprimé de ta collection.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="btn-secondary flex-1">Annuler</button>
              <button onClick={() => handleDelete(deleteConfirm)} className="btn-danger flex-1">Supprimer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
