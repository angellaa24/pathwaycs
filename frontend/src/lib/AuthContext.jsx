import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from './supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    console.log('[Auth] Checking session...')

    // loadingSettled ensures setLoading(false) fires exactly once,
    // whichever of getSession() or onAuthStateChange resolves first.
    let loadingSettled = false

    function finishLoading(sessionUser) {
      setUser(sessionUser ?? null)
      if (!loadingSettled) {
        loadingSettled = true
        setLoading(false)
        console.log('[Auth] Auth loading complete')
      }
    }

    // Safety valve: if neither getSession() nor the auth listener has resolved
    // after 3 seconds, force loading=false so the app doesn't stay stuck forever.
    const timeout = setTimeout(() => {
      if (!loadingSettled) {
        console.warn('[Auth] Timed out waiting for session — forcing loading complete')
        finishLoading(null)
      }
    }, 3000)

    // Primary session check. Fast when token is fresh (reads localStorage),
    // slow when Supabase needs to refresh the token over the network.
    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        if (session?.user) {
          console.log('[Auth] Session found:', session.user.email)
        } else {
          console.log('[Auth] No session found')
        }
        finishLoading(session?.user ?? null)
      })
      .catch(err => {
        console.error('[Auth] getSession error:', err)
        finishLoading(null)
      })

    // Auth state listener. Also calls finishLoading() on definitive events so
    // loading resolves immediately even if getSession() is slow (e.g. token refresh).
    // After loading is settled it just keeps user in sync.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('[Auth] State change:', event, session?.user?.email ?? null)
      if (
        event === 'INITIAL_SESSION' ||
        event === 'SIGNED_IN' ||
        event === 'SIGNED_OUT'
      ) {
        finishLoading(session?.user ?? null)
      } else {
        // TOKEN_REFRESHED, USER_UPDATED, etc. — session already confirmed,
        // just keep user current.
        setUser(session?.user ?? null)
      }
    })

    return () => {
      clearTimeout(timeout)
      subscription.unsubscribe()
    }
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
