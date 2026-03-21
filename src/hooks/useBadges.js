import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

export function useBadges() {
  const { user } = useAuth()
  const [badges, setBadges]         = useState([])
  const [userBadges, setUserBadges] = useState([])
  const [newBadges, setNewBadges]   = useState([])
  const [loading, setLoading]       = useState(true)

  // Charge la liste complète des badges + ceux de l'utilisateur
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

  /** Recharge les user_badges depuis la DB */
  const refreshUserBadges = useCallback(async () => {
    if (!user) return
    const { data: myBadges } = await supabase
      .from('user_badges').select('badge_id, unlocked_at').eq('user_id', user.id)
    setUserBadges(myBadges || [])
  }, [user?.id])

  /**
   * Vérifie et attribue les nouveaux trophées mérités.
   * Retourne le tableau des badge_id nouvellement attribués.
   */
  const checkBadges = useCallback(async () => {
    if (!user) return []
    try {
      const { data: awarded, error } = await supabase.rpc('check_and_award_badges', { p_user_id: user.id })
      if (error) { console.error('check_and_award_badges error:', error); return [] }
      if (awarded && awarded.length > 0) {
        setNewBadges(awarded)
        await refreshUserBadges()
      }
      return awarded || []
    } catch (e) {
      console.error('Badge check exception:', e)
      return []
    }
  }, [user?.id, refreshUserBadges])

  /**
   * Révoque les trophées dont les conditions ne sont plus remplies.
   * Retourne le tableau des badge_id révoqués.
   */
  const revokeBadges = useCallback(async () => {
    if (!user) return []
    try {
      const { data: revoked, error } = await supabase.rpc('revoke_unearned_badges', { p_user_id: user.id })
      if (error) { console.error('revoke_unearned_badges error:', error); return [] }
      if (revoked && revoked.length > 0) {
        await refreshUserBadges()
      }
      return revoked || []
    } catch (e) {
      console.error('Badge revoke exception:', e)
      return []
    }
  }, [user?.id, refreshUserBadges])

  /**
   * Lance award + revoke en parallèle et retourne { awarded, revoked }.
   * Appeler après n'importe quelle mutation d'item.
   */
  const syncBadges = useCallback(async () => {
    if (!user) return { awarded: [], revoked: [] }
    try {
      const [awardRes, revokeRes] = await Promise.all([
        supabase.rpc('check_and_award_badges',  { p_user_id: user.id }),
        supabase.rpc('revoke_unearned_badges', { p_user_id: user.id }),
      ])
      const awarded = awardRes.data  || []
      const revoked = revokeRes.data || []
      if (awarded.length > 0 || revoked.length > 0) {
        if (awarded.length > 0) setNewBadges(awarded)
        await refreshUserBadges()
      }
      return { awarded, revoked }
    } catch (e) {
      console.error('Badge sync exception:', e)
      return { awarded: [], revoked: [] }
    }
  }, [user?.id, refreshUserBadges])

  const isUnlocked = useCallback(
    (badgeId) => userBadges.some(ub => ub.badge_id === badgeId),
    [userBadges]
  )

  const unlockedAt = useCallback(
    (badgeId) => userBadges.find(ub => ub.badge_id === badgeId)?.unlocked_at || null,
    [userBadges]
  )

  return {
    badges, userBadges, newBadges, setNewBadges, loading,
    checkBadges, revokeBadges, syncBadges,
    isUnlocked, unlockedAt,
  }
}
