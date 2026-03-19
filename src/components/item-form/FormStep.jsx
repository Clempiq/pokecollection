import { extractPrice, extractImage, deriveItemType } from '../../lib/pokemonApi'
import { useLocale } from '../../lib/useLocale'
import ProductCombobox from '../ProductCombobox'
import ImageUpload from './ImageUpload'

export default function FormStep({
  isEdit,
  selectedProduct,
  onDeselectProduct,
  manualName,
  setManualName,
  manualSet,
  setManualSet,
  manualType,
  setManualType,
  manualVariant,
  setManualVariant,
  purchasePrice,
  setPurchasePrice,
  purchasedAt,
  setPurchasedAt,
  currentValue,
  setCurrentValue,
  quantity,
  setQuantity,
  condition,
  setCondition,
  notes,
  setNotes,
  cachedImageUrl,
  setCachedImageUrl,
  imagePreview,
  setImagePreview,
  imageUploading,
  setImageUploading,
  cachedApiProductId,
  setCachedApiProductId,
  types,
  conditions,
  dbProducts,
  dbSets,
  productsLoading,
  error,
  setError,
  loading,
  onSubmit
}) {
  const { t } = useLocale()

  const handleImageUpload = ({ preview, url, loading: imgLoading, error: imgError }) => {
    if (preview !== undefined) setImagePreview(preview)
    if (url) setCachedImageUrl(url)
    if (imgLoading !== undefined) setImageUploading(imgLoading)
  }

  const handleSelectDbProduct = (dbProduct) => {
    if (!dbProduct) {
      setCachedImageUrl(null)
      setCachedApiProductId(null)
      return
    }
    const price = dbProduct.market_price_fr || dbProduct.market_price || null
    setManualName(dbProduct.name || '')
    setManualSet(dbProduct.set_name || '')
    setManualType(deriveItemType(dbProduct.name))
    setCurrentValue(price ? Number(price).toFixed(2) : '')
    setCachedImageUrl(dbProduct.image_url || null)
    setCachedApiProductId(dbProduct.api_id || null)
  }

  const handleRemoveImage = () => {
    setCachedImageUrl(null)
    setCachedApiProductId(null)
    setImagePreview(null)
  }

  const marketPrice = selectedProduct ? extractPrice(selectedProduct) : null
  const productImage = selectedProduct ? extractImage(selectedProduct) : cachedImageUrl

  return (
    <>
      <form onSubmit={onSubmit} id="item-form" className="overflow-y-auto flex-1 p-6 space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">{error}</div>
        )}

        {selectedProduct ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3 bg-gray-50 rounded-2xl p-3 border border-gray-100">
              {productImage && (
                <div className="w-16 h-16 rounded-xl overflow-hidden bg-white shrink-0 flex items-center justify-center">
                  <img src={productImage} alt="" className="max-w-full max-h-full object-contain" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-gray-900 leading-snug">{selectedProduct.name}</p>
                {marketPrice && (
                  <p className="text-xs text-blue-600 font-semibold mt-1">
                    💰 {t('cmPrice')} : {marketPrice.toFixed(2)} €
                  </p>
                )}
              </div>
              <button type="button" onClick={onDeselectProduct}
                className="text-gray-300 hover:text-gray-500 text-lg shrink-0">✕</button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">{t('extension')}</label>
                {dbSets.length > 0 ? (
                  <select value={manualSet} onChange={e => setManualSet(e.target.value)} className="input-field text-sm">
                    <option value="">{t('choose')}</option>
                    {dbSets.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                ) : (
                  <input value={manualSet} onChange={e => setManualSet(e.target.value)}
                    className="input-field text-sm" placeholder={t('extensionPh')} />
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">{t('type')}</label>
                {types.length > 0 ? (
                  <select value={manualType} onChange={e => setManualType(e.target.value)} className="input-field text-sm">
                    <option value="">{t('choose')}</option>
                    {types.map(tp => <option key={tp.id} value={tp.label}>{tp.icon ? `${tp.icon} ${tp.label}` : tp.label}</option>)}
                  </select>
                ) : (
                  <input value={manualType} onChange={e => setManualType(e.target.value)}
                    className="input-field text-sm" placeholder="ETB, Booster Box…" />
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('product')} <span className="text-gray-400 text-xs font-normal">{t('optional')}</span>
              </label>
              {productsLoading ? (
                <div className="input-field text-sm text-gray-400 flex items-center gap-2">
                  <span className="w-3 h-3 border-2 border-gray-300 border-t-transparent rounded-full animate-spin inline-block" />
                  Chargement du catalogue…
                </div>
              ) : dbProducts.length > 0 ? (
                <ProductCombobox
                  products={dbProducts}
                  value={manualName}
                  onChange={setManualName}
                  onSelect={handleSelectDbProduct}
                  placeholder={t('productPh')}
                />
              ) : (
                <input value={manualName} onChange={e => setManualName(e.target.value)}
                  className="input-field" placeholder="ex: Booster Box Écarlate et Violet" />
              )}
              {cachedImageUrl && (
                <div className="mt-2 flex items-center gap-2 bg-gray-50 rounded-xl p-2 border border-gray-100">
                  <img src={cachedImageUrl} alt="" className="w-10 h-10 object-contain rounded-lg bg-white" />
                  <p className="text-xs text-gray-500 truncate flex-1">{manualName}</p>
                  <button type="button"
                    onClick={() => { setCachedImageUrl(null); setCachedApiProductId(null) }}
                    className="text-gray-300 hover:text-red-400 text-sm leading-none shrink-0">✕</button>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('extension')}</label>
                {dbSets.length > 0 ? (
                  <select value={manualSet} onChange={e => setManualSet(e.target.value)} className="input-field text-sm">
                    <option value="">{t('choose')}</option>
                    {dbSets.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                ) : (
                  <input value={manualSet} onChange={e => setManualSet(e.target.value)}
                    className="input-field" placeholder={t('extensionPh')} />
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('type')}</label>
                {types.length > 0 ? (
                  <select value={manualType} onChange={e => setManualType(e.target.value)} className="input-field text-sm">
                    <option value="">{t('choose')}</option>
                    {types.map(tp => <option key={tp.id} value={tp.label}>{tp.icon ? `${tp.icon} ${tp.label}` : tp.label}</option>)}
                  </select>
                ) : (
                  <input value={manualType} onChange={e => setManualType(e.target.value)}
                    className="input-field" placeholder="ETB, Booster Box…" />
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('variant')} <span className="text-gray-400 text-xs font-normal">{t('optional')}</span>
              </label>
              <input value={manualVariant} onChange={e => setManualVariant(e.target.value)}
                className="input-field" placeholder={t('variantPh')} />
            </div>

            <ImageUpload
              cachedImageUrl={cachedImageUrl}
              imagePreview={imagePreview}
              imageUploading={imageUploading}
              onImageUpload={handleImageUpload}
              onImageRemove={handleRemoveImage}
              setError={setError}
            />
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('purchasePrice')}</label>
            <input type="number" step="0.01" min="0" value={purchasePrice}
              onChange={e => setPurchasePrice(e.target.value)}
              className="input-field" placeholder="0.00" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date d'achat <span className="text-gray-400 text-xs font-normal">{t('optional')}</span>
            </label>
            <input type="date" value={purchasedAt || ''}
              onChange={e => setPurchasedAt(e.target.value || null)}
              className="input-field text-sm" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('currentValue')}
              {marketPrice && <span className="text-[10px] text-blue-400 ml-1">CM: {marketPrice.toFixed(2)} €</span>}
            </label>
            <input type="number" step="0.01" min="0" value={currentValue}
              onChange={e => setCurrentValue(e.target.value)}
              className="input-field" placeholder="0.00" />
          </div>
          <div className="flex flex-col justify-end">
            {purchasedAt && (() => {
              const years = (Date.now() - new Date(purchasedAt)) / (1000 * 60 * 60 * 24 * 365.25)
              if (years < 0.1) return null
              return (
                <p className="text-[11px] text-gray-400 pb-2">
                  {years >= 1 ? `🕰️ Acheté il y a ${Math.floor(years)} an${Math.floor(years) > 1 ? 's' : ''}` : `🕰️ Acheté il y a ${Math.round(years * 12)} mois`}
                </p>
              )
            })()}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('quantity')}</label>
            <input type="number" min="1" value={quantity}
              onChange={e => setQuantity(e.target.value)}
              className="input-field" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('condition')}</label>
            <select value={condition} onChange={e => setCondition(e.target.value)}
              className="input-field" disabled={conditions.length === 0}>
              {conditions.map(c => <option key={c.id} value={c.label}>{c.label}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('notes')} <span className="text-gray-400 text-xs font-normal">{t('optional')}</span>
          </label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)}
            className="input-field resize-none" rows={2} placeholder={t('notesPh')} />
        </div>
      </form>

      <div className="px-6 py-4 border-t border-gray-100 flex gap-3 shrink-0">
        <button type="button" onClick={() => {}} className="btn-secondary flex-1">{t('cancel')}</button>
        <button type="submit" form="item-form" className="btn-primary flex-1" disabled={loading}>
          {loading ? t('saving') : isEdit ? t('saveEdit') : t('save')}
        </button>
      </div>
    </>
  )
}
