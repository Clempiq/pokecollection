import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

export default function NotificationCenter() {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return

    const fetchNotifications = async () => {
      const { data } = await supabase
        .from('notifications')
        .select(`
          *,
          from_user:profiles!from_user_id(id, username, email)
        `)
        .eq('to_user_id', user.id)
        .order('created_at', { ascending: false })
      setNotifications(data || [])
      setLoading(false)
    }

    fetchNotifications()

    const channel = supabase
      .channel(`notifications:${user.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `to_user_id=eq.${user.id}` },
        (payload) => {
          setNotifications(prev => [payload.new, ...prev])
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user])

  if (loading) {
    return <div className="text-gray-400 text-sm">Chargement...</div>
  }

  if (notifications.length === 0) {
    return <p className="text-gray-400 text-sm text-center py-4">Aucune notification</p>
  }

  return (
    <div className="space-y-2">
      {notifications.map(notif => (
        <div key={notif.id} className="bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
          <p className="text-sm font-medium text-blue-900 dark:text-blue-100">{notif.title}</p>
          <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">{notif.message}</p>
        </div>
      ))}
    </div>
  )
}
