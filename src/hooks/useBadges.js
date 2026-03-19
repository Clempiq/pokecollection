import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

export function useBadges() {
  const { user } = useAuth()
  const [badges, setBadges] = useState([])        // tous les badges du catalogue
  const [userBadges, setUserBadges] = useState([]) // badge_ids débloqués
  const [newBadges, setNewBadges] = useState([])   // badges fraîchement débloqués (pour notif)
  const [loading, setLoading] = useState(true)

  const fetchBadges = useCallback(async () => {
    if (!user) return
    const [{ data: all }, { data: unlocked }] = await Promise.all([
      supabase.from('badges').select('*').order('sort_order'),
      supabase.from('user_badges').select('badge_id, unlocked_at').eq('user_id', user.id),
    ])
    setBadges(all || [])
    setUserBadges(unlocked || [])
    setLoading(false)
  }, [user])

  const checkBadges = useCallback(async () => {
    if (!user) return []
    const { data } = await supabase.rpc('check_and_award_badges', { p_user_id: user.id })
    if (data && data.length > 0) {
      setNewBadges(data)
      fetchBadges() // refresh
    }
    return data || []
  }, [user, fetchBadges])

  useEffect(() => { fetchBadges() }, [fetchBadges])

  const isUnlocked = (badgeId) => userBadges.some(b => b.badge_id === badgeId)
  const unlockedAt = (badgeId) => userBadges.find(b => b.badge_id === badgeId)?.unlocked_at

  return { badges, userBadges, newBadges, setNewBadges, loading, checkBadges, isUnlocked, unlockedAt }
}
