import { usePWAInstall } from '../hooks/usePWAInstall'

/**
 * Shows an "Installer l'app" button when the browser allows PWA installation.
 * Disappears automatically once installed or if the browser doesn't support it.
 *
 * variant="banner" → blue full-width banner (e.g. on the profile page)
 * variant="nav"    → compact icon button for the navbar
 */
export default function PWAInstallButton({ variant = 'banner' }) {
  const { canInstall, install, isInstalled } = usePWAInstall()

  if (!canInstall) return null

  if (variant === 'nav') {
    return (
      <button
        onClick={install}
        title="Installer l'application"
        className="flex items-center gap-1.5 text-xs bg-pokemon-yellow hover:bg-yellow-400 text-pokemon-blue font-semibold px-2.5 py-1.5 rounded-lg transition-colors whitespace-nowrap"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="7 10 12 15 17 10"/>
          <line x1="12" y1="15" x2="12" y2="3"/>
        </svg>
        <span className="hidden sm:inline">Installer</span>
      </button>
    )
  }

  // Banner variant
  return (
    <div className="bg-gradient-to-r from-pokemon-blue to-blue-700 rounded-2xl p-4 flex items-center gap-4">
      {/* Pokeball icon */}
      <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shrink-0 shadow">
        <div className="w-8 h-8 rounded-full border-[3px] border-gray-800 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1/2 bg-pokemon-red" />
          <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-white" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-2.5 h-2.5 bg-white rounded-full border-2 border-gray-800 z-10" />
          </div>
        </div>
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-white font-bold text-sm">Installer PokéCollection</p>
        <p className="text-blue-200 text-xs mt-0.5">Accès rapide depuis ton écran d'accueil, même hors ligne</p>
      </div>

      <button
        onClick={install}
        className="shrink-0 bg-white hover:bg-blue-50 text-pokemon-blue font-bold text-sm px-4 py-2 rounded-xl transition-colors shadow-sm"
      >
        Installer
      </button>
    </div>
  )
}
