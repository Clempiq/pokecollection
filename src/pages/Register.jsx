import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import PasswordInput, { validatePassword } from '../components/PasswordInput'

export default function Register() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showConfirm, setShowConfirm] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const { signUp } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!validatePassword(password)) {
      setError('Le mot de passe ne respecte pas les règles de sécurité.')
      return
    }
    if (password !== confirm) {
      setError('Les mots de passe ne correspondent pas.')
      return
    }

    setLoading(true)
    const { error } = await signUp(email, password)
    if (error) {
      setError(error.message)
    } else {
      setSuccess(true)
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pokemon-blue to-blue-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
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

          {success ? (
            <div className="text-center py-4">
              <div className="text-4xl mb-3">✅</div>
              <p className="text-gray-700 font-medium">Compte créé avec succès !</p>
              <p className="text-gray-500 text-sm mt-1">Vérifie ton email pour confirmer ton compte.</p>
              <Link to="/login" className="btn-primary inline-block mt-4">Aller à la connexion</Link>
            </div>
          ) : (
            <>
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg mb-4">
                  {error}
                </div>
              )}
              <form onSubmit={handleSubmit} className="space-y-4">
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

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Confirmer le mot de passe</label>
                  <div className="relative">
                    <input
                      type={showConfirm ? 'text' : 'password'}
                      value={confirm}
                      onChange={e => setConfirm(e.target.value)}
                      className={`input-field pr-10 ${confirm && confirm !== password ? 'border-red-400 focus:ring-red-400' : ''}`}
                      placeholder="••••••••"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      tabIndex={-1}
                    >
                      {showConfirm ? (
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                        </svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  </div>
                  {confirm && confirm !== password && (
                    <p className="text-xs text-red-500 mt-1">Les mots de passe ne correspondent pas</p>
                  )}
                  {confirm && confirm === password && (
                    <p className="text-xs text-green-600 mt-1">✓ Les mots de passe correspondent</p>
                  )}
                </div>

                <button type="submit" className="btn-primary w-full mt-2" disabled={loading}>
                  {loading ? 'Création...' : 'Créer un compte'}
                </button>
              </form>
              <p className="text-center text-sm text-gray-500 mt-6">
                Déjà un compte ?{' '}
                <Link to="/login" className="text-pokemon-red font-medium hover:underline">Se connecter</Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
