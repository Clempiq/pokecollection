import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { validatePassword } from '../../components/PasswordInput'
import PasswordInput from '../../components/PasswordInput'

export default function PasswordManager() {
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess(false)
    if (!validatePassword(newPassword)) {
      setError('Le nouveau mot de passe ne respecte pas les règles de sécurité.')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas.')
      return
    }
    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) setError(error.message)
    else { setSuccess(true); setNewPassword(''); setConfirmPassword('') }
    setLoading(false)
  }

  return (
    <div className="card p-6 max-w-md">
      <h2 className="text-lg font-bold text-gray-900 mb-4">Changer mon mot de passe</h2>
      {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg mb-4">{error}</div>}
      {success && <div className="bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-3 rounded-lg mb-4">✓ Mot de passe mis à jour avec succès !</div>}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nouveau mot de passe</label>
          <PasswordInput name="new-password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Nouveau mot de passe" showStrength />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Confirmer</label>
          <PasswordInput name="confirm-password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Confirmer le mot de passe" />
          {confirmPassword && confirmPassword !== newPassword && <p className="text-xs text-red-500 mt-1">Les mots de passe ne correspondent pas</p>}
          {confirmPassword && confirmPassword === newPassword && <p className="text-xs text-green-600 mt-1">✓ Les mots de passe correspondent</p>}
        </div>
        <button type="submit" className="btn-primary w-full" disabled={loading}>
          {loading ? 'Mise à jour...' : 'Mettre à jour le mot de passe'}
        </button>
      </form>
    </div>
  )
}
