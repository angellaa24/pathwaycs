import { Suspense } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './lib/AuthContext'
import { ThemeProvider } from './lib/ThemeContext'
import { ProfileProvider } from './lib/ProfileContext'
import Navbar from './components/Navbar'
import LoadingScreen from './components/LoadingScreen'
import Landing from './pages/Landing'
import Roadmap from './pages/Roadmap'
import BeginnerOnboarding from './pages/BeginnerOnboarding'
import ExperienceOnboarding from './pages/ExperienceOnboarding'
import StepDetail from './pages/StepDetail'
import SignUp from './pages/SignUp'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Profile from './pages/Profile'
import AvatarPicker from './pages/AvatarPicker'
import Explore from './pages/Explore'
import Jobs from './pages/Jobs'

// Pages where the navbar is hidden entirely.
const NO_NAV = new Set(['/', '/login', '/signup'])

// Redirects unauthenticated users to /login.
// Must be used inside AppRoutes so useAuth() can access the context.
// Waits for the auth session check to finish before deciding — without this,
// a null user during the brief loading window causes a premature redirect.
function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <LoadingScreen />
  return user ? children : <Navigate to="/login" replace />
}

// Like ProtectedRoute but also allows guest users through if they carry
// roadmap data in location.state (e.g. just finished onboarding).
function RoadmapRoute({ children }) {
  const { user, loading } = useAuth()
  const location = useLocation()
  if (loading) return <LoadingScreen />
  if (user) return children
  // Guest with freshly generated roadmap — let them see it
  if (location.state?.steps) return children
  return <Navigate to="/login" replace />
}

function AppRoutes() {
  const { pathname } = useLocation()
  const { user, loading } = useAuth()
  const showNav = !NO_NAV.has(pathname)

  if (loading) return <LoadingScreen />

  return (
    <Suspense fallback={<LoadingScreen />}>
      {showNav && <Navbar />}
      <Routes>
        {/* ── Public routes ────────────────────────────────────────────── */}
        <Route
          path="/"
          element={user ? <Navigate to="/dashboard" replace /> : <Landing />}
        />
        <Route path="/login"                  element={<Login />} />
        <Route path="/signup"                 element={<SignUp />} />
        <Route path="/onboarding/beginner"    element={<BeginnerOnboarding />} />
        <Route path="/onboarding/experience"  element={<ExperienceOnboarding />} />

        {/* ── Protected routes ─────────────────────────────────────────── */}
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/roadmap"   element={<RoadmapRoute><Roadmap /></RoadmapRoute>} />
        <Route path="/profile"   element={<ProtectedRoute><Profile /></ProtectedRoute>} />
        <Route path="/avatar"    element={<ProtectedRoute><AvatarPicker /></ProtectedRoute>} />
        <Route path="/explore"   element={<ProtectedRoute><Explore /></ProtectedRoute>} />
        <Route path="/jobs"      element={<ProtectedRoute><Jobs /></ProtectedRoute>} />
        <Route path="/step"                      element={<ProtectedRoute><StepDetail /></ProtectedRoute>} />
        <Route path="/step/:roadmapId/:stepNumber" element={<ProtectedRoute><StepDetail /></ProtectedRoute>} />
      </Routes>
    </Suspense>
  )
}

function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <ProfileProvider>
          <AppRoutes />
        </ProfileProvider>
      </ThemeProvider>
    </AuthProvider>
  )
}

export default App
