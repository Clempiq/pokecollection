<<<<<<< HEAD
import { Link, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

export default function BottomNav() {
  const location = useLocation()
  const { user } = useAuth()
  const [pendingCount, setPendingCount] = useState(0)

  const isActive = (path) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path)

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
  }, [user])

  const tabs = [
    {
      to: '/',
      label: 'Accueil',
      icon: (active) => (
        <svg className="w-5 h-5" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
    },
    {
      to: '/collection',
      label: 'Collection',
      icon: (active) => (
        <svg className="w-5 h-5" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      ),
    },
    {
      to: '/friends',
      label: 'Amis',
      badge: pendingCount,
      icon: (active) => (
        <svg className="w-5 h-5" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
    },
    {
      to: '/releases',
      label: 'Sorties',
      icon: (active) => (
        <svg className="w-5 h-5" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
    },
    {
      to: '/wishlist',
      label: 'Wishlist',
      icon: (active) => (
        <svg className="w-5 h-5" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
        </svg>
      ),
    },
  ]

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 safe-area-inset-bottom"
      style={{
        backgroundColor: 'var(--bg-surface)',
        borderTop: '1px solid var(--border)',
      }}
    >
      <div className="flex items-stretch h-16">
        {tabs.map(({ to, label, icon, badge }) => {
          const active = isActive(to)
          return (
            <Link
              key={to}
              to={to}
              className="flex-1 flex flex-col items-center justify-center gap-0.5 relative transition-colors"
              style={{
                color: active ? 'var(--accent)' : 'var(--text-muted)',
              }}
            >
              <div className="relative">
                {icon(active)}
                {badge > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-pokemon-red text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                    {badge > 9 ? '9+' : badge}
                  </span>
                )}
              </div>
              <span
                className="text-[10px] font-medium"
                style={{ color: active ? 'var(--accent)' : 'var(--text-muted)' }}
              >
                {label}
              </span>
              {active && (
                <span
                  className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full"
                  style={{ backgroundColor: 'var(--accent)' }}
                />
              )}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
=======
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { useEffect, useState } from 'react'

export default function BottomNav() {
  const { user, profile } = useAuth()
  const location = useLocation()
  const [requestCount, setRequestCount] = useState(0)

  useEffect(() => {
    if (!user) return

    const channel = supabase
      .channel(`friendships:${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'friendships', filter: `addressee_id=eq.${user.id}` },
        () => fetchCount()
      )
      .subscribe()

    fetchCount()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [user])

  const fetchCount = async () => {
    if (!user) return
    const { count } = await supabase
      .from('friendships')
      .select('id', { count: 'exact', head: true })
      .eq('addressee_id', user.id)
      .eq('status', 'pending')
    setRequestCount(count || 0)
  }

  const isActive = (path) => location.pathname === path

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800">
      <div className="flex justify-around max-w-md mx-auto">
        <Link to="/" className={`flex-1 py-3 text-center text-sm font-medium transition-colors ${
          isActive('/') ? 'text-pokemon-blue' : 'text-gray-600 hover:text-gray-900'
        }`}>📚 Collection</Link>
        <Link to="/wishlist" className={`flex-1 py-3 text-center text-sm font-medium transition-colors ${
          isActive('/wishlist') ? 'text-pokemon-blue' : 'text-gray-600 hover:text-gray-900'
        }`}>🎯 Wishlist</Link>
        <Link to="/releases" className={`flex-1 py-3 text-center text-sm font-medium transition-colors ${
          isActive('/releases') ? 'text-pokemon-blue' : 'text-gray-600 hover:text-gray-900'
        }`}>📅 Sorties</Link>
        <Link to="/friends" className={`flex-1 py-3 text-center text-sm font-medium relative transition-colors ${
          isActive('/friends') ? 'text-pokemon-blue' : 'text-gray-600 hover:text-gray-900'
        }`}>
          👥 Amis
          {requestCount > 0 && <span className="absolute top-1 right-1 bg-pokemon-red text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">{requestCount}</span>}
        </Link>
        <Link to="/profile" className={`flex-1 py-3 text-center text-sm font-medium transition-colors ${
          isActive('/profile') ? 'text-pokemon-blue' : 'text-gray-600 hover:text-gray-900'
        }`}>👤 Profil</Link>
      </div>
    </nav>
  )
}
>>>>>>> 75bda405994aff8b32f967b0793cc12339417565
