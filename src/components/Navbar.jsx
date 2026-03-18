import { Link, useLocation } from 'react-router-dom'
import { useEffect, useState, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import NotificationCenter from './NotificationCenter'
import { usePWAInstall } from '../hooks/usePWAInstall'

export default function Navbar() {
  const { user, signOut, profile } = useAuth()
  const { theme, setTheme, themes } = useTheme()
  const location = useLocation()
  const [pendingCount, setPendingCount] = useState(0)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)
  const hamburgerRef = useRef(null)
  const { canInstall, install, isStandalone, isIOS } = usePWAInstall()

  const isActive = (path) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path)

  const displayName = profile?.username || user?.email

  useEffect(() => {
    if (!user) return
    async function fetchPending() {
      const { count } = await supabase
        .from('friendships')
        .select('*', { count: 'exact', head: true })
        .eq('addressee_id', user.id)
        .eq('status', 'pending')
      setPendingCount(count || 0)
    }
    fetchPending()
    const channel = supabase
      .channel('friendships-navbar')
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'friendships',
        filter: `addressee_id=eq.${user.id}`,
      }, fetchPending)
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [user])

  // Close mobile menu on route change
  useEffect(() => { setMenuOpen(false) }, [location.pathname])

  // Close mobile menu on outside click (skip if clicking hamburger — button handles it)
  useEffect(() => {
    function handle(e) {
      if (hamburgerRef.current && hamburgerRef.current.contains(e.target)) return
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  const navLinks = [
    { to: '/', label: 'Dashboard', icon: '🏠' },
    { to: '/collection', label: 'Collection', icon: '📦' },
    { to: '/wishlist', label: 'Wishlist', icon: '✨' },
    { to: '/releases', label: 'Sorties', icon: '📅' },
    { to: '/shared', label: 'Communes', icon: '🤝' },
  ]

  return (
    <nav className="theme-nav sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-14 sm:h-16">

          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <div className="w-7 h-7 sm:w-8 sm:h-8 bg-white rounded-full flex items-center justify-center shadow">
              <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-full border-2 border-pokemon-blue relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-1/2 bg-pokemon-red"></div>
                <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-white"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-1.5 h-1.5 bg-white rounded-full border border-pokemon-blue z-10"></div>
                </div>
              </div>
            </div>
            <span className="font-bold text-base sm:text-lg tracking-wide" style={{ color: 'var(--nav-text-active)' }}>
              PokéCollection
            </span>
          </Link>

          {/* Desktop nav links */}
          <div className="hidden md:flex items-center gap-0.5">
            {navLinks.map(({ to, label }) => (
              <Link
                key={to}
                to={to}
                className="text-sm font-medium px-3 py-1.5 rounded-lg transition-colors"
                style={{
                  color: isActive(to) ? 'var(--nav-text-active)' : 'var(--nav-text)',
                  backgroundColor: isActive(to) ? 'var(--nav-active)' : undefined,
                }}
                onMouseEnter={e => { if (!isActive(to)) e.currentTarget.style.backgroundColor = 'var(--nav-hover)' }}
                onMouseLeave={e => { if (!isActive(to)) e.currentTarget.style.backgroundColor = '' }}
              >
                {label}
              </Link>
            ))}
            <Link
              to="/friends"
              className="relative text-sm font-medium px-3 py-1.5 rounded-lg transition-colors"
              style={{
                color: isActive('/friends') ? 'var(--nav-text-active)' : 'var(--nav-text)',
                backgroundColor: isActive('/friends') ? 'var(--nav-active)' : undefined,
              }}
              onMouseEnter={e => { if (!isActive('/friends')) e.currentTarget.style.backgroundColor = 'var(--nav-hover)' }}
              onMouseLeave={e => { if (!isActive('/friends')) e.currentTarget.style.backgroundColor = '' }}
            >
              👥 Amis
              {pendingCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-pokemon-red text-white text-xs font-bold w-4 h-4 rounded-full flex items-center justify-center leading-none">
                  {pendingCount}
                </span>
              )}
            </Link>
            {profile?.is_admin && (
              <Link
                to="/admin"
                className="text-sm font-medium px-3 py-1.5 rounded-lg transition-colors"
                style={{
                  color: isActive('/admin') ? 'var(--nav-text-active)' : 'var(--nav-text)',
                  backgroundColor: isActive('/admin') ? 'var(--nav-active)' : undefined,
                }}
                onMouseEnter={e => { if (!isActive('/admin')) e.currentTarget.style.backgroundColor = 'var(--nav-hover)' }}
                onMouseLeave={e => { if (!isActive('/admin')) e.currentTarget.style.backgroundColor = '' }}
              >
                ⚙️ Admin
              </Link>
            )}
          </div>

          {/* Right cluster */}
          <div className="flex items-center gap-1.5 sm:gap-2">

            {/* Theme switcher — desktop only */}
            <div className="hidden md:flex items-center gap-0.5 rounded-lg p-0.5" style={{ backgroundColor: 'var(--nav-active)' }}>
              {themes.map(t => (
                <button
                  key={t.id}
                  onClick={() => setTheme(t.id)}
                  title={t.label}
                  className="w-7 h-7 rounded-md text-sm flex items-center justify-center transition-all"
                  style={{
                    backgroundColor: theme === t.id ? 'var(--bg-surface-raised)' : 'transparent',
                    boxShadow: theme === t.id ? '0 1px 3px rgba(0,0,0,0.3)' : undefined,
                    opacity: theme === t.id ? 1 : 0.65,
                  }}
                >
                  {t.icon}
                </button>
              ))}
            </div>

            {/* Bell always visible */}
            <div className="rounded-lg" style={{ backgroundColor: 'var(--nav-active)' }}>
              <NotificationCenter />
            </div>

            {/* Profile name — desktop only */}
            <Link
              to="/profile"
              className="hidden md:block text-xs truncate max-w-28 transition-colors"
              style={{ color: 'var(--nav-text)' }}
              onMouseEnter={e => { e.currentTarget.style.color = 'var(--nav-text-active)' }}
              onMouseLeave={e => { e.currentTarget.style.color = 'var(--nav-text)' }}
            >
              {displayName}
            </Link>

            {/* Sign out — desktop only */}
            <button
              onClick={signOut}
              className="hidden md:block text-xs px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap font-medium"
              style={{ backgroundColor: 'var(--nav-active)', color: 'var(--nav-text)' }}
              onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--bg-surface-raised)'; e.currentTarget.style.color = 'var(--nav-text-active)' }}
              onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'var(--nav-active)'; e.currentTarget.style.color = 'var(--nav-text)' }}
            >
              Déco
            </button>

            {/* Hamburger — mobile only */}
            <button
              ref={hamburgerRef}
              onClick={() => setMenuOpen(v => !v)}
              className="md:hidden p-2 rounded-lg transition-colors"
              style={{ color: 'var(--nav-text-active)' }}
              onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--nav-hover)' }}
              onMouseLeave={e => { e.currentTarget.style.backgroundColor = '' }}
              aria-label="Menu"
            >
              <div className="w-5 flex flex-col gap-1.5">
                <span className={`block h-0.5 rounded-full bg-current transition-all duration-200 ${menuOpen ? 'rotate-45 translate-y-2' : ''}`} />
                <span className={`block h-0.5 rounded-full bg-current transition-all duration-200 ${menuOpen ? 'opacity-0' : ''}`} />
                <span className={`block h-0.5 rounded-full bg-current transition-all duration-200 ${menuOpen ? '-rotate-45 -translate-y-2' : ''}`} />
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile slide-down menu */}
      {menuOpen && (
        <div ref={menuRef} className="theme-nav-mobile-menu md:hidden px-4 py-3 space-y-1">

          {/* Header */}
          <div className="flex items-center justify-between pb-2 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--nav-text)' }}>Navigation</span>
            <button
              onClick={() => setMenuOpen(false)}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-sm leading-none transition-colors"
              style={{ backgroundColor: 'var(--nav-active)', color: 'var(--nav-text)' }}
              aria-label="Fermer le menu"
            >
              ✕
            </button>
          </div>

          {[
            { to: '/', label: '🏠 Dashboard' },
            { to: '/collection', label: '📦 Collection' },
            { to: '/wishlist', label: '✨ Wishlist' },
            { to: '/releases', label: '📅 Sorties' },
            { to: '/shared', label: '🤝 Communes' },
            { to: '/friends', label: '👥 Amis', badge: pendingCount },
            { to: '/profile', label: '👤 Mon profil' },
            ...(profile?.is_admin ? [{ to: '/admin', label: '⚙️ Admin' }] : []),
          ].map(({ to, label, badge }) => (
            <Link
              key={to}
              to={to}
              className="flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-colors"
              style={{
                backgroundColor: isActive(to) ? 'var(--nav-active)' : 'transparent',
                color: isActive(to) ? 'var(--nav-text-active)' : 'var(--nav-text)',
              }}
            >
              {label}
              {badge > 0 && (
                <span className="bg-pokemon-red text-white text-xs font-bold px-1.5 py-0.5 rounded-full">
                  {badge}
                </span>
              )}
            </Link>
          ))}

          {/* Theme switcher row */}
          <div className="flex items-center gap-2 px-3 pt-1">
            <span className="text-xs font-medium" style={{ color: 'var(--nav-text)' }}>Thème</span>
            <div className="flex items-center gap-1">
              {themes.map(t => (
                <button
                  key={t.id}
                  onClick={() => setTheme(t.id)}
                  title={t.label}
                  className="w-8 h-8 rounded-lg text-base flex items-center justify-center transition-all"
                  style={{
                    backgroundColor: theme === t.id ? 'var(--nav-active)' : 'transparent',
                    opacity: theme === t.id ? 1 : 0.55,
                    outline: theme === t.id ? '1px solid var(--border-strong)' : undefined,
                  }}
                >
                  {t.icon}
                </button>
              ))}
            </div>
          </div>

          {/* PWA install */}
          {!isStandalone && (
            <div className="pt-1">
              {canInstall ? (
                <button
                  onClick={install}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors"
                  style={{ color: 'var(--yellow)', backgroundColor: 'var(--nav-active)' }}
                >
                  📲 Télécharger l'application
                </button>
              ) : isIOS ? (
                <div className="px-3 py-2.5 rounded-xl text-xs leading-snug" style={{ backgroundColor: 'var(--nav-active)', color: 'var(--nav-text)' }}>
                  📲 <span className="font-semibold" style={{ color: 'var(--yellow)' }}>Installer sur iOS</span> — Appuyez sur <span className="font-semibold">Partager</span> puis <span className="font-semibold">Sur l'écran d'accueil</span>
                </div>
              ) : (
                <div className="px-3 py-2.5 rounded-xl text-xs leading-snug" style={{ backgroundColor: 'var(--nav-active)', color: 'var(--nav-text)' }}>
                  📲 <span className="font-semibold" style={{ color: 'var(--nav-text-active)' }}>Installer l'app</span> — Utilisez le menu de votre navigateur (<span className="font-semibold">⋮ → Installer</span>)
                </div>
              )}
            </div>
          )}

          <div className="pt-2" style={{ borderTop: '1px solid var(--nav-border)' }}>
            <button
              onClick={signOut}
              className="w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium transition-colors"
              style={{ color: 'var(--red)' }}
              onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--nav-active)' }}
              onMouseLeave={e => { e.currentTarget.style.backgroundColor = '' }}
            >
              🚪 Se déconnecter
            </button>
          </div>
        </div>
      )}
    </nav>
  )
}
