import { Link, useLocation } from 'react-router-dom'
import { useEffect, useState, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import NotificationCenter from './NotificationCenter'

export default function Navbar() {
  const { user, signOut, profile } = useAuth()
  const location = useLocation()
  const [pendingCount, setPendingCount] = useState(0)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)

  const isActive = (path) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path)

  const displayName = profile
    ? (profile.first_name || profile.last_name
        ? [profile.first_name, profile.last_name].filter(Boolean).join(' ')
        : user?.email)
    : user?.email

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

  // Close mobile menu on outside click
  useEffect(() => {
    function handle(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  const navLinks = [
    { to: '/', label: 'Dashboard', icon: '🏠' },
    { to: '/collection', label: 'Collection', icon: '📦' },
    { to: '/shared', label: 'Communes', icon: '🤝' },
  ]

  return (
    <nav className="bg-pokemon-blue shadow-lg sticky top-0 z-40">
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
            <span className="text-white font-bold text-base sm:text-lg tracking-wide">PokéCollection</span>
          </Link>

          {/* Desktop nav links */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map(({ to, label }) => (
              <Link
                key={to}
                to={to}
                className={`text-sm font-medium px-3 py-1.5 rounded-lg transition-colors ${
                  isActive(to) ? 'text-pokemon-yellow' : 'text-blue-200 hover:text-white'
                }`}
              >
                {label}
              </Link>
            ))}
            <Link
              to="/friends"
              className={`relative text-sm font-medium px-3 py-1.5 rounded-lg transition-colors ${
                isActive('/friends') ? 'text-pokemon-yellow' : 'text-blue-200 hover:text-white'
              }`}
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
                className={`text-sm font-medium px-3 py-1.5 rounded-lg transition-colors ${
                  isActive('/admin') ? 'text-pokemon-yellow' : 'text-blue-200 hover:text-white'
                }`}
              >
                ⚙️ Admin
              </Link>
            )}
          </div>

          {/* Right cluster */}
          <div className="flex items-center gap-1 sm:gap-2">
            {/* Bell always visible */}
            <div className="bg-blue-700/40 rounded-lg">
              <NotificationCenter />
            </div>

            {/* Profile name — desktop only */}
            <Link
              to="/profile"
              className="hidden md:block text-xs truncate max-w-28 text-blue-300 hover:text-white transition-colors"
            >
              {displayName}
            </Link>

            {/* Sign out — desktop only */}
            <button
              onClick={signOut}
              className="hidden md:block text-xs bg-blue-700 hover:bg-blue-600 text-white px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap"
            >
              Déco
            </button>

            {/* Hamburger — mobile only */}
            <button
              onClick={() => setMenuOpen(v => !v)}
              className="md:hidden p-2 rounded-lg hover:bg-white/10 transition-colors"
              aria-label="Menu"
            >
              <div className="w-5 flex flex-col gap-1.5">
                <span className={`block h-0.5 bg-white transition-all duration-200 ${menuOpen ? 'rotate-45 translate-y-2' : ''}`} />
                <span className={`block h-0.5 bg-white transition-all duration-200 ${menuOpen ? 'opacity-0' : ''}`} />
                <span className={`block h-0.5 bg-white transition-all duration-200 ${menuOpen ? '-rotate-45 -translate-y-2' : ''}`} />
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile slide-down menu */}
      {menuOpen && (
        <div ref={menuRef} className="md:hidden bg-blue-800 border-t border-blue-700 px-4 py-3 space-y-1">
          {[
            { to: '/', label: '🏠 Dashboard' },
            { to: '/collection', label: '📦 Collection' },
            { to: '/shared', label: '🤝 Communes' },
            { to: '/friends', label: '👥 Amis', badge: pendingCount },
            { to: '/profile', label: '👤 Mon profil' },
            ...(profile?.is_admin ? [{ to: '/admin', label: '⚙️ Admin' }] : []),
          ].map(({ to, label, badge }) => (
            <Link
              key={to}
              to={to}
              className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                isActive(to) ? 'bg-blue-700 text-pokemon-yellow' : 'text-blue-100 hover:bg-blue-700'
              }`}
            >
              {label}
              {badge > 0 && (
                <span className="bg-pokemon-red text-white text-xs font-bold px-1.5 py-0.5 rounded-full">
                  {badge}
                </span>
              )}
            </Link>
          ))}
          <div className="pt-2 border-t border-blue-700">
            <button
              onClick={signOut}
              className="w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium text-red-300 hover:bg-blue-700 transition-colors"
            >
              🚪 Se déconnecter
            </button>
          </div>
        </div>
      )}
    </nav>
  )
}
