import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import { type User } from 'firebase/auth'
import { onAuthChange } from '../lib/auth'

// ─── Context ──────────────────────────────────────────────────────────────────

interface AuthContextValue {
  user: User | null
  /** true while Firebase is resolving the initial auth state */
  loading: boolean
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
})

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthChange((firebaseUser) => {
      setUser(firebaseUser)
      setLoading(false)
    })
    return unsubscribe
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/** Returns the current auth state. Must be used inside <AuthProvider>. */
export function useAuth() {
  return useContext(AuthContext)
}
