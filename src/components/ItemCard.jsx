import { useState } from 'react'
import { useItemOptions } from '../lib/itemOptions'

function getTypeStyle(type) {
  const t = (type || '').toLowerCase()
  if (t.includes('display') || t.includes('booster box') || t.includes('box'))
    return { bg: 'linear-gradient(135deg, #7c3aed 0%, #4338ca 100%)', icon: '🗃️', accent: '#7c3aed', light: '#ede9fe', text: '#5b21b6' }
  if (t.includes('etb') || t.includes('elite') || t.includes('dresseur'))
    return { bg: 'linear-gradient(135deg, #ef4444 0%, #be185d 100%)', icon: '🎁', accent: '#ef4444', light: '#fee2e2', text: '#991b1b' }
  if (t.includes('coffret') || t.includes('collection box') || t.includes('collection'))
    return { bg: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', icon: '📦', accent: '#f59e0b', light: '#fef3c7', text: '#92400e' }
  if (t.includes('tin') || t.includes('boîte'))
    return { bg: 'linear-gradient(135deg, #06b6d4 0%, #0369a1 100%)', icon: '🫙', accent: '#06b6d4', light: '#cffafe', text: '#155e75' }
  if (t.includes('blister') || t.includes('pack'))
    return { bg: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', icon: '📋', accent: '#10b981', light: '#d1fae5', text: '#065f46' }
  if (t.includes('starter') || t.includes('deck') || t.includes('battle'))
    return { bg: 'linear-gradient(135deg, #f97316 0%, #c2410c 100%)', icon: '⚔️', accent: '#f97316', light: '#ffedd5', text: '#9a3412' }
  if (t.includes('promo') || t.includes('special'))
    return { bg: 'linear-gradient(135deg, #ec4899 0%, #9d174d 100%)', icon: '⭐', accent: '#ec4899', light: '#fce7f3', text: '#831843' }
  if (t.includes('mini') || t.includes('booster'))
    return { bg: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)', icon: '✨', accent: '#8b5cf6', light: '#ede9fe', text: '#5b21b6' }
  return { bg: 'linear-gradient(135deg, #1d4ed8 0%, #1e3a8a 100%)', icon: '🃏', accent: '#1d4ed8', light: '#dbeafe', text: '#1e3a8a' }
}

export default function ItemCard({
  item,
  onEdit,
  onDelete,
  onClick = null,      // Click principal → ouvre le détail modal
  readOnly = false,
  likeCount = 0,
  isLiked = false,
  onLike = null,
  likeLoading = false,
  photoCount = 0,
}) {
  const { conditionColor } = useItemOptions()
  const style = getTypeStyle(item.item_type)
  const [imgErr, setImgErr] = useState(false)

  const totalBuy = item.purchase_price ? item.purchase_price * item.quantity : null
  const totalVal = item.current_value  ? item.current_value  * item.quantity : null
  const pnl      = totalBuy !== null && totalVal !== null ? totalVal - totalBuy : null
  const pnlPct   = pnl !== null && totalBuy > 0 ? (pnl / totalBuy) * 100 : null

  const showLikeArea = onLike !== null || likeCount > 0
  const hasImage = !!item.api_image_url && !imgErr

  const statusSold   = item.status === 'sold'
  const statusOpened = item.status === 'opened'

  return (
    <div
      className={`rounded-2xl shadow-sm overflow-hidden hover:shadow-lg transition-all duration-200 flex flex-col ${onClick ? 'cursor-pointer active:scale-[0.98]' : ''}`}
      style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)' }}
      onClick={onClick || undefined}
    >

      {/* ── Header : image or gradient ── */}
      <div
        className="relative shrink-0 overflow-hidden"
        style={{ background: style.bg, height: hasImage ? '10rem' : '6rem' }}
      >
        {hasImage ? (
          <>
            <div className="absolute inset-0 flex items-center justify-center p-2" style={{ backgroundColor: 'var(--bg-surface)' }}>
              <img
                src={item.api_image_url}
                alt={item.name || 'Produit'}
                className="max-h-full max-w-full object-contain drop-shadow-sm"
                onError={() => setImgErr(true)}
              />
            </div>
            <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
          </>
        ) : (
          <>
            <div className="absolute inset-0 opacity-10"
              style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.8) 1px, transparent 1px)', backgroundSize: '14px 14px' }} />
            <div className="absolute inset-0 bg-gradient-to-br from-white/15 to-transparent" />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-4xl opacity-80 select-none drop-shadow-sm">{style.icon}</span>
            </div>
          </>
        )}

        {/* Quantity badge */}
        {item.quantity > 1 && (
          <div className="absolute top-2.5 right-2.5 bg-black/40 backdrop-blur-sm text-white text-xs font-bold px-2 py-0.5 rounded-full leading-tight">
            ×{item.quantity}
          </div>
        )}

        {/* Photo count badge */}
        {photoCount > 0 && (
          <div className="absolute top-2.5 left-2.5 bg-black/40 backdrop-blur-sm text-white text-xs font-bold px-2 py-0.5 rounded-full leading-tight flex items-center gap-1">
            📷 {photoCount}
          </div>
        )}

        {/* Status badge (vendu / ouvert) */}
        {statusSold && (
          <div className="absolute bottom-2.5 right-2.5 px-2 py-0.5 rounded-full text-[10px] font-bold text-white"
            style={{ backgroundColor: 'rgba(16,185,129,0.85)' }}>💸 Vendu</div>
        )}
        {statusOpened && (
          <div className="absolute bottom-2.5 right-2.5 px-2 py-0.5 rounded-full text-[10px] font-bold text-white"
            style={{ backgroundColor: 'rgba(249,115,22,0.85)' }}>🔓 Ouvert</div>
        )}

        {/* Condition pill */}
        {!statusSold && !statusOpened && (
          <div className="absolute bottom-2.5 left-2.5">
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${conditionColor(item.condition)}`}>
              {item.condition}
            </span>
          </div>
        )}

        {/* Tap hint (subtle) — desktop only */}
        {onClick && !readOnly && (
          <div className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-150 pointer-events-none"
            style={{ background: 'linear-gradient(to bottom, transparent 40%, rgba(0,0,0,0.18) 100%)' }} />
        )}
      </div>

      {/* ── Content ── */}
      <div className="flex flex-col flex-1 px-4 pt-3 pb-4 gap-3">

        {/* Title block */}
        <div className="flex-1">
          <h3 className="font-bold text-sm leading-snug line-clamp-2 mb-0.5" style={{ color: 'var(--text-primary)' }}>
            {item.name || <span className="italic font-normal" style={{ color: 'var(--text-muted)' }}>Sans nom</span>}
          </h3>
          <p className="text-xs leading-tight truncate" style={{ color: 'var(--text-muted)' }}>{item.set_name}</p>
          {item.variant_notes && (
            <p className="text-[10px] italic mt-1 truncate font-medium" style={{ color: style.accent }} title={item.variant_notes}>
              ✦ {item.variant_notes}
            </p>
          )}
        </div>

        {/* Type badge */}
        <div>
          <span className="item-type-badge inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full"
            style={{ backgroundColor: style.light, color: style.text }}>
            {style.icon} {item.item_type}
          </span>
        </div>

        {/* Pricing block */}
        {(totalBuy !== null || totalVal !== null) && (
          <div className="rounded-xl p-2.5 space-y-2" style={{ backgroundColor: 'var(--bg-subtle)' }}>
            <div className="grid grid-cols-2 gap-2">
              {totalBuy !== null && (
                <div className="text-center">
                  <p className="text-[9px] font-medium uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Achat</p>
                  <p className="text-sm font-bold leading-tight" style={{ color: 'var(--text-secondary)' }}>{totalBuy.toFixed(2)} €</p>
                </div>
              )}
              {totalVal !== null && (
                <div className="text-center">
                  <p className="text-[9px] font-medium uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Valeur</p>
                  <p className="text-sm font-bold leading-tight" style={{ color: 'var(--text-secondary)' }}>{totalVal.toFixed(2)} €</p>
                </div>
              )}
            </div>
            {pnl !== null && (
              <div className="flex items-center justify-between pt-2" style={{ borderTop: '1px solid var(--border)' }}>
                <span className="text-[9px] font-medium uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>P&L</span>
                <div className="flex items-center gap-1.5">
                  <span className={`text-xs font-bold ${pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {pnl >= 0 ? '+' : ''}{pnl.toFixed(2)} €
                  </span>
                  {pnlPct !== null && (
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                      pnl >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'
                    }`}>
                      {pnl >= 0 ? '+' : ''}{pnlPct.toFixed(1)}%
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Like footer */}
        {showLikeArea && (
          <div className="pt-2.5 flex items-center" style={{ borderTop: '1px solid var(--border)' }}>
            {onLike ? (
              <button
                onClick={e => { e.stopPropagation(); onLike() }}
                disabled={likeLoading}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all active:scale-95 ${
                  likeLoading ? 'opacity-50 cursor-not-allowed' : ''
                } ${isLiked ? 'bg-red-50 text-red-500 border border-red-200 hover:bg-red-100' : 'border hover:border-red-200 hover:text-red-400 hover:bg-red-50'}`}
                style={!isLiked ? { backgroundColor: 'var(--bg-subtle)', color: 'var(--text-muted)', borderColor: 'var(--border-strong)' } : undefined}
              >
                <span className={`transition-transform duration-150 ${isLiked ? 'scale-125' : ''}`}>
                  {isLiked ? '❤️' : '🤍'}
                </span>
                <span>{likeCount > 0 ? likeCount : (isLiked ? 'Aimé' : "J'aime")}</span>
              </button>
            ) : (
              <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                <span>❤️</span>
                <span className="font-semibold" style={{ color: 'var(--text-secondary)' }}>
                  {likeCount} j'aime{likeCount > 1 ? 's' : ''}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
