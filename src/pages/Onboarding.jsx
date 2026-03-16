import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

export default function Onboarding() {
  const { user } = useAuth()
  const [username, setUsername] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    const clean = username.trim().toLowerCase().replace(/[^a-z0-9_]/g, '')
    if (clean.length < 3) {
      setError('Le pseudo doit contenir au moins 3 caractères (lettres, chiffres, _).')
      return
    }
    setLoading(true)

    // Check uniqueness (maybeSingle = no error if 0 results)
    const { data: existing } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', clean)
      .neq('id', user.id)
      .maybeSingle()

    if (existing) {
      setError('Ce pseudo est déjà pris, choisis-en un autre.')
      setLoading(false)
      return
    }

    // Upsert profile with username_set = true
    const { error: upsertError } = await supabase
      .from('profiles')
      .upsert({ id: user.id, email: user.email, username: clean, username_set: true })

    if (upsertError) {
      setError('Erreur lors de la sauvegarde. Réessaie.')
    } else {
      navigate('/')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pokemon-blue to-blue-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">👋</div>
          <h1 className="text-3xl font-bold text-white">Bienvenue !</h1>
          <p className="text-blue-300 mt-2 text-sm">Choisis un pseudo pour être trouvé par tes amis</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ton pseudo</label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                className="input-field"
                placeholder="ex: ash_ketchum"
                maxLength={20}
                required
              />
              <p className="text-xs text-gray-400 mt-1">Lettres, chiffres et _ uniquement. 3-20 caractères.</p>
            </div>
            <button type="submit" className="btn-primary w-full" disabled={loading}>
              {loading ? 'Enregistrement...' : 'Commencer 🚀'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
