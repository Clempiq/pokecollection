import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import PasswordInput, { validatePassword } from '../components/PasswordInput'

export default function Register() {
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName]   = useState('')
  const [email, setEmail]         = useState('')
  const [password, setPassword]   = useState('')
  const [error, setError]         = useState('')
  const [loading, setLoading]     = useState(false)
  const { signUp } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!validatePassword(password)) {
      setError('Le mot de passe ne respecte pas les règles de sécurité.')
      return
    }

    setLoading(true)
    const { data, error: signUpError } = await signUp(email, password)

    if (signUpError) {
      setError(signUpError.message)
      setLoading(false)
      return
    }

    // Créer le profil avec prénom + nom
    if (data?.user) {
      await supabase.from('profiles').upsert({
        id: data.user.id,
        email,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        username_set: true,
      })
    }

    // Si la confirmation email est désactivée → session active → redirect direct
    if (data?.session) {
      navigate('/')
    } else {
      // Confirmation email activée → afficher message
      setError('✅ Compte créé ! Vérifie ton email pour confirmer, puis connecte-toi.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pokemon-blue to-blue-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-xl mx-auto mb-4">
            <div className="w-14 h-14 rounded-full border-4 border-pokemon-blue relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1/2 bg-pokemon-red"></div>
              <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-white"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-4 h-4 bg-white rounded-full border-2 border-pokemon-blue z-10"></div>
              </div>
            </div>
          </div>
          <h1 className="text-3xl font-bold text-white">PokéCollection</h1>
          <p className="text-blue-300 mt-1 text-sm">Suis ta collection de cartes scellées</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-xl font-bold text-gray-800 mb-6">Créer un compte</h2>

          {error && (
            <div className={`text-sm px-4 py-3 rounded-lg mb-4 border ${
              error.startsWith('✅')
                ? 'bg-green-50 border-green-200 text-green-700'
                : 'bg-red-50 border-red-200 text-red-700'
            }`}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Prénom + Nom */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Prénom</label>
                <input
                  type="text"
                  value={firstName}
                  onChange={e => setFirstName(e.target.value)}
                  className="input-field"
                  placeholder="Jean"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nom</label>
                <input
                  type="text"
                  value={lastName}
                  onChange={e => setLastName(e.target.value)}
                  className="input-field"
                  placeholder="Dupont"
                  required
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="input-field"
                placeholder="ton@email.com"
                required
              />
            </div>

            {/* Mot de passe */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mot de passe</label>
              <PasswordInput
                name="new-password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Crée un mot de passe sécurisé"
                showStrength
              />
            </div>

            <button type="submit" className="btn-primary w-full mt-2" disabled={loading}>
              {loading ? 'Création...' : 'Créer mon compte'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            Déjà un compte ?{' '}
            <Link to="/login" className="text-pokemon-red font-medium hover:underline">Se connecter</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
