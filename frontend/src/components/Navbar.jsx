import { useNavigate, useLocation } from 'react-router-dom'
import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../lib/AuthContext'
import { useTheme } from '../lib/ThemeContext'
import { useProfile } from '../lib/ProfileContext'
import axios from 'axios'
import AvatarSVG from './AvatarSVG'

const FF = 'system-ui, -apple-system, sans-serif'

export const NAVBAR_H = 52

export default function Navbar() {
  const { user } = useAuth()
  const { darkMode, toggleDarkMode } = useTheme()
  const { avatar } = useProfile()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [profileOpen, setProfileOpen] = useState(false)
  const dropdownRef = useRef(null)

  // Pathway dropdown state
  const [allPathways,     setAllPathways]     = useState([])
  const [pathwayDropOpen, setPathwayDropOpen] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)
  const [activatingId,    setActivatingId]    = useState(null)
  const pathwayDropRef = useRef(null)

  const navBg      = darkMode ? '#0f0f1a' : '#ffffff'
  const navBorder  = darkMode ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)'
  const textColor  = darkMode ? '#e2e8f0' : '#374151'
  const textHover  = darkMode ? '#ffffff' : '#111111'
  const dropBg     = darkMode ? '#1a1a2e' : '#ffffff'
  const dropBorder = darkMode ? '#2a2a3e' : 'rgba(0,0,0,0.08)'
  const dropHover  = darkMode ? '#2a2a3e' : '#f9fafb'

  function active(path) {
    if (path === '/roadmap') return pathname === '/roadmap' || pathname.startsWith('/step')
    return pathname === path
  }

  // Fetch pathway list whenever user changes or a new pathway is generated
  useEffect(() => {
    if (!user?.id) { setAllPathways([]); return }

    function fetchPathways() {
      axios.get(`http://localhost:8000/roadmaps?user_id=${user.id}`, { timeout: 5000 })
        .then(res => setAllPathways(res.data?.roadmaps ?? []))
        .catch(() => {})
    }
    fetchPathways()

    window.addEventListener('pathwaycs:pathways-changed', fetchPathways)
    return () => window.removeEventListener('pathwaycs:pathways-changed', fetchPathways)
  }, [user?.id])

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setProfileOpen(false)
      }
      if (pathwayDropRef.current && !pathwayDropRef.current.contains(e.target)) {
        setPathwayDropOpen(false)
        setConfirmDeleteId(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function handlePathwayClick() {
    if (allPathways.length <= 1) {
      navigate('/roadmap')
    } else {
      setPathwayDropOpen(o => !o)
      setConfirmDeleteId(null)
    }
  }

  async function activatePathway(pathway) {
    if (pathway.is_active) {
      setPathwayDropOpen(false)
      navigate('/roadmap')
      return
    }
    setActivatingId(pathway.id)
    try {
      const res = await axios.post(
        `http://localhost:8000/roadmaps/${pathway.id}/set-active`,
        { user_id: user.id },
      )
      const full = res.data
      setAllPathways(prev => prev.map(p => ({ ...p, is_active: p.id === pathway.id })))

      // Write the new active pathway into the dashboard cache so the dashboard
      // renders it instantly on the next visit — never leave the cache empty
      // (an empty cache causes a Supabase fetch that may hang in this env).
      try {
        sessionStorage.setItem(
          `pathwaycs-roadmap-${user.id}`,
          JSON.stringify({
            ts: Date.now(),
            data: {
              id:            full.id,
              steps:         full.steps,
              target_role:   full.target_role,
              job_level:     full.job_level,
              current_skills: full.current_skills ?? [],
              pathway_type:  full.pathway_type ?? 'role',
            },
          }),
        )
      } catch {}

      // Notify the dashboard (if mounted) to swap roadmap state immediately
      window.dispatchEvent(new CustomEvent('pathwaycs:pathways-changed'))
      setPathwayDropOpen(false)
      navigate('/roadmap', {
        state: {
          steps:        full.steps,
          roadmap_id:   full.id,
          target_role:  full.target_role,
          job_level:    full.job_level,
          pathway_type: full.pathway_type ?? 'role',
        },
      })
    } catch (err) {
      console.error('[Navbar] activatePathway error:', err.message)
    } finally {
      setActivatingId(null)
    }
  }

  async function deletePathway(pathway) {
    try {
      const res = await axios.delete(
        `http://localhost:8000/roadmaps/${pathway.id}`,
        { data: { user_id: user.id } },
      )
      const { new_active_id, was_active } = res.data
      setAllPathways(prev => {
        const remaining = prev.filter(p => p.id !== pathway.id)
        if (new_active_id) return remaining.map(p => ({ ...p, is_active: p.id === new_active_id }))
        return remaining
      })
      setConfirmDeleteId(null)
      if (was_active) {
        try { sessionStorage.removeItem(`pathwaycs-roadmap-${user.id}`) } catch {}
        navigate('/dashboard')
      }
    } catch (err) {
      console.error('[Navbar] deletePathway error:', err.message)
    }
  }

  const hasMultiple = allPathways.length > 1

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0,
      height: NAVBAR_H, zIndex: 500,
      background: navBg,
      borderBottom: `1px solid ${navBorder}`,
      display: 'flex', alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 28px',
      fontFamily: FF,
      transition: 'background 0.2s, border-color 0.2s',
    }}>
      {/* Logo */}
      <button
        onClick={() => navigate('/')}
        style={{
          background: 'none', border: 'none', padding: 0,
          fontSize: 17, fontWeight: 800,
          color: '#4f46e5', cursor: 'pointer',
          letterSpacing: '-0.02em', fontFamily: FF,
        }}
      >
        PathwayCS
      </button>

      {/* Right side */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {user && (
          <NavPill active={active('/explore')} textColor={textColor} textHover={textHover} onClick={() => navigate('/explore')}>
            Explore
          </NavPill>
        )}
        {user && (
          <NavPill active={active('/jobs')} textColor={textColor} textHover={textHover} onClick={() => navigate('/jobs')}>
            Jobs
          </NavPill>
        )}
        {user && (
          <NavPill active={active('/dashboard')} textColor={textColor} textHover={textHover} onClick={() => navigate('/dashboard')}>
            Dashboard
          </NavPill>
        )}

        {/* My Pathway — single pill or dropdown trigger */}
        {user && (
          <div ref={pathwayDropRef} style={{ position: 'relative' }}>
            <button
              onClick={handlePathwayClick}
              style={{
                padding: '5px 12px', borderRadius: 999, border: 'none',
                background: active('/roadmap') ? '#4f46e5' : 'transparent',
                color: active('/roadmap') ? '#ffffff' : textColor,
                fontSize: 14, fontWeight: active('/roadmap') ? 700 : 500,
                cursor: 'pointer', fontFamily: FF,
                transition: 'background 0.15s, color 0.15s',
                display: 'flex', alignItems: 'center', gap: 4,
              }}
              onMouseEnter={e => { if (!active('/roadmap')) e.currentTarget.style.color = textHover }}
              onMouseLeave={e => { if (!active('/roadmap')) e.currentTarget.style.color = textColor }}
            >
              My Pathway
              {hasMultiple && (
                <svg
                  width="10" height="10" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                  style={{ transition: 'transform 0.15s', transform: pathwayDropOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              )}
            </button>

            {pathwayDropOpen && hasMultiple && (
              <div style={{
                position: 'absolute', top: 'calc(100% + 10px)', right: 0,
                background: dropBg, border: `1px solid ${dropBorder}`,
                borderRadius: 12, boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
                minWidth: 260, overflow: 'hidden', zIndex: 600,
              }}>
                {allPathways.map(p => (
                  <PathwayDropItem
                    key={p.id}
                    pathway={p}
                    isConfirming={confirmDeleteId === p.id}
                    isActivating={activatingId === p.id}
                    darkMode={darkMode}
                    dropHover={dropHover}
                    textColor={textColor}
                    onActivate={() => activatePathway(p)}
                    onDeleteStart={e => { e.stopPropagation(); setConfirmDeleteId(p.id) }}
                    onDeleteCancel={() => setConfirmDeleteId(null)}
                    onDeleteConfirm={() => deletePathway(p)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Profile dropdown */}
        <div ref={dropdownRef} style={{ position: 'relative', marginLeft: 10 }}>
          {user ? (
            <button
              onClick={() => setProfileOpen(o => !o)}
              style={{
                width: 36, height: 36, borderRadius: '50%',
                background: 'none', border: `3px solid ${navBorder}`,
                padding: 2, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'border-color 0.15s',
              }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = darkMode ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.2)')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = navBorder)}
            >
              <AvatarSVG character={avatar.character} color={avatar.color} size={28} />
            </button>
          ) : (
            <NavPill active={false} textColor={textColor} textHover={textHover} onClick={() => setProfileOpen(o => !o)}>
              Profile
            </NavPill>
          )}

          {profileOpen && (
            <div style={{
              position: 'absolute', top: 'calc(100% + 10px)', right: 0,
              background: dropBg, border: `1px solid ${dropBorder}`,
              borderRadius: 12, boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
              minWidth: 160, overflow: 'hidden', zIndex: 600,
            }}>
              {user ? (
                <>
                  <DropdownItem
                    hoverBg={dropHover} textColor={textColor}
                    onClick={() => { navigate('/profile'); setProfileOpen(false) }}
                  >
                    Settings
                  </DropdownItem>
                  <DropdownItem
                    hoverBg={dropHover} textColor={textColor}
                    onClick={() => {
                      localStorage.removeItem('sb-tmnmumbqeppoffkxmuvw-auth-token')
                      localStorage.removeItem('pathwaycs-avatar-character')
                      localStorage.removeItem('pathwaycs-avatar-color')
                      localStorage.removeItem('pathwaycs-darkmode')
                      window.location.href = '/'
                    }}
                  >
                    Log Out
                  </DropdownItem>
                </>
              ) : (
                <DropdownItem
                  hoverBg={dropHover} textColor={textColor}
                  onClick={() => { navigate('/login'); setProfileOpen(false) }}
                >
                  Log In
                </DropdownItem>
              )}
            </div>
          )}
        </div>

        {/* Dark mode toggle */}
        <button
          onClick={toggleDarkMode}
          aria-label="Toggle dark mode"
          style={{
            width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
            background: 'none', border: `1px solid ${navBorder}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: textColor,
            transition: 'border-color 0.2s, color 0.2s',
            marginLeft: 4,
          }}
          onMouseEnter={e => (e.currentTarget.style.color = textHover)}
          onMouseLeave={e => (e.currentTarget.style.color = textColor)}
        >
          {darkMode ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="12" cy="12" r="5"/>
              <line x1="12" y1="1"  x2="12" y2="3"/>
              <line x1="12" y1="21" x2="12" y2="23"/>
              <line x1="4.22" y1="4.22"   x2="5.64" y2="5.64"/>
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
              <line x1="1"  y1="12" x2="3"  y2="12"/>
              <line x1="21" y1="12" x2="23" y2="12"/>
              <line x1="4.22" y1="19.78"  x2="5.64" y2="18.36"/>
              <line x1="18.36" y1="5.64"  x2="19.78" y2="4.22"/>
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
            </svg>
          )}
        </button>
      </div>
    </div>
  )
}


// ── Sub-components ────────────────────────────────────────────────────────────

function PathwayDropItem({
  pathway, isConfirming, isActivating,
  darkMode, dropHover, textColor,
  onActivate, onDeleteStart, onDeleteCancel, onDeleteConfirm,
}) {
  const [hovered, setHovered] = useState(false)

  if (isConfirming) {
    return (
      <div style={{
        padding: '10px 14px',
        background: darkMode ? 'rgba(239,68,68,0.08)' : '#fff5f5',
        borderBottom: `1px solid ${darkMode ? 'rgba(239,68,68,0.15)' : '#fee2e2'}`,
        display: 'flex', flexDirection: 'column', gap: 8,
      }}>
        <p style={{ margin: 0, fontSize: 12, color: '#ef4444', fontWeight: 600, lineHeight: 1.4 }}>
          Delete this pathway? This cannot be undone.
        </p>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={onDeleteCancel}
            style={{
              padding: '5px 12px', borderRadius: 999, fontSize: 12, fontWeight: 600,
              background: darkMode ? '#2a2a3e' : '#f3f4f6', color: textColor,
              border: 'none', cursor: 'pointer', fontFamily: FF,
            }}
          >
            Cancel
          </button>
          <button
            onClick={onDeleteConfirm}
            style={{
              padding: '5px 12px', borderRadius: 999, fontSize: 12, fontWeight: 600,
              background: '#ef4444', color: '#ffffff',
              border: 'none', cursor: 'pointer', fontFamily: FF,
            }}
          >
            Delete
          </button>
        </div>
      </div>
    )
  }

  return (
    <div
      onClick={onActivate}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '10px 14px', cursor: 'pointer',
        background: hovered ? dropHover : 'transparent',
        transition: 'background 0.12s',
        opacity: isActivating ? 0.5 : 1,
      }}
    >
      {/* Active checkmark — fixed width to keep alignment */}
      <div style={{ width: 16, flexShrink: 0, display: 'flex', alignItems: 'center' }}>
        {pathway.is_active && (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
            stroke="#6366f1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        )}
      </div>

      {/* Role + type label */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 7, minWidth: 0 }}>
        <span style={{
          fontSize: 13, fontWeight: 600, color: textColor,
          textTransform: 'capitalize',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {pathway.target_role}
        </span>
        <span style={{
          fontSize: 11, fontWeight: 600, flexShrink: 0,
          padding: '2px 7px', borderRadius: 999,
          background: pathway.pathway_type === 'skill_gap'
            ? 'rgba(20,184,166,0.12)' : 'rgba(99,102,241,0.12)',
          color: pathway.pathway_type === 'skill_gap' ? '#14b8a6' : '#818cf8',
          textTransform: 'capitalize',
        }}>
          {pathway.pathway_type === 'skill_gap'
            ? 'Skill Boost'
            : (pathway.job_level ?? 'role')}
        </span>
      </div>

      {/* Trash button */}
      <button
        onClick={onDeleteStart}
        style={{
          background: 'none', border: 'none', padding: 4, flexShrink: 0,
          cursor: 'pointer', borderRadius: 6,
          color: hovered ? '#ef4444' : (darkMode ? '#4a4a6a' : '#d1d5db'),
          transition: 'color 0.15s',
        }}
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="3 6 5 6 21 6" />
          <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
          <path d="M10 11v6M14 11v6" />
          <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" />
        </svg>
      </button>
    </div>
  )
}

function NavPill({ active, onClick, textColor, textHover, children }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '5px 12px', borderRadius: 999, border: 'none',
        background: active ? '#4f46e5' : 'transparent',
        color: active ? '#ffffff' : textColor,
        fontSize: 14, fontWeight: active ? 700 : 500,
        cursor: 'pointer', fontFamily: FF,
        transition: 'background 0.15s, color 0.15s, opacity 0.15s',
      }}
      onMouseEnter={e => { if (!active) e.currentTarget.style.color = textHover }}
      onMouseLeave={e => { if (!active) e.currentTarget.style.color = textColor }}
    >
      {children}
    </button>
  )
}

function DropdownItem({ onClick, hoverBg, textColor, children }) {
  const [hovered, setHovered] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'block', width: '100%',
        padding: '11px 16px', textAlign: 'left',
        background: hovered ? hoverBg : 'transparent',
        border: 'none', cursor: 'pointer',
        fontSize: 14, fontWeight: 500, color: textColor,
        fontFamily: FF, transition: 'background 0.12s',
      }}
    >
      {children}
    </button>
  )
}
