<<<<<<< HEAD
import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function AdminRoute({ children }) {
  const { user, profile, loading } = useAuth()

  if (loading || (user && profile === null)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-4 border-pokemon-red border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />
  if (!profile?.is_admin) return <Navigate to="/" replace />

  return children
}
=======
import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function AdminRoute({ children }) {
  const { user, profile, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-2 border-pokemon-red border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  if (!user || !profile?.is_admin) {
    return <Navigate to="/" replace />
  }

  return children
}
>>>>>>> 75bda405994aff8b32f967b0793cc12339417565
