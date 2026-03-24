import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import PasswordInput, { validatePassword } from '../components/PasswordInput'

function validateUsername(u) {
  return /^[a-zA-Z0-9_]{3,20}$/.test(u)
}

/* ── Pokeball SVG ─────────────────────────────────────────────────────────── */
function Pokeball({ size = 56 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="28" cy="28" r="27" stroke="rgba(255,255,255,0.15)" strokeWidth="2" />
      <path d="M1 28 A27 27 0 0 1 55 28 Z" fill="#ef4444" opacity="0.9" />
      <path d="M55 28 A27 27 0 0 1 1 28 Z" fill="rgba(255,255,255,0.08)" />
      <rect x="1" y="25.5" width="54" height="5" fill="rgba(255,255,255,0.15)" />
      <circle cx="28" cy="28" r="7" fill="rgba(20,20,40,0.9)" stroke="rgba(255,255,255,0.2)" strokeWidth="2" />
      <circle cx="28" cy="28" r="3.5" fill="rgba(255,255,255,0.6)" />
    </svg>
  )
}

/* ── Input styles shared ──────────────────────────────────────────────────── */
const inputBase = {
  backgroundColor: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.1)',
  color: '#fff',
}
const inputFocus = {
  borderColor: 'rgba(139,92,246,0.6)',
  backgroundColor: 'rgba(255,255,255,0.08)',
}
const inputBlur = {
  borderColor: 'rgba(255,255,255,0.1)',
  backgroundColor: 'rgba(255,255,255,0.06)',
}

export default function Register() {
  const [username, setUsername]     = useState('')
  const [email, setEmail]           = useState('')
  const [password, setPassword]     = useState('')
  const [error, setError]           = useState('')
  const [loading, setLoading]       = useState(false)
  const [usernameStatus, setUsernameStatus] = useState(null)
  const { signUp }  = useAuth()
  const navigate    = useNavigate()
  const debounceRef = useRef(null)

  useEffect(() => {
    clearTimeout(debounceRef.current)
    if (!username) { setUsernameStatus(null); return }
    if (!validateUsername(username)) { setUsernameStatus('invalid'); return }
    setUsernameStatus('checking')
    debounceRef.current = setTimeout(async () => {
      const { data } = await supabase
        .from('profiles').select('id').eq('username', username).maybeSingle()
      setUsernameStatus(data ? 'taken' : 'available')
    }, 400)
    return () => clearTimeout(debounceRef.current)
  }, [username])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!validateUsername(username)) { setError('Le pseudo doit faire 3-20 caractères (lettres, chiffres, _).'); return }
    if (usernameStatus === 'taken') { setError('Ce pseudo est déjà pris.'); return }
    if (!validatePassword(password)) { setError('Le mot de passe ne respecte pas les règles de sécurité.'); return }
    setLoading(true)

    // Le username est passé en metadata → le trigger Supabase handle_new_user
    // crée le profil automatiquement côté serveur (bypass RLS)
    const { data, error: signUpError } = await signUp(email, password, username)
    if (signUpError) { setError(signUpError.message); setLoading(false); return }

    if (data?.session) {
      // Email confirmation désactivée → session immédiate
      navigate('/')
    } else {
      // Email confirmation requise → redirection vers /login après 3s
      setError('✅ Compte créé ! Vérifie ton email pour confirmer, puis connecte-toi.')
      setLoading(false)
      setTimeout(() => navigate('/login'), 3000)
    }
  }

  const usernameHelp = () => {
    if (!username) return null
    if (usernameStatus === 'invalid') return { ok: false, msg: '3-20 caractères, lettres/chiffres/_ uniquement' }
    if (usernameStatus === 'checking') return { ok: null, msg: 'Vérification…' }
    if (usernameStatus === 'taken') return { ok: false, msg: 'Pseudo déjà pris' }
    if (usernameStatus === 'available') return { ok: true, msg: '✓ Disponible' }
    return null
  }
  const hint = usernameHelp()

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-5"
      style={{ background: 'linear-gradient(160deg, #0f0f1a 0%, #1a1a2e 50%, #0f0f1a 100%)' }}
    >
      {/* Ambient glow */}
      <div
        className="fixed top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
        style={{
          width: '28rem', height: '28rem',
          background: 'radial-gradient(circle, rgba(139,92,246,0.12) 0%, transparent 70%)',
          filter: 'blur(40px)',
        }}
      />

      <div className="w-full max-w-sm relative z-10">

        {/* ── Brand ──────────────────────────────────────────────────── */}
        <div className="flex flex-col items-center mb-8">
          <div className="mb-4 drop-shadow-lg">
            <Pokeball size={64} />
          </div>
          <h1 className="text-2xl font-bold tracking-wide text-white">PokéCollection</h1>
          <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>
            Crée ton compte gratuitement
          </p>
        </div>

        {/* ── Form ───────────────────────────────────────────────────── */}
        <div
          className="rounded-2xl p-6 space-y-4"
          style={{
            backgroundColor: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            backdropFilter: 'blur(20px)',
          }}
        >
          {error && (
            <div
              className="text-sm px-4 py-3 rounded-xl"
              style={
                error.startsWith('✅')
                  ? { backgroundColor: 'rgba(16,185,129,0.15)', color: '#6ee7b7', border: '1px solid rgba(16,185,129,0.2)' }
                  : { backgroundColor: 'rgba(239,68,68,0.15)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.2)' }
              }
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Pseudo */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'rgba(255,255,255,0.45)' }}>
                Pseudo
              </label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="pokemaster42"
                required
                autoFocus
                autoComplete="username"
                className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-all"
                style={{
                  ...inputBase,
                  ...(hint?.ok === false ? { borderColor: 'rgba(239,68,68,0.5)' } : {}),
                  ...(hint?.ok === true  ? { borderColor: 'rgba(16,185,129,0.5)' } : {}),
                }}
                onFocus={e => Object.assign(e.target.style, inputFocus)}
                onBlur={e => Object.assign(e.target.style, inputBlur)}
              />
              {hint && (
                <p className="text-xs mt-1.5"
                  style={{
                    color: hint.ok === false ? '#fca5a5'
                         : hint.ok === true  ? '#6ee7b7'
                         : 'rgba(255,255,255,0.35)',
                  }}>
                  {hint.msg}
                </p>
              )}
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'rgba(255,255,255,0.45)' }}>
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="ton@email.com"
                required
                className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-all"
                style={inputBase}
                onFocus={e => Object.assign(e.target.style, inputFocus)}
                onBlur={e => Object.assign(e.target.style, inputBlur)}
              />
            </div>

            {/* Mot de passe */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'rgba(255,255,255,0.45)' }}>
                Mot de passe
              </label>
              <PasswordInput
                name="new-password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Crée un mot de passe sécurisé"
                showStrength
                style={inputBase}
              />
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || usernameStatus === 'taken' || usernameStatus === 'checking' || usernameStatus === 'invalid'}
              className="w-full py-3 rounded-xl text-sm font-bold transition-all mt-2 disabled:opacity-50"
              style={{
                background: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)',
                color: '#fff',
                boxShadow: '0 4px 20px rgba(139,92,246,0.35)',
              }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin inline-block" />
                  Création…
                </span>
              ) : 'Créer mon compte'}
            </button>
          </form>
        </div>

        {/* ── Footer ─────────────────────────────────────────────────── */}
        <p className="text-center text-sm mt-6" style={{ color: 'rgba(255,255,255,0.35)' }}>
          Déjà un compte ?{' '}
          <Link
            to="/login"
            className="font-semibold transition-colors"
            style={{ color: 'rgba(167,139,250,0.9)' }}
            onMouseEnter={e => { e.currentTarget.style.color = '#c4b5fd' }}
            onMouseLeave={e => { e.currentTarget.style.color = 'rgba(167,139,250,0.9)' }}
          >
            Se connecter
          </Link>
        </p>
      </div>
    </div>
  )
}
