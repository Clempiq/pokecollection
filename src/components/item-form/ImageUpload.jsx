import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'

export default function ImageUpload({
  cachedImageUrl,
  imagePreview,
  imageUploading,
  onImageUpload,
  onImageRemove,
  setError
}) {
  const { user } = useAuth()

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) { setError('Fichier non supporté.'); return }
    if (file.size > 5 * 1024 * 1024) { setError('Image trop lourde (max 5 Mo).'); return }

    const preview = URL.createObjectURL(file)
    onImageUpload({ preview, loading: true, error: null })
    setError('')

    const ext = file.name.split('.').pop().toLowerCase()
    const path = `${user.id}/${crypto.randomUUID()}.${ext}`
    const { data, error: uploadError } = await supabase.storage
      .from('item-images')
      .upload(path, file, { contentType: file.type, upsert: false })

    if (uploadError) {
      setError("Erreur lors de l'upload de l'image.")
      onImageUpload({ preview: null, loading: false, error: uploadError })
    } else {
      const { data: { publicUrl } } = supabase.storage.from('item-images').getPublicUrl(data.path)
      onImageUpload({ url: publicUrl, loading: false, error: null })
    }
  }

  return (
    <div>
      <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
        Photo <span className="text-xs font-normal" style={{ color: 'var(--text-muted)' }}>(optionnel)</span>
      </label>

      {!cachedImageUrl ? (
        <label
          className="flex flex-col items-center justify-center gap-2 rounded-xl py-5 px-4 cursor-pointer transition-colors border-2 border-dashed"
          style={{ borderColor: imageUploading ? 'var(--accent)' : 'var(--border-strong)', backgroundColor: 'var(--bg-subtle)' }}
        >
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={handleImageUpload}
            disabled={imageUploading}
          />
          {imageUploading ? (
            <>
              <span className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--accent)' }} />
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Upload en cours…</span>
            </>
          ) : (
            <>
              <span className="text-2xl">📷</span>
              <span className="text-xs text-center" style={{ color: 'var(--text-muted)' }}>
                Clique pour ajouter une photo<br />
                JPG, PNG, WebP · max 5 Mo
              </span>
            </>
          )}
        </label>
      ) : (
        <div
          className="flex items-center gap-3 rounded-xl p-2.5"
          style={{ backgroundColor: 'var(--bg-subtle)', border: '1px solid var(--border)' }}
        >
          <img
            src={imagePreview || cachedImageUrl}
            alt=""
            className="w-12 h-12 object-contain rounded-lg shrink-0"
            style={{ backgroundColor: 'var(--bg-surface)' }}
          />
          <p className="text-xs flex-1 truncate" style={{ color: 'var(--text-secondary)' }}>
            Image ajoutée ✓
          </p>
          <button
            type="button"
            onClick={onImageRemove}
            className="text-sm leading-none p-1 rounded-lg transition-colors"
            style={{ color: 'var(--text-muted)' }}
            title="Supprimer l'image"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  )
}
