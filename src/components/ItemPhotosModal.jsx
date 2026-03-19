import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

const MAX_PHOTOS = 10

export default function ItemPhotosModal({ item, onClose, onCountChange }) {
  const { user } = useAuth()
  const [photos, setPhotos]       = useState([])
  const [loading, setLoading]     = useState(true)
  const [uploading, setUploading] = useState(false)
  const [error, setError]         = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [lightbox, setLightbox]   = useState(null) // photo en grand
  const fileRef = useRef(null)

  useEffect(() => { fetchPhotos() }, [item.id])

  const fetchPhotos = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('item_photos')
      .select('*')
      .eq('item_id', item.id)
      .order('created_at', { ascending: true })
    const list = data || []
    setPhotos(list)
    setLoading(false)
    onCountChange?.(item.id, list.length)
  }

  const handleUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) { setError('Format non supporté.'); return }
    if (file.size > 15 * 1024 * 1024) { setError('Image trop lourde (max 15 Mo).'); return }
    if (photos.length >= MAX_PHOTOS) { setError(`Maximum ${MAX_PHOTOS} photos par item.`); return }

    setUploading(true)
    setError('')

    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
    const path = `${user.id}/photos/${item.id}/${crypto.randomUUID()}.${ext}`

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('item-images')
      .upload(path, file, { contentType: file.type })

    if (uploadError) {
      setError("Erreur lors de l'upload. Réessaie.")
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
      return
    }

    const { data: { publicUrl } } = supabase.storage.from('item-images').getPublicUrl(uploadData.path)

    const { error: dbError } = await supabase
      .from('item_photos')
      .insert({ item_id: item.id, user_id: user.id, photo_url: publicUrl })

    if (dbError) {
      setError('Erreur lors de la sauvegarde.')
    } else {
      await fetchPhotos()
    }
    setUploading(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  const confirmDelete = async () => {
    if (!deleteConfirm) return
    // Supprimer du storage
    try {
      const urlParts = deleteConfirm.photo_url.split('/item-images/')
      if (urlParts[1]) {
        const storagePath = decodeURIComponent(urlParts[1].split('?')[0])
        await supabase.storage.from('item-images').remove([storagePath])
      }
    } catch (_) { /* ignore storage error */ }
    // Supprimer de la DB
    await supabase.from('item_photos').delete().eq('id', deleteConfirm.id)
    setDeleteConfirm(null)
    await fetchPhotos()
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col" style={{ maxHeight: '90vh' }}>

          {/* Header */}
          <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 shrink-0">
            <span className="text-xl">📷</span>
            <div className="flex-1 min-w-0">
              <h2 className="text-base font-bold text-gray-900 leading-tight">Mes photos</h2>
              <p className="text-xs text-gray-400 truncate">{item.name || 'Item sans nom'}</p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none shrink-0">✕</button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-4">
            {error && (
              <div className="mb-3 text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2 flex items-center gap-2">
                <span>⚠️</span>{error}
              </div>
            )}

            {loading ? (
              <div className="flex items-center justify-center py-16">
                <div className="w-6 h-6 border-2 border-t-transparent border-red-400 rounded-full animate-spin" />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {photos.map((photo, idx) => (
                  <div key={photo.id}
                    className="relative group rounded-xl overflow-hidden bg-gray-100 cursor-pointer"
                    style={{ aspectRatio: '1' }}
                    onClick={() => setLightbox(idx)}
                  >
                    <img
                      src={photo.photo_url}
                      alt=""
                      className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                    />
                    {/* Overlay hover */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-200 flex items-end justify-between p-2 opacity-0 group-hover:opacity-100">
                      <span className="text-white text-[10px] font-medium bg-black/30 rounded-lg px-2 py-1">
                        {new Date(photo.created_at).toLocaleDateString('fr-FR')}
                      </span>
                      <button
                        onClick={e => { e.stopPropagation(); setDeleteConfirm(photo) }}
                        className="bg-red-500 hover:bg-red-600 text-white text-xs font-semibold px-2 py-1 rounded-lg transition-colors"
                      >🗑</button>
                    </div>
                  </div>
                ))}

                {/* Bouton ajout */}
                {photos.length < MAX_PHOTOS && (
                  <label
                    className={`relative flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed cursor-pointer transition-all ${
                      uploading
                        ? 'border-red-300 bg-red-50 cursor-not-allowed'
                        : 'border-gray-200 hover:border-red-300 hover:bg-red-50/40'
                    }`}
                    style={{ aspectRatio: '1' }}
                  >
                    <input
                      ref={fileRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleUpload}
                      disabled={uploading}
                    />
                    {uploading ? (
                      <>
                        <div className="w-7 h-7 border-2 border-t-transparent border-red-400 rounded-full animate-spin" />
                        <span className="text-xs text-gray-400">Upload…</span>
                      </>
                    ) : (
                      <>
                        <span className="text-3xl">📸</span>
                        <span className="text-xs text-gray-400 text-center px-3 leading-snug">
                          Prendre ou<br/>importer une photo
                        </span>
                      </>
                    )}
                  </label>
                )}
              </div>
            )}

            {!loading && photos.length === 0 && (
              <p className="text-center text-sm text-gray-400 mt-2">
                Aucune photo pour l'instant.<br />
                Ajoute la première ! 📸
              </p>
            )}
          </div>

          {/* Footer */}
          <div className="px-5 py-3 border-t border-gray-100 shrink-0">
            <p className="text-xs text-gray-400 text-center">
              {photos.length}/{MAX_PHOTOS} photos · JPG, PNG, WebP — max 15 Mo
            </p>
          </div>
        </div>
      </div>

      {/* Lightbox */}
      {lightbox !== null && photos[lightbox] && (
        <div
          className="fixed inset-0 bg-black/90 z-[60] flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <img
            src={photos[lightbox].photo_url}
            alt=""
            className="max-w-full max-h-full rounded-xl object-contain"
            onClick={e => e.stopPropagation()}
          />
          {/* Navigation */}
          {photos.length > 1 && (
            <>
              <button
                onClick={e => { e.stopPropagation(); setLightbox((lightbox - 1 + photos.length) % photos.length) }}
                className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/20 hover:bg-white/40 text-white rounded-full flex items-center justify-center text-xl transition-colors"
              >←</button>
              <button
                onClick={e => { e.stopPropagation(); setLightbox((lightbox + 1) % photos.length) }}
                className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/20 hover:bg-white/40 text-white rounded-full flex items-center justify-center text-xl transition-colors"
              >→</button>
            </>
          )}
          <button
            onClick={() => setLightbox(null)}
            className="absolute top-4 right-4 w-9 h-9 bg-white/20 hover:bg-white/40 text-white rounded-full flex items-center justify-center text-lg transition-colors"
          >✕</button>
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/60 text-xs">
            {lightbox + 1} / {photos.length}
          </div>
        </div>
      )}

      {/* Confirm delete */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[70] p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xs p-6 text-center">
            <div className="text-4xl mb-3">🗑️</div>
            <h3 className="font-bold text-gray-900 mb-1">Supprimer cette photo ?</h3>
            <p className="text-sm text-gray-400 mb-5">Cette action est irréversible.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 py-2.5 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl transition-colors">
                Annuler
              </button>
              <button onClick={confirmDelete} className="flex-1 py-2.5 px-4 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-xl transition-colors">
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
