import { useState, useEffect } from 'react'

/**
 * Captures the browser's `beforeinstallprompt` event so we can show our own
 * install button instead of relying on the default browser banner.
 *
 * Returns:
 *   canInstall  – true when the prompt is available (app not yet installed)
 *   install()   – call this when the user clicks the install button
 *   isInstalled – true after the user accepted the prompt
 */
export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [isInstalled, setIsInstalled]       = useState(false)

  useEffect(() => {
    // Check if already running as a standalone PWA
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true
    if (isStandalone) { setIsInstalled(true); return }

    const handler = (e) => {
      e.preventDefault()          // stop Chrome's default mini-infobar
      setDeferredPrompt(e)
    }
    window.addEventListener('beforeinstallprompt', handler)

    // Fired when app is installed via the prompt OR via browser menu
    const installedHandler = () => { setIsInstalled(true); setDeferredPrompt(null) }
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
    if (outcome === 'accepted') setIsInstalled(true)
    setDeferredPrompt(null)
  }

  return {
    canInstall: !!deferredPrompt && !isInstalled,
    install,
    isInstalled,
  }
}
