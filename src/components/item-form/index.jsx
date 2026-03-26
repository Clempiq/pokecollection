import { useState, useEffect } from 'react'
import { useItemOptions } from '../../lib/itemOptions'
import { usePokemonProducts } from '../../lib/pokemonProducts'
import { extractPrice, extractImage, deriveItemType } from '../../lib/pokemonApi'
import SearchStep from './SearchStep'
import FormStep from './FormStep'

export default function ItemFormModal({ item, onClose, onSave, title }) {
  const isEdit = !!item
  const [step, setStep] = useState(isEdit ? 'form' : 'search')
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { types, conditions, loading: optionsLoading } = useItemOptions()
  const { products: dbProducts, sets: dbSets, loading: productsLoading } = usePokemonProducts()

  // Champs du formulaire
  const [purchasePrice, setPurchasePrice] = useState('')
  const [purchasedAt, setPurchasedAt] = useState(() => new Date().toISOString().split('T')[0])
  const [currentValue, setCurrentValue] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [condition, setCondition] = useState('')
  const [notes, setNotes] = useState('')

  // Champs manuels
  const [manualName, setManualName] = useState('')
  const [manualSet, setManualSet] = useState('')
  const [manualType, setManualType] = useState('')
  const [manualVariant, setManualVariant] = useState('')
  const [cachedImageUrl, setCachedImageUrl] = useState(null)
  const [cachedApiProductId, setCachedApiProductId] = useState(null)
  const [imageUploading, setImageUploading] = useState(false)
  const [imagePreview, setImagePreview] = useState(null)

  // État par défaut de la condition
  useEffect(() => {
    if (conditions.length > 0 && !condition) setCondition(conditions[0].label)
  }, [conditions])

  // Pré-remplissage en mode édition
  useEffect(() => {
    if (item) {
      setPurchasePrice(item.purchase_price ?? '')
      setPurchasedAt(item.purchased_at ?? null)
      setCurrentValue(item.current_value ?? '')
      setQuantity(item.quantity || 1)
      setCondition(item.condition || '')
      setNotes(item.notes || '')
      setManualName(item.name || '')
      setManualSet(item.set_name || '')
      setManualType(item.item_type || '')
      setManualVariant(item.variant_notes || '')
      setCachedImageUrl(item.api_image_url || null)
      setImagePreview(null)
    }
  }, [item])

  const handleSelectApiProduct = (product) => {
    const price = extractPrice(product)
    setSelectedProduct(product)
    setCurrentValue(price ? price.toFixed(2) : '')
    setManualType(deriveItemType(product.name))
    setManualSet(product.episode?.name || product.setName || '')
    setManualName(product.name || '')
    setCachedImageUrl(null)
    setCachedApiProductId(null)
    setStep('form')
  }

  const handleDeselectProduct = () => {
    setSelectedProduct(null)
    setStep('search')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    const finalSetName = manualSet.trim() || (selectedProduct ? (selectedProduct.episode?.name || selectedProduct.setName || '') : '') || ''
    const finalItemType = manualType || (selectedProduct ? deriveItemType(selectedProduct.name) : '') || ''
    const finalCondition = condition || conditions[0]?.label || ''

    if (!finalSetName && !manualName && !selectedProduct) {
      setError('Sélectionne un produit ou remplis au moins le nom.')
      return
    }
    if (!finalSetName) {
      setError('Précise l\'extension / set du produit.')
      return
    }
    setLoading(true)
    const { error: saveError } = await onSave({
      name: selectedProduct ? selectedProduct.name : manualName || null,
      set_name: finalSetName,
      item_type: finalItemType,
      variant_notes: manualVariant || null,
      quantity: parseInt(quantity) || 1,
      condition: finalCondition,
      purchase_price: purchasePrice !== '' ? parseFloat(purchasePrice) : null,
      purchased_at: purchasedAt || null,
      current_value: currentValue !== '' ? parseFloat(currentValue) : null,
      notes: notes || null,
      api_image_url: selectedProduct
        ? extractImage(selectedProduct)
        : cachedImageUrl || null,
      api_product_id: selectedProduct
        ? String(selectedProduct.id || '')
        : cachedApiProductId || null,
      // full_data retiré : la colonne n'existe pas en DB (cause de l'erreur 400)
    }) || {}
    if (saveError) setError('Erreur lors de la sauvegarde. Réessaie.')
    setLoading(false)
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 sm:p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl w-full sm:max-w-lg flex flex-col max-h-[92vh]"
        onClick={e => e.stopPropagation()}
      >

        {/* Drag handle */}
        <div className="sm:hidden flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 bg-gray-200 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100 shrink-0">
          {step === 'form' && !isEdit && (
            <button onClick={handleDeselectProduct}
              className="text-gray-400 hover:text-gray-600 text-xl leading-none">←</button>
          )}
          <h2 className="text-lg font-bold text-gray-900 flex-1">
            {title || (isEdit ? '✏️ Modifier' : step === 'search' ? 'Rechercher un produit' : '➕ Détails')}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
        </div>

        {/* STEP 1 : Recherche */}
        {step === 'search' && (
          <SearchStep
            onSelectProduct={handleSelectApiProduct}
            onGoToForm={() => setStep('form')}
          />
        )}

        {/* STEP 2 : Formulaire */}
        {step === 'form' && (
          <FormStep
            isEdit={isEdit}
            selectedProduct={selectedProduct}
            onDeselectProduct={handleDeselectProduct}
            manualName={manualName}
            setManualName={setManualName}
            manualSet={manualSet}
            setManualSet={setManualSet}
            manualType={manualType}
            setManualType={setManualType}
            manualVariant={manualVariant}
            setManualVariant={setManualVariant}
            purchasePrice={purchasePrice}
            setPurchasePrice={setPurchasePrice}
            purchasedAt={purchasedAt}
            setPurchasedAt={setPurchasedAt}
            currentValue={currentValue}
            setCurrentValue={setCurrentValue}
            quantity={quantity}
            setQuantity={setQuantity}
            condition={condition}
            setCondition={setCondition}
            notes={notes}
            setNotes={setNotes}
            cachedImageUrl={cachedImageUrl}
            setCachedImageUrl={setCachedImageUrl}
            imagePreview={imagePreview}
            setImagePreview={setImagePreview}
            imageUploading={imageUploading}
            setImageUploading={setImageUploading}
            cachedApiProductId={cachedApiProductId}
            setCachedApiProductId={setCachedApiProductId}
            types={types}
            conditions={conditions}
            dbProducts={dbProducts}
            dbSets={dbSets}
            productsLoading={productsLoading}
            error={error}
            setError={setError}
            loading={loading}
            onSubmit={handleSubmit}
          />
        )}
      </div>
    </div>
  )
}
