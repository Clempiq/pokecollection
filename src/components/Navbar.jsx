import { Link, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

export default function Navbar() {
  const { user, signOut } = useAuth()
  const location = useLocation()
  const [pendingCount, setPendingCount] = useState(0)

  const isActive = (path) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path)

  // Fetch pending friend requests count
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

    // Realtime subscription
    const channel = supabase
      .channel('friendships-navbar')
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'friendships',
        filter: `addressee_id=eq.${user.id}`,
      }, fetchPending)
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [user])

  return (
    <nav className="bg-pokemon-blue shadow-lg">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center shadow">
              <div className="w-5 h-5 rounded-full border-2 border-pokemon-blue relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-1/2 bg-pokemon-red"></div>
                <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-white"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-1.5 h-1.5 bg-white rounded-full border border-pokemon-blue z-10"></div>
                </div>
              </div>
            </div>
            <span className="text-white font-bold text-lg tracking-wide">PokéCollection</span>
          </Link>

          {/* Nav links */}
          <div className="flex items-center gap-1 sm:gap-2">
            {[
              { to: '/', label: 'Dashboard' },
              { to: '/collection', label: 'Collection' },
              { to: '/shared', label: '🤝 Communes' },
            ].map(({ to, label }) => (
              <Link
                key={to}
                to={to}
                className={`text-sm font-medium px-2 py-1 rounded-lg transition-colors ${
                  isActive(to) ? 'text-pokemon-yellow' : 'text-blue-200 hover:text-white'
                }`}
              >
                {label}
              </Link>
            ))}

            {/* Amis avec badge */}
            <Link
              to="/friends"
              className={`relative text-sm font-medium px-2 py-1 rounded-lg transition-colors ${
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

            <div className="flex items-center gap-2 ml-2 pl-3 border-l border-blue-500">
              <span className="text-blue-300 text-xs hidden sm:block truncate max-w-24">{user?.email}</span>
              <button
                onClick={signOut}
                className="text-xs bg-blue-700 hover:bg-blue-600 text-white px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap"
              >
                Déco
              </button>
            </div>
          </div>
        </div>
      </div>
    </nav>
  )
}
