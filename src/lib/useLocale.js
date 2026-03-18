import { useMemo } from 'react'

const TRANSLATIONS = {
  fr: {
    collection: 'Collection',
    wishlist: 'Wishlist',
    friends: 'Amis',
    profile: 'Profil',
    add: 'Ajouter',
    edit: 'Modifier',
    delete: 'Supprimer',
    save: 'Enregistrer',
    cancel: 'Annuler',
  },
  en: {
    collection: 'Collection',
    wishlist: 'Wishlist',
    friends: 'Friends',
    profile: 'Profile',
    add: 'Add',
    edit: 'Edit',
    delete: 'Delete',
    save: 'Save',
    cancel: 'Cancel',
  },
}

export function useLocale() {
  return useMemo(() => {
    const lang = navigator.language.split('-')[0]
    return TRANSLATIONS[lang] || TRANSLATIONS.en
  }, [])
}
