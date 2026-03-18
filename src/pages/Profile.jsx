import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import PasswordInput, { validatePassword } from '../components/PasswordInput'
import PWAInstallButton from '../components/PWAInstallButton'
import BadgesSection from '../components/BadgesSection'
import { usePushNotifications } from '../hooks/usePushNotifications'

function validateUsername(u) {
  return /^[a-zA-Z0-9_]{3,20}$/.test(u)
}

export default function Profile() {
  const { user, profile, refreshProfile } = useAuth()
  const { supported, permission, isSubscribed, loading: pushLoading, subscribe, unsubscribe } = usePushNotifications()
  const [username, setUsername]       = useState('')
  const [saving, setSaving]           = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [saveError, setSaveError]     = useState('')
  const [usernameStatus, setUsernameStatus] = useState(null)

  const [newPassword, setNewPassword]       = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [pwdLoading, setPwdLoading]         = useState(false)
  const [pwdSuccess, setPwdSuccess]         = useState(false)
  const [pwdError, setPwdError]             = useState('')

  const [stats, setStats] = useState(null)
  const debounceRef = useRef(null)

  useEffect(() => {
    if (profile) setUsername(profile.username || '')
  }, [profile])

  // Real-time uniqueness check (skip if unchanged)
  useEffect(() => {
    clearTimeout(debounceRef.current)
    const current = profile?.username || ''
    if (!username || username === current) { setUsernameStatus(null); return }
    if (!validateUsername(username)) { setUsernameStatus('invalid'); return }

    setUsernameStatus('checking')
    debounceRef.current = setTimeout(async () => {
      const { data } = await supabase
        .from('profiles').select('id').eq('username', username).maybeSingle()
      setUsernameStatus(data ? 'taken' : 'available')
    }, 400)
    return () => clearTimeout(debounceRef.current)
  }, [username, profile?.username])

  useEffect(() => {
    if (!user) return
    supabase.from('items').select('id, quantity, purchase_price, current_value').eq('user_id', user.id)
      .then(({ data }) => {
        if (data) setStats({
          refs: data.length,
          total: data.reduce((s, i) => s + i.quantity, 0),
          invested: data.reduce((s, i) => s + (i.purchase_price || 0) * i.quantity, 0),
        })
      })
  }, [user])

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    setSaveError('')
    setSaveSuccess(false)

    if (!validateUsername(username)) {
      setSaveError('Le pseudo doit faire 3-20 caractères (lettres, chiffres, _).')
      setSaving(false)
      return
    }
    if (usernameStatus === 'taken') {
      setSaveError('Ce pseudo est déjà pris.')
      setSaving(false)
      return
    }

    const { error } = await supabase.from('profiles')
      .update({ username: username.trim() })
      .eq('id', user.id)

    if (error) {
      setSaveError(error.code === '23505' ? 'Ce pseudo est déjà pris.' : error.message)
    } else {
      setSaveSuccess(true)
      await refreshProfile()
      setUsernameStatus(null)
    }
    setSaving(false)
  }

  const handlePasswordChange = async (e) => {
    e.preventDefault()
    setPwdError('')
    setPwdSuccess(false)
    if (!validatePassword(newPassword)) {
      setPwdError('Le mot de passe ne respecte pas les règles de sécurité.')
      return
    }
    if (newPassword !== confirmPassword) {
      setPwdError('Les mots de passe ne correspondent pas.')
      return
    }
    setPwdLoading(true)
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) setPwdError(error.message)
    else { setPwdSuccess(true); setNewPassword(''); setConfirmPassword('') }
    setPwdLoading(false)
  }

  const hint = (() => {
    const current = profile?.username || ''
    if (!username || username === current) return null
    if (usernameStatus === 'invalid') return { ok: false, msg: '3-20 caractères, lettres/chiffres/_ uniquement' }
    if (usernameStatus === 'checking') return { ok: null, msg: 'Vérification...' }
    if (usernameStatus === 'taken')    return { ok: false, msg: 'Pseudo déjà pris' }
    if (usernameStatus === 'available') return { ok: true,  msg: 'Pseudo disponible ✓' }
    return null
  })()

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 bg-pokemon-blue rounded-full flex items-center justify-center text-white text-2xl font-bold shrink-0">
          {profile?.username?.[0]?.toUpperCase() || '?'}
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">@{profile?.username || '...'}</h1>
          <p className="text-gray-400 text-sm">{user?.email}</p>
        </div>
      </div>

      {/* Quick stats */}
      {stats && (
        <div className="grid grid-cols-3 gap-4">
          <div className="card p-4 text-center">
            <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            <p className="text-xs text-gray-500 mt-0.5">items</p>
          </div>
          <div className="card p-4 text-center">
            <p className="text-2xl font-bold text-gray-900">{stats.refs}</p>
            <p className="text-xs text-gray-500 mt-0.5">références</p>
          </div>
          <div className="card p-4 text-center">
            <p className="text-2xl font-bold text-gray-900">{stats.invested.toFixed(0)} €</p>
            <p className="text-xs text-gray-500 mt-0.5">investis</p>
          </div>
        </div>
      )}

      {/* Push notifications */}
      <div className="card p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">🔔 Notifications push</h2>

        {!supported ? (
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 text-sm px-4 py-3 rounded-lg">
            Les notifications push ne sont pas supportées par ce navigateur.
          </div>
        ) : permission === 'denied' ? (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
            Les notifications sont bloquées dans les paramètres de ton navigateur. Clique sur l'icône du cadenas dans la barre d'adresse pour les autoriser.
          </div>
        ) : isSubscribed ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-sm font-medium text-green-600">Notifications activées</span>
            </div>
            <p className="text-sm text-gray-600">Tu recevras des notifications pour les demandes d'amis.</p>
            <button
              onClick={unsubscribe}
              disabled={pushLoading}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
            >
              {pushLoading ? 'Désactivation...' : '🔕 Désactiver'}
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-gray-600">Reçois des notifications push pour les demandes d'amis et autres événements importants.</p>
            <button
              onClick={subscribe}
              disabled={pushLoading}
              className="btn-primary text-sm py-2 px-4"
            >
              {pushLoading ? 'Activation...' : '🔔 Activer les notifications'}
            </button>
          </div>
        )}
      </div>

      {/* PWA install banner (disappears once installed) */}
      <PWAInstallButton variant="banner" />

      {/* Edit username */}
      <div className="card p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Mon pseudo</h2>

        {saveError   && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg mb-4">{saveError}</div>}
        {saveSuccess && <div className="bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-3 rounded-lg mb-4">✓ Pseudo mis à jour !</div>}

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Pseudo</label>
            <input
              value={username}
              onChange={e => setUsername(e.target.value)}
              className={`input-field ${
                hint?.ok === false ? 'border-red-300' :
                hint?.ok === true  ? 'border-green-400' : ''
              }`}
              placeholder="pokemaster42"
            />
            {hint && (
              <p className={`text-xs mt-1 ${
                hint.ok === false ? 'text-red-500' :
                hint.ok === true  ? 'text-green-600' : 'text-gray-400'
              }`}>{hint.msg}</p>
            )}
            <p className="text-xs text-gray-400 mt-1">Visible par tes amis · 3-20 caractères (lettres, chiffres, _)</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input value={user?.email} disabled className="input-field bg-gray-50 text-gray-400 cursor-not-allowed" />
            <p className="text-xs text-gray-400 mt-1">L'email ne peut pas être modifié pour l'instant.</p>
          </div>
          <button
            type="submit"
            className="btn-primary"
            disabled={saving || usernameStatus === 'taken' || usernameStatus === 'checking' || usernameStatus === 'invalid'}
          >
            {saving ? 'Enregistrement...' : 'Enregistrer'}
          </button>
        </form>
      </div>

      {/* Change password */}
      <div className="card p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Changer mon mot de passe</h2>

        {pwdError   && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg mb-4">{pwdError}</div>}
        {pwdSuccess && <div className="bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-3 rounded-lg mb-4">✓ Mot de passe mis à jour !</div>}

        <form onSubmit={handlePasswordChange} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nouveau mot de passe</label>
            <PasswordInput name="new-password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Nouveau mot de passe" showStrength />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Confirmer</label>
            <PasswordInput name="confirm-password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Répéter le mot de passe" />
            {confirmPassword && confirmPassword !== newPassword && <p className="text-xs text-red-500 mt-1">Les mots de passe ne correspondent pas</p>}
            {confirmPassword && confirmPassword === newPassword && <p className="text-xs text-green-600 mt-1">✓ Les mots de passe correspondent</p>}
          </div>
          <button type="submit" className="btn-primary" disabled={pwdLoading}>
            {pwdLoading ? 'Mise à jour...' : 'Changer le mot de passe'}
          </button>
        </form>
      </div>

      {/* Badges section */}
      <BadgesSection />
    </div>
  )
}
