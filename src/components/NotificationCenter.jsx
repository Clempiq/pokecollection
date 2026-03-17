import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from './Toast'
import { Link } from 'react-router-dom'

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return "à l'instant"
  if (m < 60) return `il y a ${m} min`
  const h = Math.floor(m / 60)
  if (h < 24) return `il y a ${h}h`
  return `il y a ${Math.floor(h / 24)}j`
}

export default function NotificationCenter() {
  const { user } = useAuth()
  const { addToast } = useToast()
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)
  // Timestamp of when panel was last opened — notifs before this are "read"
  const [seenAt, setSeenAt] = useState(() => {
    const saved = localStorage.getItem('notif_seen_at')
    return saved ? new Date(saved) : null
  })
  const ref = useRef(null)

  useEffect(() => {
    if (!user) return
    fetchNotifications()

    const friendChannel = supabase
      .channel('notif-friendships')
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'friendships',
        filter: `addressee_id=eq.${user.id}`,
      }, () => {
        addToast({ message: "Nouvelle demande d'ami reçue 👋", type: 'friend' })
        fetchNotifications()
      })
      .subscribe()

    const likeChannel = supabase
      .channel('notif-likes')
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'item_likes',
      }, async (payload) => {
        const { data } = await supabase
          .from('items')
          .select('name, user_id')
          .eq('id', payload.new.item_id)
          .single()
        if (data?.user_id === user.id) {
          addToast({ message: `Quelqu'un a aimé "${data.name}" ❤️`, type: 'info' })
          fetchNotifications()
        }
      })
      .subscribe()

    return () => {
      supabase.removeChannel(friendChannel)
      supabase.removeChannel(likeChannel)
    }
  }, [user])

  // Fermer si clic dehors
  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const fetchNotifications = async () => {
    if (!user) return
    setLoading(true)
    const notifs = []

    const { data: friendReqs } = await supabase
      .from('friendships')
      .select('id, created_at, requester_id, profiles!friendships_requester_id_fkey(username, email)')
      .eq('addressee_id', user.id)
      .eq('status', 'pending')

    ;(friendReqs || []).forEach(r => {
      const p = r.profiles
      const name = p ? (p.username || p.email || 'Quelqu\'un') : 'Quelqu\'un'
      notifs.push({
        id: 'friend_' + r.id,
        type: 'friend_request',
        message: `${name} veut être ton ami`,
        time: r.created_at,
        linkTo: '/friends',
      })
    })

    const { data: myItems } = await supabase
      .from('items')
      .select('id, name')
      .eq('user_id', user.id)

    if (myItems && myItems.length > 0) {
      const myItemIds = myItems.map(i => i.id)
      const itemNameMap = Object.fromEntries(myItems.map(i => [i.id, i.name]))

      const { data: likes } = await supabase
        .from('item_likes')
        .select('id, created_at, user_id, item_id, profiles!item_likes_user_id_fkey(username, email)')
        .in('item_id', myItemIds)
        .order('created_at', { ascending: false })
        .limit(30)

      ;(likes || []).forEach(l => {
        const p = l.profiles
        const name = p ? (p.username || p.email || 'Quelqu\'un') : 'Quelqu\'un'
        notifs.push({
          id: 'like_' + l.id,
          type: 'like',
          message: `${name} a aimé "${itemNameMap[l.item_id] || 'un item'}"`,
          time: l.created_at,
          linkTo: null,
        })
      })
    }

    notifs.sort((a, b) => new Date(b.time) - new Date(a.time))
    setNotifications(notifs)
    setLoading(false)
  }

  const handleOpen = () => {
    const willOpen = !open
    setOpen(willOpen)
    if (willOpen) {
      // Refresh then mark all as seen
      fetchNotifications()
      const now = new Date()
      setSeenAt(now)
      localStorage.setItem('notif_seen_at', now.toISOString())
    }
  }

  // Count notifs newer than last seen timestamp
  const unreadCount = seenAt
    ? notifications.filter(n => new Date(n.time) > seenAt).length
    : notifications.length

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={handleOpen}
        className="relative p-2 rounded-lg hover:bg-white/10 transition-colors"
        title="Notifications"
      >
        <svg className="w-5 h-5 text-blue-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-pokemon-red text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-10 w-[calc(100vw-2rem)] sm:w-80 max-w-sm bg-white rounded-xl shadow-xl border border-gray-100 z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50">
            <span className="text-sm font-semibold text-gray-700">Notifications</span>
            <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600 text-xs">✕</button>
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-gray-50">
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="w-5 h-5 border-2 border-pokemon-red border-t-transparent rounded-full animate-spin" />
              </div>
            ) : notifications.length === 0 ? (
              <p className="text-center text-gray-400 text-sm py-8">Aucune notification</p>
            ) : (
              notifications.map(n => (
                <div
                  key={n.id}
                  onClick={() => { if (n.linkTo) setOpen(false) }}
                  className={`px-4 py-3 transition-colors ${
                    seenAt && new Date(n.time) > seenAt
                      ? 'bg-blue-50 hover:bg-blue-100'
                      : 'hover:bg-gray-50'
                  }`}
                >
                  {n.linkTo ? (
                    <Link to={n.linkTo} className="block">
                      <NotifRow notif={n} isNew={seenAt ? new Date(n.time) > seenAt : true} />
                    </Link>
                  ) : (
                    <NotifRow notif={n} isNew={seenAt ? new Date(n.time) > seenAt : true} />
                  )}
                </div>
              ))
            )}
          </div>

          {notifications.length > 0 && (
            <div className="px-4 py-2 border-t border-gray-100 bg-gray-50">
              <button onClick={fetchNotifications} className="text-xs text-pokemon-blue hover:underline">
                Actualiser
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function NotifRow({ notif, isNew }) {
  const icons = { friend_request: '👋', like: '❤️' }
  return (
    <div className="flex items-start gap-3">
      <span className="text-base mt-0.5">{icons[notif.type]}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-800 leading-snug">{notif.message}</p>
        <p className="text-xs text-gray-400 mt-0.5">{timeAgo(notif.time)}</p>
      </div>
      {isNew && (
        <div className="w-2 h-2 bg-pokemon-red rounded-full shrink-0 mt-1.5" />
      )}
    </div>
  )
}
