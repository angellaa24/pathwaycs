import { useState } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import axios from 'axios'
import { supabase } from '../lib/supabase'

const FF = 'system-ui, -apple-system, sans-serif'

function friendlyError(msg = '') {
  if (/already registered|already in use|already exists/i.test(msg))
    return 'An account with this email already exists. Try logging in.'
  if (/password.*characters|password.*short/i.test(msg))
    return 'Password must be at least 6 characters.'
  if (/invalid email/i.test(msg))
    return 'Please enter a valid email address.'
  if (/rate limit/i.test(msg))
    return 'Too many attempts. Please wait a moment and try again.'
  return msg || 'Something went wrong. Please try again.'
}

export default function SignUp() {
  const navigate = useNavigate()
  const { state: locationState } = useLocation()
  const pendingRoadmap = locationState?.pendingRoadmap ?? null

  const [name,     setName]     = useState('')
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    if (loading) return
    setError(null)
    setLoading(true)
    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { data: { display_name: name.trim() } },
      })
      if (signUpError) { setError(friendlyError(signUpError.message)); return }

      const userId = data.user?.id
      if (pendingRoadmap?.roadmap_id && userId) {
        try {
          await axios.post(
            `http://localhost:8000/roadmaps/${pendingRoadmap.roadmap_id}/claim`,
            { user_id: userId },
          )
        } catch { /* non-fatal — roadmap is still accessible */ }
      }

      const dest = pendingRoadmap ?? storedRoadmap()
      if (dest) {
        sessionStorage.removeItem('pendingRoadmap')
        navigate('/roadmap', { state: dest })
      } else {
        navigate('/avatar')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      position: 'relative', width: '100vw', height: '100vh',
      background: '#ffffff', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      overflow: 'hidden', fontFamily: FF,
    }}>
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
            Create your account
          </h1>
          <p style={{ margin: 0, fontSize: '14px', color: '#6b7280' }}>
            Already have an account?{' '}
            <Link to="/login" style={{ color: '#4f46e5', fontWeight: 600, textDecoration: 'none' }}>
              Log in
            </Link>
          </p>
        </div>

        {/* Fields */}
        <Field label="Display name" htmlFor="name">
          <input
            id="name"
            type="text"
            required
            autoComplete="name"
            placeholder="Your name"
            value={name}
            onChange={e => setName(e.target.value)}
            style={inputStyle()}
            onFocus={e => (e.currentTarget.style.borderColor = '#6366f1')}
            onBlur={e  => (e.currentTarget.style.borderColor = '#e5e7eb')}
          />
        </Field>

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

        <Field label="Password" htmlFor="password">
          <input
            id="password"
            type="password"
            required
            autoComplete="new-password"
            placeholder="Min. 6 characters"
            value={password}
            onChange={e => setPassword(e.target.value)}
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
          disabled={loading}
          style={{
            padding: '14px', borderRadius: '999px',
            fontSize: '15px', fontWeight: 700, fontFamily: FF,
            border: 'none', cursor: loading ? 'default' : 'pointer',
            background: loading
              ? '#e5e7eb'
              : 'linear-gradient(90deg, #6366f1, #14b8a6)',
            color: loading ? '#9ca3af' : '#ffffff',
            transition: 'opacity 0.15s ease',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
          }}
          onMouseEnter={e => { if (!loading) e.currentTarget.style.opacity = '0.88' }}
          onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
        >
          {loading && <Spinner />}
          {loading ? 'Creating account…' : 'Create account'}
        </button>
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

function Spinner() {
  return (
    <div style={{
      width: '14px', height: '14px', borderRadius: '50%',
      border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#ffffff',
      animation: 'spin 0.7s linear infinite', flexShrink: 0,
    }} />
  )
}
