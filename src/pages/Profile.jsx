import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import PasswordInput, { validatePassword } from '../components/PasswordInput'

export default function Profile() {
  const { user, profile, refreshProfile } = useAuth()
  const [form, setForm] = useState({ first_name: '', last_name: '' })
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [saveError, setSaveError] = useState('')

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [pwdLoading, setPwdLoading] = useState(false)
  const [pwdSuccess, setPwdSuccess] = useState(false)
  const [pwdError, setPwdError] = useState('')

  const [stats, setStats] = useState(null)

  useEffect(() => {
    if (profile) {
      setForm({
        first_name: profile.first_name || '',
        last_name: profile.last_name || '',
      })
    }
  }, [profile])

  useEffect(() => {
    if (!user) return
    supabase.from('items').select('id, quantity, purchase_price, current_value').eq('user_id', user.id)
      .then(({ data }) => {
        if (data) {
          setStats({
            refs: data.length,
            total: data.reduce((s, i) => s + i.quantity, 0),
            invested: data.reduce((s, i) => s + (i.purchase_price || 0) * i.quantity, 0),
          })
        }
      })
  }, [user])

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    setSaveError('')
    setSaveSuccess(false)
    const { error } = await supabase.from('profiles')
      .update({ first_name: form.first_name.trim(), last_name: form.last_name.trim() })
      .eq('id', user.id)
    if (error) setSaveError(error.message)
    else { setSaveSuccess(true); await refreshProfile() }
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

  const displayName = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || user?.email

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 bg-pokemon-blue rounded-full flex items-center justify-center text-white text-2xl font-bold shrink-0">
          {profile?.first_name?.[0]?.toUpperCase() || '?'}
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{displayName}</h1>
          <p className="text-gray-400 text-sm">{user?.email}</p>
        </div>
      </div>

      {/* Stats rapides */}
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

      {/* Modifier les infos */}
      <div className="card p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Mes informations</h2>

        {saveError && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg mb-4">{saveError}</div>}
        {saveSuccess && <div className="bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-3 rounded-lg mb-4">✓ Informations mises à jour !</div>}

        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Prénom</label>
              <input
                value={form.first_name}
                onChange={e => setForm(p => ({ ...p, first_name: e.target.value }))}
                className="input-field"
                placeholder="Jean"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nom</label>
              <input
                value={form.last_name}
                onChange={e => setForm(p => ({ ...p, last_name: e.target.value }))}
                className="input-field"
                placeholder="Dupont"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input value={user?.email} disabled className="input-field bg-gray-50 text-gray-400 cursor-not-allowed" />
            <p className="text-xs text-gray-400 mt-1">L'email ne peut pas être modifié pour l'instant.</p>
          </div>
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? 'Enregistrement...' : 'Enregistrer'}
          </button>
        </form>
      </div>

      {/* Changer le mot de passe */}
      <div className="card p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Changer mon mot de passe</h2>

        {pwdError && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg mb-4">{pwdError}</div>}
        {pwdSuccess && <div className="bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-3 rounded-lg mb-4">✓ Mot de passe mis à jour !</div>}

        <form onSubmit={handlePasswordChange} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nouveau mot de passe</label>
            <PasswordInput
              name="new-password"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              placeholder="Nouveau mot de passe"
              showStrength
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Confirmer</label>
            <PasswordInput
              name="confirm-password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder="Répéter le mot de passe"
            />
            {confirmPassword && confirmPassword !== newPassword && (
              <p className="text-xs text-red-500 mt-1">Les mots de passe ne correspondent pas</p>
            )}
            {confirmPassword && confirmPassword === newPassword && (
              <p className="text-xs text-green-600 mt-1">✓ Les mots de passe correspondent</p>
            )}
          </div>
          <button type="submit" className="btn-primary" disabled={pwdLoading}>
            {pwdLoading ? 'Mise à jour...' : 'Changer le mot de passe'}
          </button>
        </form>
      </div>
    </div>
  )
}
