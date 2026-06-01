import './App.css'
import { useAuth } from './context/AuthContext'
import { logout } from './lib/auth'
import AuthPage from './pages/AuthPage'

function App() {
  const { user, loading } = useAuth()

  // ── Resolving initial auth state ──────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0f0c29] via-[#302b63] to-[#24243e]">
        <svg className="w-8 h-8 text-violet-400 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
        </svg>
      </div>
    )
  }

  // ── Not signed in → show auth page ────────────────────────────────────────
  if (!user) return <AuthPage />

  // ── Signed in → main app ──────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f0c29] via-[#302b63] to-[#24243e] flex flex-col items-center justify-center gap-6 p-8">
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl px-8 py-10 text-center max-w-sm w-full shadow-2xl">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-500 shadow-lg shadow-violet-500/30 mb-4">
          <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-xl font-semibold text-white mb-1">
          Welcome, {user.displayName ?? 'Student'}!
        </h1>
        <p className="text-sm text-white/40 mb-6">
          You are signed in as <span className="text-violet-400">{user.email}</span>
        </p>
        <button
          id="btn-signout"
          onClick={logout}
          className="w-full py-2.5 rounded-xl text-sm font-medium text-white/60 border border-white/10 hover:border-red-500/40 hover:text-red-400 transition-all duration-200"
        >
          Sign out
        </button>
      </div>
    </div>
  )
}

export default App

