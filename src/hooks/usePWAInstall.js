import { useState, useEffect } from 'react'

/**
 * Détecte si l'app est installable / installée / en mode standalone.
 *
 * canInstall    – vrai quand Chrome peut afficher la boîte d'install
 * install()     – déclenche la boîte native d'install
 * isInstalled   – vrai après acceptation du prompt
 * isStandalone  – vrai si l'app tourne déjà comme PWA installée
 * isIOS         – vrai sur iOS/iPadOS Safari (pas de beforeinstallprompt)
 */
export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [isInstalled, setIsInstalled]       = useState(false)
  const [isStandalone, setIsStandalone]     = useState(false)

  const isIOS =
    typeof navigator !== 'undefined' &&
    /iPad|iPhone|iPod/.test(navigator.userAgent) &&
    !window.MSStream

  useEffect(() => {
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true
    setIsStandalone(standalone)
    if (standalone) { setIsInstalled(true); return }

    const handler = (e) => {
      e.preventDefault()
      setDeferredPrompt(e)
    }
    window.addEventListener('beforeinstallprompt', handler)

    const installedHandler = () => {
      setIsInstalled(true)
      setIsStandalone(true)
      setDeferredPrompt(null)
    }
    window.addEventListener('appinstalled', installedHandler)

    return () => {
      window.removeEventListener('beforeinstallprompt', handler)
      window.removeEventListener('appinstalled', installedHandler)
    }
  }, [])

  const install = async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') { setIsInstalled(true); setIsStandalone(true) }
    setDeferredPrompt(null)
  }

  return {
    canInstall:  !!deferredPrompt && !isInstalled,
    install,
    isInstalled,
    isStandalone,
    isIOS,
  }
}
