import { useState } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import axios from 'axios'
import { supabase } from '../lib/supabase'

const FF = 'system-ui, -apple-system, sans-serif'

function friendlyError(msg = '') {
  if (/invalid login|invalid credentials|wrong password|email not confirmed/i.test(msg))
    return 'Incorrect email or password. Please try again.'
  if (/invalid email/i.test(msg))
    return 'Please enter a valid email address.'
  if (/rate limit/i.test(msg))
    return 'Too many attempts. Please wait a moment and try again.'
  if (/email not confirmed/i.test(msg))
    return 'Please confirm your email before logging in.'
  return msg || 'Something went wrong. Please try again.'
}

export default function Login() {
  const navigate = useNavigate()
  const { state: locationState } = useLocation()
  const pendingRoadmap = locationState?.pendingRoadmap ?? null

  const [email,        setEmail]        = useState('')
  const [password,     setPassword]     = useState('')
  const [loading,      setLoading]      = useState(false)
  const [error,        setError]        = useState(null)
  const [forgotMode,   setForgotMode]   = useState(false)
  const [resetLoading, setResetLoading] = useState(false)
  const [resetSent,    setResetSent]    = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (forgotMode) { handleReset(); return }
    if (loading) return
    // Set loading immediately so the button responds on the first frame.
    setError(null)
    setLoading(true)
    try {
      // Wipe any stale Supabase session before attempting login so a
      // corrupted cached token can't silently block the request.
      localStorage.removeItem('sb-tmnmumbqeppoffkxmuvw-auth-token')
      await supabase.auth.signOut()

      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })

      if (signInError) { setError(friendlyError(signInError.message)); return }

      const userId = data.user?.id
      if (pendingRoadmap?.roadmap_id && userId) {
        try {
          await axios.post(
            `http://localhost:8000/roadmaps/${pendingRoadmap.roadmap_id}/claim`,
            { user_id: userId },
          )
        } catch { /* non-fatal — roadmap is still accessible */ }
      }

      sessionStorage.removeItem('pendingRoadmap')
      navigate('/dashboard')
    } catch (err) {
      setError(friendlyError(err?.message ?? ''))
    } finally {
      setLoading(false)
    }
  }

  function clearStaleSessionAndReload() {
    Object.keys(localStorage)
      .filter(k => k.startsWith('sb-'))
      .forEach(k => localStorage.removeItem(k))
    window.location.reload()
  }

  async function handleReset() {
    if (resetLoading) return
    setError(null)
    setResetLoading(true)
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        email.trim(),
        { redirectTo: `${window.location.origin}/reset-password` },
      )
      if (resetError) { setError('Could not send reset email. Please try again.'); return }
      setResetSent(true)
    } finally {
      setResetLoading(false)
    }
  }

  function openForgot() {
    setForgotMode(true)
    setError(null)
    setResetSent(false)
  }

  function backToLogin() {
    setForgotMode(false)
    setError(null)
    setResetSent(false)
  }

  return (
    <div style={{
      position: 'relative', width: '100vw', height: '100vh',
      background: '#ffffff', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      overflow: 'hidden', fontFamily: FF,
    }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      {/* Blobs */}
      <div style={{
        position: 'absolute', borderRadius: '50%', pointerEvents: 'none',
        width: '420px', height: '320px', top: '30%', left: '-60px',
        filter: 'blur(80px)', background: 'rgba(99,102,241,0.7)',
      }} />
      <div style={{
        position: 'absolute', borderRadius: '50%', pointerEvents: 'none',
        width: '400px', height: '280px', top: '-40px', right: '40px',
        filter: 'blur(55px)', background: 'rgba(20,184,166,0.75)',
      }} />
      <div style={{
        position: 'absolute', borderRadius: '50%', pointerEvents: 'none',
        width: '300px', height: '240px', bottom: '-30px', right: '-40px',
        filter: 'blur(65px)', background: 'rgba(6,182,212,0.65)',
      }} />

      {/* Card */}
      <form
        onSubmit={handleSubmit}
        style={{
          position: 'relative', zIndex: 1,
          background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(12px)',
          borderRadius: '20px', padding: '40px 48px',
          width: '100%', maxWidth: '440px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
          display: 'flex', flexDirection: 'column', gap: '20px',
        }}
      >
        {/* Heading */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 800, color: '#111111' }}>
            {forgotMode ? 'Reset your password' : 'Welcome back'}
          </h1>
          <p style={{ margin: 0, fontSize: '14px', color: '#6b7280' }}>
            {forgotMode
              ? "Enter your email and we'll send you a reset link."
              : <>Don't have an account?{' '}
                  <Link to="/signup" style={{ color: '#4f46e5', fontWeight: 600, textDecoration: 'none' }}>
                    Sign up
                  </Link>
                </>}
          </p>
        </div>

        {forgotMode ? (
          /* ── Forgot-password view ── */
          resetSent ? (
            <>
              <div style={{
                padding: '14px 16px', borderRadius: '12px',
                background: '#f0fdf4', border: '1.5px solid #bbf7d0',
              }}>
                <p style={{ margin: 0, fontSize: '14px', color: '#15803d', lineHeight: 1.55 }}>
                  Check your inbox — we sent a reset link to <strong>{email}</strong>.
                </p>
              </div>
              <button
                type="button"
                onClick={backToLogin}
                style={ghostBtnStyle()}
              >
                ← Back to sign in
              </button>
            </>
          ) : (
            <>
              <Field label="Email" htmlFor="email-reset">
                <input
                  id="email-reset"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  style={inputStyle()}
                  onFocus={e => (e.currentTarget.style.borderColor = '#6366f1')}
                  onBlur={e  => (e.currentTarget.style.borderColor = '#e5e7eb')}
                />
              </Field>

              {error && (
                <p style={{ margin: 0, fontSize: '13px', color: '#ef4444' }}>{error}</p>
              )}

              <button
                type="submit"
                disabled={resetLoading}
                style={{
                  padding: '14px', borderRadius: '999px',
                  fontSize: '15px', fontWeight: 700, fontFamily: FF,
                  border: 'none', cursor: resetLoading ? 'default' : 'pointer',
                  background: resetLoading ? '#e5e7eb' : 'linear-gradient(90deg, #6366f1, #14b8a6)',
                  color: resetLoading ? '#9ca3af' : '#ffffff',
                  transition: 'opacity 0.15s ease',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                }}
                onMouseEnter={e => { if (!resetLoading) e.currentTarget.style.opacity = '0.88' }}
                onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
              >
                {resetLoading && <Spinner />}
                {resetLoading ? 'Sending…' : 'Send reset link'}
              </button>

              <button type="button" onClick={backToLogin} style={ghostBtnStyle()}>
                ← Back to sign in
              </button>
            </>
          )
        ) : (
          /* ── Normal login view ── */
          <>
            <Field label="Email" htmlFor="email">
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                style={inputStyle()}
                onFocus={e => (e.currentTarget.style.borderColor = '#6366f1')}
                onBlur={e  => (e.currentTarget.style.borderColor = '#e5e7eb')}
              />
            </Field>

            {/* Password with inline "Forgot password?" link */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label htmlFor="password" style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>
                  Password
                </label>
                <button
                  type="button"
                  onClick={openForgot}
                  style={{
                    background: 'none', border: 'none', padding: 0,
                    fontSize: '13px', fontWeight: 500, color: '#4f46e5',
                    cursor: 'pointer', fontFamily: FF,
                  }}
                >
                  Forgot password?
                </button>
              </div>
              <input
                id="password"
                type="password"
                required
                autoComplete="current-password"
                placeholder="Your password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                style={inputStyle()}
                onFocus={e => (e.currentTarget.style.borderColor = '#6366f1')}
                onBlur={e  => (e.currentTarget.style.borderColor = '#e5e7eb')}
              />
            </div>

            {error && (
              <p style={{ margin: 0, fontSize: '13px', color: '#ef4444' }}>{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '14px', borderRadius: '999px',
                fontSize: '15px', fontWeight: 700, fontFamily: FF,
                border: 'none', cursor: loading ? 'default' : 'pointer',
                background: loading ? '#e5e7eb' : 'linear-gradient(90deg, #6366f1, #14b8a6)',
                color: loading ? '#9ca3af' : '#ffffff',
                transition: 'opacity 0.15s ease',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              }}
              onMouseEnter={e => { if (!loading) e.currentTarget.style.opacity = '0.88' }}
              onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
            >
              {loading && <Spinner />}
              {loading ? 'Logging in…' : 'Log in'}
            </button>

            <button
              type="button"
              onClick={clearStaleSessionAndReload}
              style={{
                background: 'none', border: 'none', padding: 0,
                fontSize: '12px', color: '#9ca3af', cursor: 'pointer',
                fontFamily: FF, textAlign: 'center', textDecoration: 'underline',
              }}
            >
              Having trouble? Click here to reset
            </button>
          </>
        )}
      </form>
    </div>
  )
}

function Field({ label, htmlFor, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <label htmlFor={htmlFor} style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>
        {label}
      </label>
      {children}
    </div>
  )
}

function inputStyle() {
  return {
    width: '100%', padding: '12px 14px', borderRadius: '12px',
    border: '2px solid #e5e7eb', fontSize: '15px', fontFamily: FF,
    color: '#111111', background: '#ffffff', outline: 'none',
    boxSizing: 'border-box', transition: 'border-color 0.15s ease',
  }
}

function storedRoadmap() {
  try { return JSON.parse(sessionStorage.getItem('pendingRoadmap')) } catch { return null }
}

function ghostBtnStyle() {
  return {
    background: 'none', border: 'none', padding: 0,
    fontSize: '13px', fontWeight: 500, color: '#6b7280',
    cursor: 'pointer', fontFamily: FF, textAlign: 'left',
  }
}

function Spinner() {
  return (
    <div style={{
      width: '14px', height: '14px', borderRadius: '50%',
      border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#ffffff',
      animation: 'spin 0.7s linear infinite', flexShrink: 0,
    }} />
  )
}
