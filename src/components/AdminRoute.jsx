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
