import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

/**
 * Redirects to /onboarding if the user hasn't chosen a username yet.
 * Checks for a profile row with username_set = true.
 */
export default function OnboardingGuard({ children }) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    async function checkProfile() {
      const { data } = await supabase
        .from('profiles')
        .select('id, username_set')
        .eq('id', user.id)
        .maybeSingle()

      // No profile at all, or username not yet chosen → onboarding
      if (!data || !data.username_set) {
        navigate('/onboarding', { replace: true })
      } else {
        setChecked(true)
      }
    }
    checkProfile()
  }, [user.id])

  if (!checked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-4 border-pokemon-red border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  return children
}
