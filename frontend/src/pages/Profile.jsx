import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { useAuth } from '../lib/AuthContext'
import { useTheme } from '../lib/ThemeContext'
import { useProfile } from '../lib/ProfileContext'
import { supabase } from '../lib/supabase'
import AvatarSVG from '../components/AvatarSVG'

const FF = 'system-ui, -apple-system, sans-serif'

export default function Profile() {
  const { user, loading: authLoading } = useAuth()
  const { darkMode } = useTheme()
  const { avatar } = useProfile()
  const navigate = useNavigate()

  const D = {
    bg:           darkMode ? '#0f0f1a' : '#f8fafc',
    card:         darkMode ? '#1a1a2e' : '#ffffff',
    shadow:       darkMode ? '0 1px 3px rgba(0,0,0,0.4), 0 4px 16px rgba(0,0,0,0.25)' : '0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)',
    border:       darkMode ? '1px solid #2a2a3e' : 'none',
    text:         darkMode ? '#f1f5f9' : '#111827',
    textMuted:    darkMode ? '#94a3b8' : '#6b7280',
    textSub:      darkMode ? '#64748b' : '#9ca3af',
    hr:           darkMode ? '#2a2a3e' : '#f3f4f6',
    inputBg:      darkMode ? '#0f0f1a' : '#ffffff',
    inputBorder:  darkMode ? '#2a2a3e' : '#e5e7eb',
    editBtnBorder:darkMode ? '#2a2a3e' : '#e5e7eb',
    editBtnText:  darkMode ? '#94a3b8' : '#374151',
    dangerBg:     darkMode ? '#1a0a0a' : '#fff5f5',
    dangerBorder: darkMode ? '#3f1515' : '#fecaca',
    dangerHead:   darkMode ? '#f87171' : '#991b1b',
    confirmBg:    darkMode ? '#12121e' : '#ffffff',
    confirmBorder:darkMode ? '#7f1d1d' : '#fca5a5',
    confirmText:  darkMode ? '#f1f5f9' : '#374151',
  }

  const [roadmap, setRoadmap] = useState(null)

  const [editingName,     setEditingName]     = useState(false)
  const [editingEmail,    setEditingEmail]    = useState(false)
  const [editingPassword, setEditingPassword] = useState(false)

  const [nameVal,     setNameVal]     = useState('')
  const [emailVal,    setEmailVal]    = useState('')
  const [newPass,     setNewPass]     = useState('')
  const [confirmPass, setConfirmPass] = useState('')

  const [nameErr,  setNameErr]  = useState(null)
  const [emailErr, setEmailErr] = useState(null)
  const [passErr,  setPassErr]  = useState(null)
  const [saving,   setSaving]   = useState(null)

  const [toast, setToast] = useState(null)

  const [showDelete,    setShowDelete]    = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [deleteErr,     setDeleteErr]     = useState(null)

  useEffect(() => {
    if (!authLoading && !user) navigate('/login', { replace: true })
  }, [authLoading, user])

  useEffect(() => {
    if (!user) return
    setNameVal(user.user_metadata?.display_name ?? '')
    setEmailVal(user.email ?? '')
  }, [user])

  useEffect(() => {
    if (!user) return
    supabase
      .from('roadmaps')
      .select('target_role, job_level')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .then(({ data }) => { if (data?.length) setRoadmap(data[0]) })
  }, [user])

  function showToast(msg) {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  async function saveName() {
    if (!nameVal.trim()) { setNameErr('Name cannot be empty.'); return }
    setSaving('name'); setNameErr(null)
    const { error } = await supabase.auth.updateUser({ data: { display_name: nameVal.trim() } })
    setSaving(null)
    if (error) { setNameErr('Could not update name. Please try again.'); return }
    setEditingName(false)
    showToast('Saved!')
  }

  async function saveEmail() {
    if (!emailVal.trim()) { setEmailErr('Email cannot be empty.'); return }
    setSaving('email'); setEmailErr(null)
    const { error } = await supabase.auth.updateUser({ email: emailVal.trim() })
    setSaving(null)
    if (error) { setEmailErr(error.message || 'Could not update email. Please try again.'); return }
    setEditingEmail(false)
    showToast('Confirmation sent — check your inbox.')
  }

  async function savePassword() {
    if (!newPass) { setPassErr('Password cannot be empty.'); return }
    if (newPass.length < 6) { setPassErr('Password must be at least 6 characters.'); return }
    if (newPass !== confirmPass) { setPassErr('Passwords do not match.'); return }
    setSaving('password'); setPassErr(null)
    const { error } = await supabase.auth.updateUser({ password: newPass })
    setSaving(null)
    if (error) { setPassErr(error.message || 'Could not update password. Please try again.'); return }
    setEditingPassword(false)
    setNewPass(''); setConfirmPass('')
    showToast('Saved!')
  }

  function handleLogOut() {
    localStorage.removeItem('sb-tmnmumbqeppoffkxmuvw-auth-token')
    localStorage.removeItem('pathwaycs-avatar-character')
    localStorage.removeItem('pathwaycs-avatar-color')
    localStorage.removeItem('pathwaycs-darkmode')
    window.location.href = '/'
  }

  async function handleDelete() {
    setDeleteLoading(true); setDeleteErr(null)
    try {
      await axios.delete(API_BASE_URL + '/auth/account', { data: { user_id: user.id } })
      localStorage.removeItem('sb-tmnmumbqeppoffkxmuvw-auth-token')
      localStorage.removeItem('pathwaycs-avatar-character')
      localStorage.removeItem('pathwaycs-avatar-color')
      localStorage.removeItem('pathwaycs-darkmode')
      window.location.href = '/'
    } catch (err) {
      setDeleteErr(err.response?.data?.detail || 'Could not delete account. Please try again.')
      setDeleteLoading(false)
    }
  }

  function cancelName() {
    setEditingName(false)
    setNameVal(user?.user_metadata?.display_name ?? '')
    setNameErr(null)
  }
  function cancelEmail() {
    setEditingEmail(false)
    setEmailVal(user?.email ?? '')
    setEmailErr(null)
  }
  function cancelPassword() {
    setEditingPassword(false)
    setNewPass(''); setConfirmPass('')
    setPassErr(null)
  }

  if (authLoading) {
    return (
      <div style={{
        minHeight: '100vh', background: D.bg, paddingTop: 52,
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FF,
      }}>
        <p style={{ color: '#9ca3af', fontSize: 15, margin: 0 }}>Loading…</p>
      </div>
    )
  }
  if (!user) return null

  const displayName = user.user_metadata?.display_name ?? user.email?.split('@')[0] ?? 'User'
  const initial = displayName[0]?.toUpperCase() ?? '?'

  return (
    <div style={{ minHeight: '100vh', background: D.bg, fontFamily: FF, paddingTop: 52, transition: 'background 0.2s' }}>

      <style>{`
        @keyframes toastIn {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {toast && (
        <div style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 1000,
          background: '#111827', color: '#ffffff',
          padding: '11px 20px', borderRadius: 10,
          fontSize: 14, fontWeight: 600,
          boxShadow: '0 4px 20px rgba(0,0,0,0.18)',
          animation: 'toastIn 0.25s ease',
        }}>
          {toast}
        </div>
      )}

      <div style={{ maxWidth: 620, margin: '0 auto', padding: '36px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* ── Profile Header ── */}
        <Card D={D}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, flexShrink: 0 }}>
              <div style={{
                width: 88, height: 88, borderRadius: '50%',
                background: darkMode ? '#1a1a2e' : '#ffffff',
                border: darkMode ? '3px solid rgba(255,255,255,0.10)' : '3px solid rgba(0,0,0,0.08)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <AvatarSVG character={avatar.character} color={avatar.color} size={72} />
              </div>
              <button
                onClick={() => navigate('/avatar')}
                style={{
                  background: 'none', border: 'none', padding: 0,
                  fontSize: 12, fontWeight: 600, color: '#6366f1',
                  cursor: 'pointer', fontFamily: FF,
                }}
                onMouseEnter={e => (e.currentTarget.style.textDecoration = 'underline')}
                onMouseLeave={e => (e.currentTarget.style.textDecoration = 'none')}
              >
                Edit Avatar
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <span style={{ fontSize: 20, fontWeight: 700, color: D.text }}>{displayName}</span>
              <span style={{ fontSize: 14, color: D.textMuted }}>{user.email}</span>
              {(roadmap?.target_role || roadmap?.job_level) && (
                <div style={{ display: 'flex', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
                  {roadmap.target_role && (
                    <span style={badgeStyle('#eef2ff', '#4f46e5')}>{roadmap.target_role}</span>
                  )}
                  {roadmap.job_level && (
                    <span style={badgeStyle('#f0fdf4', '#15803d')}>{roadmap.job_level}</span>
                  )}
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* ── Account Settings ── */}
        <Card title="Account Settings" D={D}>
          <SettingRow
            label="Display Name" value={displayName}
            editing={editingName} D={D}
            onEdit={() => { cancelEmail(); cancelPassword(); setEditingName(true) }}
          >
            <InlineField
              value={nameVal} onChange={setNameVal}
              onSave={saveName} onCancel={cancelName}
              saving={saving === 'name'} error={nameErr}
              placeholder="Your display name" D={D}
            />
          </SettingRow>

          <HR D={D} />

          <SettingRow
            label="Email" value={user.email}
            editing={editingEmail} D={D}
            onEdit={() => { cancelName(); cancelPassword(); setEditingEmail(true) }}
          >
            <InlineField
              type="email" value={emailVal} onChange={setEmailVal}
              onSave={saveEmail} onCancel={cancelEmail}
              saving={saving === 'email'} error={emailErr}
              placeholder="your@email.com" D={D}
            />
          </SettingRow>

          <HR D={D} />

          <SettingRow
            label="Password" value="••••••••"
            editing={editingPassword} D={D}
            onEdit={() => { cancelName(); cancelEmail(); setEditingPassword(true) }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 4 }}>
              <input
                type="password" placeholder="New password"
                value={newPass} onChange={e => setNewPass(e.target.value)}
                autoFocus style={mkInputStyle(D)}
                onFocus={e => (e.currentTarget.style.borderColor = '#6366f1')}
                onBlur={e  => (e.currentTarget.style.borderColor = D.inputBorder)}
              />
              <input
                type="password" placeholder="Confirm new password"
                value={confirmPass} onChange={e => setConfirmPass(e.target.value)}
                style={mkInputStyle(D)}
                onFocus={e => (e.currentTarget.style.borderColor = '#6366f1')}
                onBlur={e  => (e.currentTarget.style.borderColor = D.inputBorder)}
              />
              {passErr && <p style={errStyle}>{passErr}</p>}
              <ActionRow onSave={savePassword} onCancel={cancelPassword} saving={saving === 'password'} D={D} />
            </div>
          </SettingRow>
        </Card>

        {/* ── Danger Zone ── */}
        <div style={{
          background: D.dangerBg, border: `1px solid ${D.dangerBorder}`,
          borderRadius: 16, padding: '24px 28px',
          display: 'flex', flexDirection: 'column', gap: 16,
          transition: 'background 0.2s',
        }}>
          <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: D.dangerHead }}>Danger Zone</h2>

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <button
              onClick={handleLogOut}
              style={{
                padding: '9px 22px', borderRadius: 999,
                background: 'none', border: '1.5px solid #fca5a5',
                color: '#b91c1c', fontSize: 14, fontWeight: 600,
                cursor: 'pointer', fontFamily: FF,
              }}
              onMouseEnter={e => (e.currentTarget.style.background = '#fee2e2')}
              onMouseLeave={e => (e.currentTarget.style.background = 'none')}
            >
              Log Out
            </button>
            <button
              onClick={() => { setShowDelete(true); setDeleteErr(null) }}
              style={{
                padding: '9px 22px', borderRadius: 999,
                background: '#ef4444', border: 'none',
                color: '#ffffff', fontSize: 14, fontWeight: 700,
                cursor: 'pointer', fontFamily: FF,
              }}
              onMouseEnter={e => (e.currentTarget.style.opacity = '0.88')}
              onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
            >
              Delete Account
            </button>
          </div>

          {showDelete && (
            <div style={{
              background: D.confirmBg, border: `1px solid ${D.confirmBorder}`,
              borderRadius: 12, padding: '18px 20px',
              display: 'flex', flexDirection: 'column', gap: 14,
            }}>
              <p style={{ margin: 0, fontSize: 14, color: D.confirmText, lineHeight: 1.6 }}>
                <strong>Are you sure?</strong> This will permanently delete your account and all your data. This cannot be undone.
              </p>
              {deleteErr && <p style={errStyle}>{deleteErr}</p>}
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  onClick={handleDelete} disabled={deleteLoading}
                  style={{
                    padding: '9px 20px', borderRadius: 999,
                    background: deleteLoading ? '#e5e7eb' : '#ef4444',
                    color: deleteLoading ? '#9ca3af' : '#ffffff',
                    border: 'none', fontSize: 14, fontWeight: 700,
                    cursor: deleteLoading ? 'default' : 'pointer', fontFamily: FF,
                  }}
                >
                  {deleteLoading ? 'Deleting…' : 'Yes, delete my account'}
                </button>
                <button
                  onClick={() => { setShowDelete(false); setDeleteErr(null) }}
                  style={{
                    background: 'none', border: 'none', padding: '9px 4px',
                    fontSize: 14, fontWeight: 500, color: D.textMuted,
                    cursor: 'pointer', fontFamily: FF,
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Card({ title, children, D }) {
  return (
    <div style={{
      background: D.card, borderRadius: 16,
      padding: '24px 28px', border: D.border,
      boxShadow: D.shadow,
      display: 'flex', flexDirection: 'column', gap: 20,
      transition: 'background 0.2s',
    }}>
      {title && (
        <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: D.text }}>{title}</h2>
      )}
      {children}
    </div>
  )
}

function SettingRow({ label, value, editing, onEdit, children, D }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: 40 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span style={{
            fontSize: 11, fontWeight: 700, color: D.textSub,
            textTransform: 'uppercase', letterSpacing: '0.07em',
          }}>
            {label}
          </span>
          {!editing && (
            <span style={{ fontSize: 15, color: D.text }}>{value}</span>
          )}
        </div>
        {!editing && (
          <button
            onClick={onEdit}
            style={{
              background: 'none', border: `1px solid ${D.editBtnBorder}`,
              borderRadius: 8, padding: '5px 14px',
              fontSize: 13, fontWeight: 600, color: D.editBtnText,
              cursor: 'pointer', fontFamily: FF,
            }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = D.textSub)}
            onMouseLeave={e => (e.currentTarget.style.borderColor = D.editBtnBorder)}
          >
            Edit
          </button>
        )}
      </div>
      {editing && <div style={{ marginTop: 8 }}>{children}</div>}
    </div>
  )
}

function InlineField({ type = 'text', value, onChange, onSave, onCancel, saving, error, placeholder, D }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <input
        type={type} value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder} autoFocus
        style={mkInputStyle(D)}
        onFocus={e => (e.currentTarget.style.borderColor = '#6366f1')}
        onBlur={e  => (e.currentTarget.style.borderColor = D.inputBorder)}
        onKeyDown={e => { if (e.key === 'Enter') onSave(); if (e.key === 'Escape') onCancel() }}
      />
      {error && <p style={errStyle}>{error}</p>}
      <ActionRow onSave={onSave} onCancel={onCancel} saving={saving} D={D} />
    </div>
  )
}

function ActionRow({ onSave, onCancel, saving, D }) {
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      <button
        onClick={onSave} disabled={saving}
        style={{
          padding: '8px 20px', borderRadius: 999,
          background: saving ? '#e5e7eb' : 'linear-gradient(90deg, #6366f1, #14b8a6)',
          color: saving ? '#9ca3af' : '#ffffff',
          border: 'none', fontSize: 13, fontWeight: 700,
          cursor: saving ? 'default' : 'pointer', fontFamily: FF,
        }}
      >
        {saving ? 'Saving…' : 'Save'}
      </button>
      <button
        onClick={onCancel}
        style={{
          background: 'none', border: 'none', padding: '8px 4px',
          fontSize: 13, fontWeight: 500, color: D.textMuted,
          cursor: 'pointer', fontFamily: FF,
        }}
      >
        Cancel
      </button>
    </div>
  )
}

function HR({ D }) {
  return <div style={{ height: 1, background: D.hr, margin: '0 -4px' }} />
}

function mkInputStyle(D) {
  return {
    width: '100%', padding: '10px 14px', borderRadius: 10,
    border: `1.5px solid ${D.inputBorder}`, fontSize: 14,
    fontFamily: FF, color: D.text,
    background: D.inputBg, outline: 'none',
    boxSizing: 'border-box', transition: 'border-color 0.15s',
  }
}

const errStyle = {
  margin: 0, fontSize: 13, color: '#ef4444',
}

function badgeStyle(bg, color) {
  return {
    padding: '3px 12px', borderRadius: 999,
    background: bg, color,
    fontSize: 12, fontWeight: 600, textTransform: 'capitalize',
  }
}
