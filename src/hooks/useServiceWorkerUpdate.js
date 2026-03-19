import { useEffect } from 'react'

/**
 * Détecte quand un nouveau Service Worker prend le contrôle
 * et recharge la page automatiquement pour livrer la nouvelle version.
 */
export function useServiceWorkerUpdate() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return

    // Quand un nouveau SW prend le contrôle → reload
    const handleControllerChange = () => {
      window.location.reload()
    }
    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange)

    // Vérifier s'il y a une mise à jour disponible au chargement
    navigator.serviceWorker.getRegistration().then(reg => {
      if (!reg) return
      reg.update().catch(() => {})
    })

    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange)
    }
  }, [])
}
