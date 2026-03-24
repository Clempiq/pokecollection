import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ThemeProvider } from './contexts/ThemeContext'
import { AuthProvider } from './contexts/AuthContext'
import { ToastProvider } from './components/Toast'
import ProtectedRoute from './components/ProtectedRoute'
import Navbar from './components/Navbar'
import BottomNav from './components/BottomNav'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Collection from './pages/Collection'
import Friends from './pages/Friends'
import FriendCollection from './pages/FriendCollection'
import SharedCollections from './pages/SharedCollections'
import SharedCollectionDetail from './pages/SharedCollectionDetail'
import Profile from './pages/Profile'
import FriendProfile from './pages/FriendProfile'
import Wishlist from './pages/Wishlist'
import Releases from './pages/Releases'
import Admin from './pages/Admin'
import AdminRoute from './components/AdminRoute'
import { useServiceWorkerUpdate } from './hooks/useServiceWorkerUpdate'
import PublicWishlist from './pages/PublicWishlist'

function Layout({ children }) {
  useServiceWorkerUpdate()

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg-page)' }}>
      <Navbar />
      <main className="max-w-7xl mx-auto px-3 sm:px-4 py-5 sm:py-8 pb-24 md:pb-8">
        {children}
      </main>
      <BottomNav />
    </div>
  )
}

function Protected({ children }) {
  return (
    <ProtectedRoute>
      <Layout>{children}</Layout>
    </ProtectedRoute>
  )
}

export default function App() {
  return (
    <ThemeProvider>
    <AuthProvider>
      <ToastProvider>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/w/:token" element={<PublicWishlist />} />

          {/* Protected routes */}
          <Route path="/" element={<Protected><Collection /></Protected>} />
          <Route path="/dashboard" element={<Protected><Dashboard /></Protected>} />
          <Route path="/friends" element={<Protected><Friends /></Protected>} />
          <Route path="/friend/:friendId" element={<Protected><FriendCollection /></Protected>} />
          <Route path="/shared" element={<Protected><SharedCollections /></Protected>} />
          <Route path="/shared/:collectionId" element={<Protected><SharedCollectionDetail /></Protected>} />
          <Route path="/wishlist" element={<Protected><Wishlist /></Protected>} />
          <Route path="/releases" element={<Protected><Releases /></Protected>} />
          <Route path="/profile" element={<Protected><Profile /></Protected>} />
          <Route path="/profile/:userId" element={<Protected><FriendProfile /></Protected>} />

          {/* Admin route */}
          <Route path="/admin" element={
            <ProtectedRoute>
              <AdminRoute>
                <Layout><Admin /></Layout>
              </AdminRoute>
            </ProtectedRoute>
          } />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
    </ThemeProvider>
  )
}
