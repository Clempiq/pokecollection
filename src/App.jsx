import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
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
import Admin from './pages/Admin'
import AdminRoute from './components/AdminRoute'

function Layout({ children }) {
  return (
    <div className="min-h-screen bg-gray-50">
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
    <AuthProvider>
      <ToastProvider>
      <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Protected routes */}
          <Route path="/" element={<Protected><Dashboard /></Protected>} />
          <Route path="/collection" element={<Protected><Collection /></Protected>} />
          <Route path="/friends" element={<Protected><Friends /></Protected>} />
          <Route path="/friend/:friendId" element={<Protected><FriendCollection /></Protected>} />
          <Route path="/shared" element={<Protected><SharedCollections /></Protected>} />
          <Route path="/shared/:collectionId" element={<Protected><SharedCollectionDetail /></Protected>} />
          <Route path="/profile" element={<Protected><Profile /></Protected>} />

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
  )
}
