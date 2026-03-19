import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

export function useBadges() {
  const { user } = useAuth()
  const [badges, setBadges] = useState([])
  const [userBadges, setUserBadges] = useState([])
  const [newBadges, setNewBadges] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    setLoading(true)
    Promise.all([
      supabase.from('badges').select('*').order('sort_order'),
      supabase.from('user_badges').select('badge_id, unlocked_at').eq('user_id', user.id),
    ]).then(([{ data: allBadges }, { data: myBadges }]) => {
      setBadges(allBadges || [])
      setUserBadges(myBadges || [])
      setLoading(false)
    })
  }, [user?.id])

  const checkBadges = useCallback(async () => {
    if (!user) return []
    try {
      const { data: awarded, error } = await supabase.rpc('check_and_award_badges', { p_user_id: user.id })
      if (error) { console.error('check_and_award_badges error:', error); return [] }
      if (awarded && awarded.length > 0) {
        setNewBadges(awarded)
        const { data: myBadges } = await supabase
          .from('user_badges').select('badge_id, unlocked_at').eq('user_id', user.id)
        setUserBadges(myBadges || [])
      }
      return awarded || []
    } catch (e) {
      console.error('Badge check exception:', e)
      return []
    }
  }, [user?.id])

  const isUnlocked = useCallback(
    (badgeId) => userBadges.some(ub => ub.badge_id === badgeId),
    [userBadges]
  )

  const unlockedAt = useCallback(
    (badgeId) => userBadges.find(ub => ub.badge_id === badgeId)?.unlocked_at || null,
    [userBadges]
  )

  return { badges, userBadges, newBadges, setNewBadges, loading, checkBadges, isUnlocked, unlockedAt }
}
