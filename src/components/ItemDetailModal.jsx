import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useItemOptions } from '../lib/itemOptions'

/* ── Type styles (same logic as ItemCard) ─────────────────────────── */
function getTypeStyle(type) {
  const t = (type || '').toLowerCase()
  if (t.includes('display') || t.includes('booster box') || t.includes('box'))
    return { bg: 'linear-gradient(135deg, #7c3aed 0%, #4338ca 100%)', icon: '🗃️' }
  if (t.includes('etb') || t.includes('elite') || t.includes('dresseur'))
    return { bg: 'linear-gradient(135deg, #ef4444 0%, #be185d 100%)', icon: '🎁' }
  if (t.includes('coffret') || t.includes('collection'))
    return { bg: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', icon: '📦' }
  if (t.includes('tin') || t.includes('boîte'))
    return { bg: 'linear-gradient(135deg, #06b6d4 0%, #0369a1 100%)', icon: '🫙' }
  if (t.includes('blister') || t.includes('pack'))
    return { bg: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', icon: '📋' }
  if (t.includes('starter') || t.includes('deck') || t.includes('battle'))
    return { bg: 'linear-gradient(135deg, #f97316 0%, #c2410c 100%)', icon: '⚔️' }
  if (t.includes('promo') || t.includes('special'))
    return { bg: 'linear-gradient(135deg, #ec4899 0%, #9d174d 100%)', icon: '⭐' }
  if (t.includes('mini') || t.includes('booster'))
    return { bg: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)', icon: '✨' }
  return { bg: 'linear-gradient(135deg, #1d4ed8 0%, #1e3a8a 100%)', icon: '🃏' }
}

const MAX_PHOTOS = 10

export default function ItemDetailModal({
  item: initialItem,
  activeTab = 'active',
  onClose,
  onEdit,
  onDelete,
  onSell,       // async (item, price, date) → void
  onOpen,       // async (item) → void
  onRestore,    // async (item) → void
  onPhotoCountChange,
}) {
  const { user } = useAuth()
  const { conditionColor } = useItemOptions()
  const [item, setItem] = useState(initialItem)
  const style = getTypeStyle(item.item_type)
  const [imgErr, setImgErr] = useState(false)

  // ── Prix / P&L ───────────────────────────────────────────────────────
  const totalBuy = item.purchase_price ? item.purchase_price * (item.quantity || 1) : null
  const totalVal = item.current_value  ? item.current_value  * (item.quantity || 1) : null
  const pnl      = totalBuy !== null && totalVal !== null ? totalVal - totalBuy : null
  const pnlPct   = pnl !== null && totalBuy > 0 ? (pnl / totalBuy) * 100 : null

  // ── Photos ───────────────────────────────────────────────────────────
  const [photos, setPhotos]             = useState([])
  const [photosLoading, setPhotosLoading] = useState(true)
  const [photoUploading, setPhotoUploading] = useState(false)
  const [lightbox, setLightbox]         = useState(null)
  const fileRef = useRef(null)

  useEffect(() => { fetchPhotos() }, [item.id])

  const fetchPhotos = async () => {
    setPhotosLoading(true)
    const { data } = await supabase
      .from('item_photos').select('*').eq('item_id', item.id).order('created_at')
    const list = data || []
    setPhotos(list)
    setPhotosLoading(false)
    onPhotoCountChange?.(item.id, list.length)
  }

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) return
    if (file.size > 15 * 1024 * 1024) return
    if (photos.length >= MAX_PHOTOS) return
    setPhotoUploading(true)
    const ext  = (file.name.split('.').pop() || 'jpg').toLowerCase()
    const path = `${user.id}/photos/${item.id}/${crypto.randomUUID()}.${ext}`
    const { data: up, error: upErr } = await supabase.storage
      .from('item-images').upload(path, file, { contentType: file.type })
    if (!upErr) {
      const { data: { publicUrl } } = supabase.storage.from('item-images').getPublicUrl(up.path)
      await supabase.from('item_photos').insert({ item_id: item.id, user_id: user.id, photo_url: publicUrl })
      await fetchPhotos()
    }
    setPhotoUploading(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  const handlePhotoDelete = async (photo) => {
    try {
      const urlParts = photo.photo_url.split('/item-images/')
      if (urlParts[1]) await supabase.storage.from('item-images').remove([decodeURIComponent(urlParts[1].split('?')[0])])
    } catch (_) {}
    await supabase.from('item_photos').delete().eq('id', photo.id)
    await fetchPhotos()
  }

  // ── Sell form ────────────────────────────────────────────────────────
  const [showSell, setShowSell]   = useState(false)
  const [sellPrice, setSellPrice] = useState('')
  const [sellDate, setSellDate]   = useState(new Date().toISOString().split('T')[0])
  const [selling, setSelling]     = useState(false)

  const handleConfirmSell = async () => {
    setSelling(true)
    await onSell(item, sellPrice, sellDate)
    setSelling(false)
    onClose()
  }

  // ── Unbox confirm ─────────────────────────────────────────────────────
  const [showOpen, setShowOpen]   = useState(false)
  const [opening, setOpening]     = useState(false)

  const handleConfirmOpen = async () => {
    setOpening(true)
    await onOpen(item)
    setOpening(false)
    onClose()
  }

  // ── Delete confirm ───────────────────────────────────────────────────
  const [showDelete, setShowDelete] = useState(false)

  const handleConfirmDelete = () => {
    onDelete(item)
    onClose()
  }

  // ── Restore ──────────────────────────────────────────────────────────
  const handleRestore = async () => {
    await onRestore(item)
    onClose()
  }

  // ── Quick value update ───────────────────────────────────────────────
  const [editingValue, setEditingValue] = useState(false)
  const [quickValue, setQuickValue]     = useState('')
  const [savingValue, setSavingValue]   = useState(false)

  const startEditValue = () => {
    setQuickValue(item.current_value != null ? String(item.current_value) : '')
    setEditingValue(true)
  }

  const handleSaveValue = async () => {
    if (quickValue === '') return
    setSavingValue(true)
    const newVal = parseFloat(quickValue)
    const { error } = await supabase
      .from('items')
      .update({ current_value: newVal })
      .eq('id', item.id)
    if (!error) setItem(prev => ({ ...prev, current_value: newVal }))
    setSavingValue(false)
    setEditingValue(false)
  }

  const hasImage = !!item.api_image_url && !imgErr
  const statusActive  = !item.status || item.status === 'active'
  const statusSold    = item.status === 'sold'
  const statusOpened  = item.status === 'opened'

  return (
    <>
      <div className="modal-overlay" onClick={onClose}>
        <div
          className="modal-panel flex flex-col"
          style={{ maxHeight: '92vh' }}
          onClick={e => e.stopPropagation()}
        >
          {/* ── Hero ────────────────────────────────────────────────── */}
          <div
            className="relative shrink-0 overflow-hidden rounded-t-2xl"
            style={{ height: hasImage ? '13rem' : '7rem', background: style.bg }}
          >
            {hasImage ? (
              <>
                {/* Soft gradient overlay from type color to surface */}
                <div className="absolute inset-0"
                  style={{ background: `linear-gradient(180deg, rgba(0,0,0,0.1) 0%, var(--bg-surface) 100%)` }} />
                {/* Blurred ambient fill */}
                <div className="absolute inset-0 opacity-20"
                  style={{ background: style.bg, filter: 'blur(20px)' }} />
                <div className="absolute inset-0 flex items-center justify-center p-4 z-10">
                  <img src={item.api_image_url} alt={item.name || ''}
                    className="max-h-full max-w-full object-contain drop-shadow-lg"
                    style={{ filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.4))' }}
                    onError={() => setImgErr(true)} />
                </div>
              </>
            ) : (
              <>
                <div className="absolute inset-0 opacity-10"
                  style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.8) 1px, transparent 1px)', backgroundSize: '14px 14px' }} />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-5xl opacity-80 select-none drop-shadow">{style.icon}</span>
                </div>
              </>
            )}
            {/* Close */}
            <button onClick={onClose}
              className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors z-20"
              style={{ backgroundColor: 'rgba(0,0,0,0.45)', color: '#fff' }}
            >✕</button>
            {/* Status badge */}
            {statusSold && (
              <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-xs font-bold text-white z-20"
                style={{ backgroundColor: 'rgba(16,185,129,0.85)' }}>💸 Vendu</div>
            )}
            {statusOpened && (
              <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-xs font-bold text-white z-20"
                style={{ backgroundColor: 'rgba(249,115,22,0.85)' }}>📦 Descellé</div>
            )}
          </div>

          {/* ── Body ────────────────────────────────────────────────── */}
          <div className="flex-1 overflow-y-auto">

            {/* Identity */}
            <div className="px-5 pt-4 pb-3">
              <h2 className="text-lg font-bold leading-snug mb-0.5" style={{ color: 'var(--text-primary)' }}>
                {item.name || <span className="italic font-normal" style={{ color: 'var(--text-muted)' }}>Sans nom</span>}
                {item.quantity > 1 && (
                  <span className="ml-2 text-sm font-normal" style={{ color: 'var(--text-muted)' }}>×{item.quantity}</span>
                )}
              </h2>
              {item.set_name && (
                <p className="text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>{item.set_name}</p>
              )}
              <div className="flex flex-wrap gap-1.5">
                {item.item_type && (
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full"
                    style={{ backgroundColor: 'var(--accent-subtle)', color: 'var(--accent-text)' }}>
                    {style.icon} {item.item_type}
                  </span>
                )}
                {item.condition && (
                  <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${conditionColor(item.condition)}`}>
                    {item.condition}
                  </span>
                )}
                {item.variant_notes && (
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full"
                    style={{ backgroundColor: 'var(--bg-subtle)', color: 'var(--text-secondary)', border: '1px solid var(--border-strong)' }}>
                    ✦ {item.variant_notes}
                  </span>
                )}
              </div>
            </div>

            {/* ── Stats ─────────────────────────────────────────────── */}
            {(totalBuy !== null || totalVal !== null || pnl !== null) && (
              <div className="mx-5 mb-3 rounded-xl overflow-hidden" style={{ border: '1px solid var(--border-strong)' }}>
                <div className="grid grid-cols-3 divide-x" style={{ borderColor: 'var(--border)' }}>
                  <div className="px-3 py-3 text-center">
                    <p className="text-[9px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>Achat</p>
                    <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                      {totalBuy !== null ? `${totalBuy.toFixed(2)} €` : '—'}
                    </p>
                  </div>
                  <div className="px-3 py-3 text-center" style={{ borderLeft: '1px solid var(--border)' }}>
                    <p className="text-[9px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>Valeur</p>
                    {editingValue ? (
                      <div className="flex items-center gap-1 justify-center">
                        <input
                          type="number" step="0.01" min="0"
                          value={quickValue}
                          onChange={e => setQuickValue(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') handleSaveValue(); if (e.key === 'Escape') setEditingValue(false) }}
                          autoFocus
                          className="w-16 text-xs text-center rounded-lg px-1 py-1 outline-none"
                          style={{ backgroundColor: 'var(--bg-subtle)', border: '1px solid var(--accent)', color: 'var(--text-primary)' }}
                        />
                        <button onClick={handleSaveValue} disabled={savingValue}
                          className="text-xs font-bold rounded-lg px-1.5 py-1 transition-colors"
                          style={{ backgroundColor: 'var(--accent)', color: '#fff' }}>
                          {savingValue ? '…' : '✓'}
                        </button>
                      </div>
                    ) : (
                      <button onClick={startEditValue} className="group flex items-center gap-1 justify-center mx-auto">
                        <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                          {totalVal !== null ? `${totalVal.toFixed(2)} €` : '—'}
                        </span>
                        <span className="text-[10px] opacity-0 group-hover:opacity-60 transition-opacity" style={{ color: 'var(--text-muted)' }}>✏️</span>
                      </button>
                    )}
                  </div>
                  <div className="px-3 py-3 text-center" style={{ borderLeft: '1px solid var(--border)' }}>
                    <p className="text-[9px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>P&L</p>
                    {pnl !== null ? (
                      <div>
                        <p className={`text-sm font-bold ${pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          {pnl >= 0 ? '+' : ''}{pnl.toFixed(2)} €
                        </p>
                        {pnlPct !== null && (
                          <p className={`text-[10px] font-semibold ${pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {pnl >= 0 ? '+' : ''}{pnlPct.toFixed(1)}%
                          </p>
                        )}
                      </div>
                    ) : <p className="text-sm font-bold" style={{ color: 'var(--text-muted)' }}>—</p>}
                  </div>
                </div>
                {/* Sold / Opened extra info */}
                {statusSold && item.sold_price != null && (
                  <div className="px-4 py-2.5 text-center text-sm font-semibold text-emerald-400"
                    style={{ borderTop: '1px solid var(--border)' }}>
                    💸 Vendu {item.sold_price.toFixed(2)} €
                    {item.sold_at && ` · ${new Date(item.sold_at).toLocaleDateString('fr-FR')}`}
                  </div>
                )}
                {statusOpened && item.opened_at && (
                  <div className="px-4 py-2.5 text-center text-sm font-semibold text-orange-400"
                    style={{ borderTop: '1px solid var(--border)' }}>
                    📦 Descellé le {new Date(item.opened_at).toLocaleDateString('fr-FR')}
                  </div>
                )}
                {item.purchased_at && (
                  <div className="px-4 py-2 text-center text-xs" style={{ color: 'var(--text-muted)', borderTop: '1px solid var(--border)' }}>
                    Acheté le {new Date(item.purchased_at).toLocaleDateString('fr-FR')}
                  </div>
                )}
              </div>
            )}

            {/* Notes */}
            {item.notes && (
              <div className="mx-5 mb-3 px-3.5 py-3 rounded-xl text-sm" style={{ backgroundColor: 'var(--bg-subtle)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
                <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>Notes</p>
                <p className="leading-relaxed">{item.notes}</p>
              </div>
            )}

            {/* ── Photos ────────────────────────────────────────────── */}
            <div className="px-5 mb-4">
              <div className="flex items-center justify-between mb-2.5">
                <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                  📷 Photos {photos.length > 0 && <span style={{ color: 'var(--text-muted)' }} className="font-normal">({photos.length}/{MAX_PHOTOS})</span>}
                </p>
              </div>
              {photosLoading ? (
                <div className="flex items-center justify-center h-16">
                  <div className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--accent)' }} />
                </div>
              ) : (
                <div className="flex gap-2.5 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
                  {photos.map((photo, idx) => (
                    <div key={photo.id}
                      className="relative group shrink-0 rounded-xl overflow-hidden cursor-pointer"
                      style={{ width: '4.5rem', height: '4.5rem', backgroundColor: 'var(--bg-subtle)' }}
                      onClick={() => setLightbox(idx)}
                    >
                      <img src={photo.photo_url} alt="" className="w-full h-full object-cover" />
                      <button
                        onClick={e => { e.stopPropagation(); handlePhotoDelete(photo) }}
                        className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-xs font-bold text-white"
                        style={{ backgroundColor: 'rgba(0,0,0,0.55)' }}
                      >🗑</button>
                    </div>
                  ))}
                  {/* Add photo */}
                  {photos.length < MAX_PHOTOS && (
                    <label
                      className="relative shrink-0 flex flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed cursor-pointer transition-colors"
                      style={{
                        width: '4.5rem', height: '4.5rem',
                        borderColor: photoUploading ? 'var(--accent)' : 'var(--border-strong)',
                        backgroundColor: 'var(--bg-subtle)',
                      }}
                    >
                      <input ref={fileRef} type="file" accept="image/*" className="hidden"
                        onChange={handlePhotoUpload} disabled={photoUploading} />
                      {photoUploading
                        ? <div className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--accent)' }} />
                        : <><span className="text-xl leading-none">📸</span>
                           <span className="text-[9px] font-medium" style={{ color: 'var(--text-muted)' }}>Ajouter</span></>
                      }
                    </label>
                  )}
                  {photos.length === 0 && !photosLoading && (
                    <p className="text-xs self-center ml-1" style={{ color: 'var(--text-muted)' }}>
                      Aucune photo — ajoute la première !
                    </p>
                  )}
                </div>
              )}
            </div>

          </div>

          {/* ── Action bar (sticky bottom) ───────────────────────────── */}
          <div className="shrink-0 px-4 py-3" style={{ borderTop: '1px solid var(--border)' }}>

            {/* ── Sell form (inline in bar) ─── */}
            {showSell && (
              <div className="space-y-2">
                <p className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>💸 Marquer comme vendu</p>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Prix de vente (€)</label>
                    <input type="number" min="0" step="0.01"
                      value={sellPrice} onChange={e => setSellPrice(e.target.value)}
                      placeholder="0.00" autoFocus
                      className="input-field text-sm py-2" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Date de vente</label>
                    <input type="date" value={sellDate} onChange={e => setSellDate(e.target.value)}
                      className="input-field text-sm py-2" />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setShowSell(false)}
                    className="btn-secondary flex-1 text-sm py-2.5 flex items-center justify-center">Annuler</button>
                  <button onClick={handleConfirmSell} disabled={selling}
                    className="flex-1 text-sm py-2.5 font-semibold rounded-xl text-white flex items-center justify-center disabled:opacity-50"
                    style={{ backgroundColor: 'var(--green)' }}>
                    {selling ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : '✓ Confirmer'}
                  </button>
                </div>
              </div>
            )}

            {/* ── Unbox confirm (inline in bar) ─── */}
            {showOpen && !showSell && (
              <div className="space-y-2">
                <p className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>📦 Desceller cet item ?</p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Il sera déplacé dans l'onglet Descellés.</p>
                <div className="flex gap-2">
                  <button onClick={() => setShowOpen(false)}
                    className="btn-secondary flex-1 text-sm py-2.5 flex items-center justify-center">Annuler</button>
                  <button onClick={handleConfirmOpen} disabled={opening}
                    className="flex-1 text-sm py-2.5 font-semibold rounded-xl text-white flex items-center justify-center disabled:opacity-50"
                    style={{ backgroundColor: '#f97316' }}>
                    {opening ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : '📦 Desceller'}
                  </button>
                </div>
              </div>
            )}

            {/* ── Delete confirm (inline in bar) ─── */}
            {showDelete && !showSell && !showOpen && (
              <div className="space-y-2">
                <p className="text-xs font-semibold" style={{ color: 'var(--red)' }}>🗑 Supprimer cet item ?</p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Cette action est irréversible.</p>
                <div className="flex gap-2">
                  <button onClick={() => setShowDelete(false)}
                    className="btn-secondary flex-1 text-sm py-2.5 flex items-center justify-center">Annuler</button>
                  <button onClick={handleConfirmDelete}
                    className="flex-1 text-sm py-2.5 font-semibold rounded-xl text-white flex items-center justify-center"
                    style={{ backgroundColor: 'var(--red)' }}>
                    Supprimer
                  </button>
                </div>
              </div>
            )}

            {/* ── Normal buttons ─── */}
            {!showSell && !showOpen && !showDelete && (
              <div className="space-y-2">
                {statusActive && (
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => setShowSell(true)}
                      className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors"
                      style={{ backgroundColor: 'var(--green)' }}>
                      💸 Vendre
                    </button>
                    <button onClick={() => setShowOpen(true)}
                      className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors"
                      style={{ backgroundColor: '#f97316' }}>
                      📦 Desceller
                    </button>
                  </div>
                )}
                {(statusSold || statusOpened) && (
                  <button onClick={handleRestore}
                    className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-semibold btn-secondary">
                    ↩ Restaurer dans la collection
                  </button>
                )}
                <div className="flex gap-2">
                  <button onClick={() => { onEdit(item); onClose() }}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-semibold btn-secondary">
                    ✏️ Modifier
                  </button>
                  <button onClick={() => setShowDelete(true)}
                    className="flex items-center justify-center px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors"
                    style={{ backgroundColor: 'var(--red-subtle)', color: 'var(--red)', minWidth: '3rem' }}>
                    🗑
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Lightbox ────────────────────────────────────────────────── */}
      {lightbox !== null && photos[lightbox] && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.92)' }}
          onClick={() => setLightbox(null)}>
          <img src={photos[lightbox].photo_url} alt=""
            className="max-w-full max-h-full rounded-xl object-contain"
            onClick={e => e.stopPropagation()} />
          {photos.length > 1 && (
            <>
              <button onClick={e => { e.stopPropagation(); setLightbox((lightbox - 1 + photos.length) % photos.length) }}
                className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center text-white text-xl transition-colors"
                style={{ backgroundColor: 'rgba(255,255,255,0.15)' }}>←</button>
              <button onClick={e => { e.stopPropagation(); setLightbox((lightbox + 1) % photos.length) }}
                className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center text-white text-xl transition-colors"
                style={{ backgroundColor: 'rgba(255,255,255,0.15)' }}>→</button>
            </>
          )}
          <button onClick={() => setLightbox(null)}
            className="absolute top-4 right-4 w-9 h-9 rounded-full flex items-center justify-center text-white text-lg"
            style={{ backgroundColor: 'rgba(255,255,255,0.15)' }}>✕</button>
          <p className="absolute bottom-4 text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>
            {lightbox + 1} / {photos.length}
          </p>
        </div>
      )}
    </>
  )
}
