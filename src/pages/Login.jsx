import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import PasswordInput from '../components/PasswordInput'

/* ── Pokeball SVG ─────────────────────────────────────────────────────────── */
function Pokeball({ size = 56 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="28" cy="28" r="27" stroke="rgba(255,255,255,0.15)" strokeWidth="2" />
      {/* Top half */}
      <path d="M1 28 A27 27 0 0 1 55 28 Z" fill="#ef4444" opacity="0.9" />
      {/* Bottom half */}
      <path d="M55 28 A27 27 0 0 1 1 28 Z" fill="rgba(255,255,255,0.08)" />
      {/* Center band */}
      <rect x="1" y="25.5" width="54" height="5" fill="rgba(255,255,255,0.15)" />
      {/* Center button */}
      <circle cx="28" cy="28" r="7" fill="rgba(20,20,40,0.9)" stroke="rgba(255,255,255,0.2)" strokeWidth="2" />
      <circle cx="28" cy="28" r="3.5" fill="rgba(255,255,255,0.6)" />
    </svg>
  )
}

export default function Login() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)
  const { signIn }  = useAuth()
  const navigate    = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await signIn(email, password)
    if (error) {
      setError('Email ou mot de passe incorrect.')
    } else {
      navigate('/')
    }
    setLoading(false)
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-5"
      style={{
        background: 'linear-gradient(160deg, #0f0f1a 0%, #1a1a2e 50%, #0f0f1a 100%)',
      }}
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
        <div className="flex flex-col items-center mb-10">
          <div className="mb-4 drop-shadow-lg">
            <Pokeball size={64} />
          </div>
          <h1 className="text-2xl font-bold tracking-wide text-white">PokéCollection</h1>
          <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>
            Suis et valorise ta collection
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
              style={{ backgroundColor: 'rgba(239,68,68,0.15)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.2)' }}
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label
                className="block text-xs font-semibold uppercase tracking-wider mb-1.5"
                style={{ color: 'rgba(255,255,255,0.45)' }}
              >
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="ton@email.com"
                required
                autoFocus
                className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-all"
                style={{
                  backgroundColor: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: '#fff',
                }}
                onFocus={e => { e.target.style.borderColor = 'rgba(139,92,246,0.6)'; e.target.style.backgroundColor = 'rgba(255,255,255,0.08)' }}
                onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.1)'; e.target.style.backgroundColor = 'rgba(255,255,255,0.06)' }}
              />
            </div>

            {/* Password */}
            <div>
              <label
                className="block text-xs font-semibold uppercase tracking-wider mb-1.5"
                style={{ color: 'rgba(255,255,255,0.45)' }}
              >
                Mot de passe
              </label>
              <PasswordInput
                name="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                style={{
                  backgroundColor: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: '#fff',
                }}
              />
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl text-sm font-bold transition-all mt-2"
              style={{
                background: loading
                  ? 'rgba(139,92,246,0.4)'
                  : 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)',
                color: '#fff',
                boxShadow: loading ? 'none' : '0 4px 20px rgba(139,92,246,0.35)',
              }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin inline-block" />
                  Connexion…
                </span>
              ) : 'Se connecter'}
            </button>
          </form>
        </div>

        {/* ── Footer ─────────────────────────────────────────────────── */}
        <p className="text-center text-sm mt-6" style={{ color: 'rgba(255,255,255,0.35)' }}>
          Pas encore de compte ?{' '}
          <Link
            to="/register"
            className="font-semibold transition-colors"
            style={{ color: 'rgba(167,139,250,0.9)' }}
            onMouseEnter={e => { e.currentTarget.style.color = '#c4b5fd' }}
            onMouseLeave={e => { e.currentTarget.style.color = 'rgba(167,139,250,0.9)' }}
          >
            Créer un compte
          </Link>
        </p>
      </div>
    </div>
  )
}
