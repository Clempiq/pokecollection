import { useState, useEffect } from 'react'

export default function PWAInstallButton({ variant = 'button' }) {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [showPrompt, setShowPrompt] = useState(false)

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setShowPrompt(true)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    setDeferredPrompt(null)
    setShowPrompt(false)
  }

  if (!showPrompt) return null

  if (variant === 'banner') {
    return (
      <div className="card p-6 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900 dark:to-purple-900 border-2 border-blue-200 dark:border-purple-700">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-gray-900 dark:text-white">Installer l'application</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Accédez à votre collection n'importe où, même hors ligne</p>
          </div>
          <button
            onClick={handleInstall}
            className="btn-primary py-2 px-4 whitespace-nowrap"
          >
            Installer
          </button>
        </div>
      </div>
    )
  }

  return (
    <button onClick={handleInstall} className="btn-primary py-2 px-4">
      📋 Installer l'app
    </button>
  )
}
