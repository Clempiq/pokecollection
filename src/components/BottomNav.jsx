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
