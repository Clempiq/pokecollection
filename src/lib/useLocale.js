/**
 * useLocale — détecte la langue du navigateur et retourne les traductions
 * utilisées dans les formulaires d'ajout.
 *
 * Langues supportées : fr (français), en (anglais, défaut)
 * Ajouter une nouvelle langue : ajouter une clé dans TRANSLATIONS.
 */

const TRANSLATIONS = {
  fr: {
    // Labels champs
    product:        'Produit',
    extension:      'Extension',
    type:           'Type',
    variant:        'Variante',
    purchasePrice:  "Prix d'achat (€)",
    currentValue:   'Valeur actuelle (€)',
    targetPrice:    'Prix cible (€)',
    quantity:       'Quantité',
    condition:      'État',
    notes:          'Notes',
    priority:       'Priorité',
    // Placeholders
    productPh:      'Rechercher dans le catalogue…',
    extensionPh:    'ex: Paradox Rift',
    variantPh:      'Japonais, 1st edition…',
    notesPh:        'Informations supplémentaires…',
    wishlistNotesPh:'Où le trouver, budget max…',
    // Options
    choose:         '— Choisir —',
    optional:       '(facultatif)',
    // Boutons
    cancel:         'Annuler',
    save:           'Ajouter à ma collection',
    saveWishlist:   'Ajouter à la wishlist',
    saveEdit:       'Modifier',
    saving:         'Enregistrement…',
    // Recherche
    searchProduct:  '🔍 Rechercher un produit',
    addManually:    'Ajouter manuellement sans recherche →',
    noResults:      'Aucun produit trouvé',
    searchPh:       'Obsidian Flames ETB, Paradox Rift booster box…',
    cmPrice:        'Prix Cardmarket FR',
    // Sections
    searchCardmarket: '🔍 Rechercher sur Cardmarket',
    // Urgence wishlist
    urgent:         'Urgent',
    normal:         'Normal',
    someday:        'Un jour',
  },
  en: {
    product:        'Product',
    extension:      'Set',
    type:           'Type',
    variant:        'Variant',
    purchasePrice:  'Purchase price (€)',
    currentValue:   'Current value (€)',
    targetPrice:    'Target price (€)',
    quantity:       'Quantity',
    condition:      'Condition',
    notes:          'Notes',
    priority:       'Priority',
    productPh:      'Search the catalogue…',
    extensionPh:    'e.g. Paradox Rift',
    variantPh:      'Japanese, 1st edition…',
    notesPh:        'Additional info…',
    wishlistNotesPh:'Where to find it, max budget…',
    choose:         '— Choose —',
    optional:       '(optional)',
    cancel:         'Cancel',
    save:           'Add to my collection',
    saveWishlist:   'Add to wishlist',
    saveEdit:       'Save changes',
    saving:         'Saving…',
    searchProduct:  '🔍 Search for a product',
    addManually:    'Add manually without search →',
    noResults:      'No product found',
    searchPh:       'Obsidian Flames ETB, Paradox Rift booster box…',
    cmPrice:        'Cardmarket FR price',
    searchCardmarket: '🔍 Search on Cardmarket',
    urgent:         'Urgent',
    normal:         'Normal',
    someday:        'Someday',
  },
}

// Détecter la langue du navigateur (ex: "fr-FR" → "fr")
function detectLang() {
  const lang = (typeof navigator !== 'undefined' ? navigator.language : 'fr') || 'fr'
  const code = lang.split('-')[0].toLowerCase()
  return TRANSLATIONS[code] ? code : 'en'
}

const _lang = detectLang()
const _translations = TRANSLATIONS[_lang]

/**
 * Retourne les traductions pour la langue du navigateur.
 * Pas de state React — la langue ne change pas pendant la session.
 */
export function useLocale() {
  return {
    lang: _lang,
    t: (key) => _translations[key] ?? key,
  }
}
