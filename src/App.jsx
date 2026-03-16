import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import OnboardingGuard from './components/OnboardingGuard'
import Navbar from './components/Navbar'
import Login from './pages/Login'
import Register from './pages/Register'
import Onboarding from './pages/Onboarding'
import Dashboard from './pages/Dashboard'
import Collection from './pages/Collection'
import Friends from './pages/Friends'
import FriendCollection from './pages/FriendCollection'
import SharedCollections from './pages/SharedCollections'
import SharedCollectionDetail from './pages/SharedCollectionDetail'

function Layout({ children }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  )
}

function Protected({ children }) {
  return (
    <ProtectedRoute>
      <OnboardingGuard>
        <Layout>{children}</Layout>
      </OnboardingGuard>
    </ProtectedRoute>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Onboarding (auth required, no onboarding guard) */}
          <Route path="/onboarding" element={
            <ProtectedRoute><Onboarding /></ProtectedRoute>
          } />

          {/* Protected routes */}
          <Route path="/" element={<Protected><Dashboard /></Protected>} />
          <Route path="/collection" element={<Protected><Collection /></Protected>} />
          <Route path="/friends" element={<Protected><Friends /></Protected>} />
          <Route path="/friend/:friendId" element={<Protected><FriendCollection /></Protected>} />
          <Route path="/shared" element={<Protected><SharedCollections /></Protected>} />
          <Route path="/shared/:collectionId" element={<Protected><SharedCollectionDetail /></Protected>} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
