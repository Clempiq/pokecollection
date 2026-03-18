import React, { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

export default function UsersManager() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingUserId, setEditingUserId] = useState(null)
  const [editForm, setEditForm] = useState({ username: '', password: '' })
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)
  const [currentUser, setCurrentUser] = useState(null)

  useEffect(() => {
    async function fetchCurrentUser() {
      const { data: { user } } = await supabase.auth.getUser()
      setCurrentUser(user)
    }
    fetchCurrentUser()
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase.functions.invoke('admin-users', { body: { action: 'list' } })
      if (error) throw error
      setUsers(data.users || [])
    } catch (err) {
      console.error('Error fetching users:', err)
    } finally {
      setLoading(false)
    }
  }

  const toggleAdmin = async (userId, currentValue) => {
    const { error } = await supabase.from('profiles').update({ is_admin: !currentValue }).eq('id', userId)
    if (!error) setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_admin: !currentValue } : u))
  }

  const deleteUser = async (userId) => {
    try {
      const { error } = await supabase.functions.invoke('admin-users', { body: { action: 'delete', userId } })
      if (error) throw error
      setUsers(prev => prev.filter(u => u.id !== userId))
      setConfirmDeleteId(null)
    } catch (err) { console.error('Error deleting user:', err) }
  }

  const saveEdits = async (userId) => {
    try {
      await supabase.functions.invoke('admin-users', {
        body: { action: 'update', userId, username: editForm.username || undefined, password: editForm.password || undefined },
      })
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, username: editForm.username || u.username } : u))
      setEditingUserId(null)
      setEditForm({ username: '', password: '' })
    } catch (err) { console.error('Error updating user:', err) }
  }

  if (loading) return <div className="flex justify-center py-8"><div className="w-6 h-6 border-4 border-pokemon-red border-t-transparent rounded-full animate-spin"></div></div>

  const getName = (u) => u.username || u.email

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-gray-900">Utilisateurs ({users.length})</h2>
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Utilisateur</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Email</th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Items</th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Inscrit le</th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Dernière co.</th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Rôle</th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {users.map(u => (
              <React.Fragment key={u.id}>
                <tr className="hover:bg-gray-50/50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 bg-pokemon-blue rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0">
                        {u.username?.[0]?.toUpperCase() || u.email?.[0]?.toUpperCase() || '?'}
                      </div>
                      <span className="font-medium text-gray-800">@{getName(u)}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{u.email}</td>
                  <td className="px-4 py-3 text-center"><span className="text-xs font-semibold text-gray-700 bg-gray-100 px-2 py-0.5 rounded-full">{u.item_count || 0}</span></td>
                  <td className="px-4 py-3 text-center text-xs text-gray-400">{u.created_at ? new Date(u.created_at).toLocaleDateString('fr-FR') : '—'}</td>
                  <td className="px-4 py-3 text-center text-xs text-gray-400">{u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleDateString('fr-FR') : '—'}</td>
                  <td className="px-4 py-3 text-center">
                    <button onClick={() => toggleAdmin(u.id, u.is_admin)}
                      className={`text-xs font-medium px-3 py-1 rounded-full transition-colors ${u.is_admin ? 'bg-pokemon-yellow/20 text-yellow-700 hover:bg-red-50 hover:text-red-600' : 'bg-gray-100 text-gray-500 hover:bg-green-50 hover:text-green-600'}`}
                      title={u.is_admin ? 'Retirer admin' : 'Rendre admin'}>
                      {u.is_admin ? '⭐ Admin' : 'Utilisateur'}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex justify-center gap-2">
                      <button onClick={() => { setEditingUserId(u.id); setEditForm({ username: u.username || '', password: '' }) }}
                        className="text-xs font-medium px-2 py-1 rounded bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors">✏️ Éditer</button>
                      {currentUser?.id !== u.id && (
                        <button onClick={() => setConfirmDeleteId(u.id)}
                          className="text-xs font-medium px-2 py-1 rounded bg-red-50 text-red-600 hover:bg-red-100 transition-colors">🗑 Supp.</button>
                      )}
                    </div>
                  </td>
                </tr>
                {editingUserId === u.id && (
                  <tr className="bg-blue-50/50 border-l-4 border-l-blue-500">
                    <td colSpan="7" className="px-4 py-3">
                      <div className="flex gap-3 flex-wrap">
                        <input type="text" placeholder="Nouveau username" value={editForm.username}
                          onChange={e => setEditForm(p => ({ ...p, username: e.target.value }))}
                          className="flex-1 px-2 py-1.5 text-xs border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-500" />
                        <input type="password" placeholder="Nouveau mot de passe (optionnel)" value={editForm.password}
                          onChange={e => setEditForm(p => ({ ...p, password: e.target.value }))}
                          className="flex-1 px-2 py-1.5 text-xs border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-500" />
                        <button onClick={() => saveEdits(u.id)} className="px-3 py-1.5 text-xs font-medium bg-green-500 text-white rounded hover:bg-green-600">✓ Sauvegarder</button>
                        <button onClick={() => { setEditingUserId(null); setEditForm({ username: '', password: '' }) }} className="px-3 py-1.5 text-xs font-medium bg-gray-300 text-gray-700 rounded hover:bg-gray-400">✗ Annuler</button>
                      </div>
                    </td>
                  </tr>
                )}
                {confirmDeleteId === u.id && (
                  <tr className="bg-red-50/50 border-l-4 border-l-red-500">
                    <td colSpan="7" className="px-4 py-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-red-700 font-medium">Supprimer définitivement @{getName(u)} ? Irréversible.</span>
                        <div className="flex gap-2">
                          <button onClick={() => deleteUser(u.id)} className="px-3 py-1.5 text-xs font-medium bg-red-500 text-white rounded hover:bg-red-600">Supprimer</button>
                          <button onClick={() => setConfirmDeleteId(null)} className="px-3 py-1.5 text-xs font-medium bg-gray-300 text-gray-700 rounded hover:bg-gray-400">Annuler</button>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
