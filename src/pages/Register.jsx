import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import PasswordInput, { validatePassword } from '../components/PasswordInput'

function validateUsername(u) {
  return /^[a-zA-Z0-9_]{3,20}$/.test(u)
}

export default function Register() {
  const [username, setUsername]     = useState('')
  const [email, setEmail]           = useState('')
  const [password, setPassword]     = useState('')
  const [error, setError]           = useState('')
  const [loading, setLoading]       = useState(false)
  const [usernameStatus, setUsernameStatus] = useState(null) // null | 'checking' | 'available' | 'taken' | 'invalid'
  const { signUp } = useAuth()
  const navigate = useNavigate()
  const debounceRef = useRef(null)

  // Real-time username availability check
  useEffect(() => {
    clearTimeout(debounceRef.current)
    if (!username) { setUsernameStatus(null); return }
    if (!validateUsername(username)) { setUsernameStatus('invalid'); return }

    setUsernameStatus('checking')
    debounceRef.current = setTimeout(async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', username)
        .maybeSingle()
      setUsernameStatus(data ? 'taken' : 'available')
    }, 400)
    return () => clearTimeout(debounceRef.current)
  }, [username])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!validateUsername(username)) {
      setError('Le pseudo doit faire 3-20 caractères (lettres, chiffres, _).')
      return
    }
    if (usernameStatus === 'taken') {
      setError('Ce pseudo est déjà pris.')
      return
    }
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

    if (data?.user) {
      const { error: profileError } = await supabase.from('profiles').upsert({
        id: data.user.id,
        email,
        username: username.trim(),
        username_set: true,
      })
      if (profileError) {
        // Could be a race-condition duplicate username
        if (profileError.code === '23505') {
          setError('Ce pseudo vient d\'être pris. Choisis-en un autre.')
          setLoading(false)
          return
        }
      }
    }

    if (data?.session) {
      navigate('/')
    } else {
      setError('✅ Compte créé ! Vérifie ton email pour confirmer, puis connecte-toi.')
      setLoading(false)
    }
  }

  const usernameHelp = () => {
    if (!username) return null
    if (usernameStatus === 'invalid') return { ok: false, msg: '3-20 caractères, lettres/chiffres/_ uniquement' }
    if (usernameStatus === 'checking') return { ok: null, msg: 'Vérification...' }
    if (usernameStatus === 'taken') return { ok: false, msg: 'Ce pseudo est déjà pris' }
    if (usernameStatus === 'available') return { ok: true, msg: 'Pseudo disponible ✓' }
    return null
  }
  const hint = usernameHelp()

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
            {/* Pseudo */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Pseudo <span className="text-gray-400 font-normal text-xs">(unique)</span>
              </label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                className={`input-field ${
                  hint?.ok === false ? 'border-red-300 focus:ring-red-200' :
                  hint?.ok === true  ? 'border-green-400 focus:ring-green-100' : ''
                }`}
                placeholder="pokemaster42"
                required
                autoComplete="username"
              />
              {hint && (
                <p className={`text-xs mt-1 ${
                  hint.ok === false ? 'text-red-500' :
                  hint.ok === true  ? 'text-green-600' :
                  'text-gray-400'
                }`}>
                  {hint.msg}
                </p>
              )}
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

            <button
              type="submit"
              className="btn-primary w-full mt-2"
              disabled={loading || usernameStatus === 'taken' || usernameStatus === 'checking' || usernameStatus === 'invalid'}
            >
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
