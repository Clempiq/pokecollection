const CONDITION_COLORS = {
  'Mint': 'bg-green-100 text-green-700',
  'Near Mint': 'bg-emerald-100 text-emerald-700',
  'Lightly Played': 'bg-yellow-100 text-yellow-700',
  'Moderately Played': 'bg-orange-100 text-orange-700',
  'Heavily Played': 'bg-red-100 text-red-700',
}

const TYPE_ICONS = {
  'Booster Box': '📦',
  'Elite Trainer Box': '🎁',
  'Tin': '🥫',
  'Booster Pack': '🃏',
  'Display': '🗃️',
  'Collection Box': '📫',
  'Autre': '✨',
}

export default function ItemCard({ item, onEdit, onDelete, readOnly = false }) {
  const pnl = item.current_value && item.purchase_price
    ? (item.current_value - item.purchase_price) * item.quantity
    : null

  return (
    <div className="card overflow-hidden hover:shadow-md transition-shadow group">
      {/* Image */}
      <div className="h-40 bg-gradient-to-br from-blue-50 to-gray-100 relative overflow-hidden">
        {item.image_url ? (
          <img
            src={item.image_url}
            alt={item.name}
            className="w-full h-full object-cover"
            onError={e => { e.target.style.display = 'none' }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-5xl">
            {TYPE_ICONS[item.item_type] || '✨'}
          </div>
        )}
        {/* Quantity badge */}
        {item.quantity > 1 && (
          <div className="absolute top-2 right-2 bg-pokemon-blue text-white text-xs font-bold px-2 py-0.5 rounded-full">
            x{item.quantity}
          </div>
        )}
        {/* Actions on hover (hidden in readOnly mode) */}
        {!readOnly && (
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
            <button
              onClick={() => onEdit(item)}
              className="bg-white text-gray-800 text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
            >
              Modifier
            </button>
            <button
              onClick={() => onDelete(item)}
              className="bg-red-500 text-white text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-red-600 transition-colors"
            >
              Supprimer
            </button>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h3 className="font-semibold text-gray-900 text-sm leading-tight line-clamp-2">{item.name}</h3>
        </div>
        <p className="text-xs text-gray-500 mb-2">{item.set_name}</p>

        <div className="flex flex-wrap gap-1 mb-3">
          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
            {TYPE_ICONS[item.item_type]} {item.item_type}
          </span>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${CONDITION_COLORS[item.condition] || 'bg-gray-100 text-gray-600'}`}>
            {item.condition}
          </span>
        </div>

        <div className="border-t border-gray-100 pt-3 space-y-1">
          {item.purchase_price && (
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">Achat</span>
              <span className="font-medium text-gray-700">{(item.purchase_price * item.quantity).toFixed(2)} €</span>
            </div>
          )}
          {item.current_value && (
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">Valeur actuelle</span>
              <span className="font-medium text-gray-700">{(item.current_value * item.quantity).toFixed(2)} €</span>
            </div>
          )}
          {pnl !== null && (
            <div className="flex justify-between text-xs pt-1 border-t border-gray-100">
              <span className="text-gray-500">P&L</span>
              <span className={`font-bold ${pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {pnl >= 0 ? '+' : ''}{pnl.toFixed(2)} €
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
