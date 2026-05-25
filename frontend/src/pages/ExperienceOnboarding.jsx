import API_BASE_URL from '../config'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { useAuth } from '../lib/AuthContext'

const LEVEL_OPTIONS = ['Intern', 'Junior', 'Mid-level', 'Senior']

const QUICK_ROLES = [
  {
    id: 'Software Engineer',
    label: 'Software Engineer',
    icon: (color) => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>
      </svg>
    ),
  },
  {
    id: 'Data Scientist',
    label: 'Data Scientist',
    icon: (color) => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/>
        <line x1="6" y1="20" x2="6" y2="14"/>
      </svg>
    ),
  },
  {
    id: 'DevOps Engineer',
    label: 'DevOps Engineer',
    icon: (color) => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3"/>
        <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/>
      </svg>
    ),
  },
  {
    id: 'Cybersecurity Analyst',
    label: 'Cybersecurity Analyst',
    icon: (color) => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      </svg>
    ),
  },
]

const DEMAND_BADGE = {
  high:   { bg: '#dcfce7', color: '#15803d', label: 'High demand' },
  medium: { bg: '#fef9c3', color: '#b45309', label: 'Medium demand' },
  low:    { bg: '#f3f4f6', color: '#6b7280', label: 'Lower demand' },
}

export default function ExperienceOnboarding() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [currentStep, setCurrentStep] = useState(0)
  const [skillsInput, setSkillsInput] = useState('')
  const [jobLevel, setJobLevel] = useState(null)
  const [selectedRole, setSelectedRole] = useState(null)
  const [customRole, setCustomRole] = useState('')
  const [suggestions, setSuggestions] = useState(null)   // null = not yet fetched
  const [suggestLoading, setSuggestLoading] = useState(false)
  const [suggestError, setSuggestError] = useState(null)
  const [generateLoading, setGenerateLoading] = useState(false)
  const [generateError, setGenerateError] = useState(null)
  const [hoveredOption, setHoveredOption] = useState(null)

  const effectiveRole = customRole.trim() || selectedRole

  function goBack() {
    setGenerateError(null)
    setCurrentStep(s => s - 1)
  }

  function advanceFromSkills() {
    if (!skillsInput.trim()) return
    setCurrentStep(1)
  }

  function selectLevel(level) {
    setJobLevel(level)
    setCurrentStep(2)
  }

  async function fetchSuggestedRoles() {
    setSuggestLoading(true)
    setSuggestError(null)
    try {
      const skills = skillsInput.split(',').map(s => s.trim()).filter(Boolean)
      const res = await axios.post(API_BASE_URL + '/suggest-roles', { skills })
      const roles = Array.isArray(res.data) ? res.data : (res.data.roles ?? [])
      setSuggestions(roles)
      setSelectedRole(null)
      setCustomRole('')
    } catch (error) {
      console.error('[suggest-roles] error:', error.response?.data || error.message)
      setSuggestError('Could not fetch suggestions.')
    } finally {
      setSuggestLoading(false)
    }
  }

  async function generate() {
    if (!effectiveRole) return
    setGenerateLoading(true)
    setGenerateError(null)

    const current_skills = skillsInput.split(',').map(s => s.trim()).filter(Boolean)
    const requestBody = {
      current_skills,
      target_role: effectiveRole,
      job_level: jobLevel.toLowerCase(),
      user_id: user?.id ?? null,
      pathway_type: 'role',
    }

    let res
    try {
      res = await axios.post(API_BASE_URL + '/generate-roadmap', requestBody)
    } catch {
      setGenerateError('This is taking longer than usual, please wait…')
      await new Promise(r => setTimeout(r, 3000))
      try {
        res = await axios.post(API_BASE_URL + '/generate-roadmap', requestBody)
      } catch (err) {
        console.error('[generate-roadmap] error:', err.response?.data || err.message)
        setGenerateError('Something went wrong. Please try again.')
        setGenerateLoading(false)
        return
      }
    }

    setGenerateError(null)
    const roadmapData = {
      id:             res.data.roadmap_id,
      steps:          res.data.steps,
      target_role:    res.data.target_role ?? effectiveRole,
      job_level:      res.data.job_level   ?? jobLevel,
      current_skills: current_skills,
      pathway_type:   'role',
    }
    try { localStorage.setItem('pathwaycs-active-roadmap', JSON.stringify(roadmapData)) } catch {}
    if (user?.id) {
      try {
        sessionStorage.setItem(
          `pathwaycs-roadmap-${user.id}`,
          JSON.stringify({ ts: Date.now(), data: roadmapData }),
        )
      } catch {}
    }
    window.dispatchEvent(new CustomEvent('pathwaycs:pathways-changed'))
    navigate('/roadmap', {
      state: {
        ...res.data,
        roadmap_id: res.data.roadmap_id,
        track: 'experience',
      },
    })
    setGenerateLoading(false)
  }

  // ── Styles ────────────────────────────────────────────────────────────────

  const containerStyle = {
    position: 'relative',
    width: '100vw',
    height: '100vh',
    paddingTop: '52px',
    background: '#ffffff',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    boxSizing: 'border-box',
  }

  const blobBase = { position: 'absolute', borderRadius: '50%', pointerEvents: 'none' }

  const blobLeft = {
    ...blobBase,
    width: '420px', height: '320px',
    top: '30%', left: '-60px',
    filter: 'blur(80px)',
    background: 'rgba(99, 102, 241, 0.7)',
  }

  const blobTopRight = {
    ...blobBase,
    width: '400px', height: '280px',
    top: '-40px', right: '40px',
    filter: 'blur(55px)',
    background: 'rgba(20, 184, 166, 0.75)',
  }

  const blobBottomRight = {
    ...blobBase,
    width: '300px', height: '240px',
    bottom: '-30px', right: '-40px',
    filter: 'blur(65px)',
    background: 'rgba(6, 182, 212, 0.65)',
  }

  const cardStyle = {
    position: 'relative',
    zIndex: 1,
    background: 'rgba(255,255,255,0.85)',
    backdropFilter: 'blur(12px)',
    borderRadius: '20px',
    padding: '40px 48px',
    width: '100%',
    maxWidth: '540px',
    maxHeight: 'calc(100vh - 132px)',
    overflowY: 'auto',
    boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  }

  const progressLabelStyle = { fontSize: '13px', color: '#9ca3af', fontWeight: 500 }

  const progressBarTrackStyle = {
    width: '100%', height: '4px',
    background: '#e5e7eb', borderRadius: '999px', overflow: 'hidden',
  }

  const progressBarFillStyle = {
    height: '100%',
    width: `${((currentStep + 1) / 3) * 100}%`,
    background: 'linear-gradient(90deg, #6366f1, #14b8a6)',
    borderRadius: '999px',
    transition: 'width 0.35s ease',
  }

  const questionStyle = {
    fontSize: '22px', fontWeight: 700, color: '#111111', margin: 0, lineHeight: 1.3,
  }

  const inputStyle = {
    width: '100%',
    padding: '14px 16px',
    borderRadius: '12px',
    border: '2px solid #e5e7eb',
    fontSize: '15px',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    color: '#111111',
    background: '#ffffff',
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color 0.15s ease',
  }

  const hintStyle = { fontSize: '13px', color: '#9ca3af', margin: '-12px 0 0' }

  const gridStyle = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }

  function optionCardStyle(value, currentAnswer) {
    const selected = currentAnswer === value
    const hovered = hoveredOption === value
    return {
      padding: '16px 20px',
      borderRadius: '12px',
      border: selected ? '2px solid #6366f1' : hovered ? '2px solid #d1d5db' : '2px solid #e5e7eb',
      background: selected ? 'rgba(99, 102, 241, 0.08)' : hovered ? '#f9fafb' : '#ffffff',
      fontSize: '15px',
      fontWeight: 500,
      color: selected ? '#4f46e5' : '#111111',
      cursor: 'pointer',
      textAlign: 'center',
      transition: 'all 0.15s ease',
      fontFamily: 'system-ui, -apple-system, sans-serif',
    }
  }

  function suggestionCardStyle(title) {
    const hovered = hoveredOption === title
    return {
      width: '100%',
      padding: '14px 16px',
      borderRadius: '12px',
      border: hovered ? '2px solid #d1d5db' : '2px solid #e5e7eb',
      background: hovered ? '#f9fafb' : '#ffffff',
      cursor: 'pointer',
      textAlign: 'left',
      display: 'flex',
      flexDirection: 'column',
      gap: '6px',
      transition: 'all 0.15s ease',
      fontFamily: 'system-ui, -apple-system, sans-serif',
    }
  }

  const footerStyle = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: currentStep > 0 ? 'space-between' : 'flex-end',
    gap: '12px',
  }

  const backBtnStyle = {
    background: 'none', border: 'none',
    fontSize: '14px', fontWeight: 500, color: '#6b7280',
    cursor: 'pointer', fontFamily: 'system-ui, -apple-system, sans-serif', padding: '8px 0',
  }

  function pillBtnStyle(active, minWidth = '140px') {
    return {
      padding: '13px 28px',
      borderRadius: '999px',
      fontSize: '15px',
      fontWeight: 600,
      background: active ? 'linear-gradient(90deg, #6366f1, #14b8a6)' : '#e5e7eb',
      color: active ? '#ffffff' : '#9ca3af',
      border: 'none',
      cursor: active ? 'pointer' : 'default',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      transition: 'opacity 0.15s ease',
      minWidth,
    }
  }

  const suggestBtnStyle = {
    padding: '10px 18px',
    borderRadius: '999px',
    fontSize: '13px',
    fontWeight: 600,
    background: suggestLoading ? '#e5e7eb' : 'rgba(99, 102, 241, 0.1)',
    color: suggestLoading ? '#9ca3af' : '#4f46e5',
    border: '1.5px solid rgba(99, 102, 241, 0.3)',
    cursor: suggestLoading ? 'default' : 'pointer',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    transition: 'all 0.15s ease',
    alignSelf: 'flex-start',
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div style={containerStyle}>
      <div style={blobLeft} />
      <div style={blobTopRight} />
      <div style={blobBottomRight} />

      <div style={cardStyle}>
        {/* Progress */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <span style={progressLabelStyle}>Step {currentStep + 1} of 3</span>
          <div style={progressBarTrackStyle}>
            <div style={progressBarFillStyle} />
          </div>
        </div>

        {/* ── Step 1: Skills ── */}
        {currentStep === 0 && (
          <>
            <h2 style={questionStyle}>What skills do you already have?</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <input
                style={inputStyle}
                type="text"
                placeholder="e.g. Python, HTML, JavaScript"
                value={skillsInput}
                onChange={e => setSkillsInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && advanceFromSkills()}
                onFocus={e => (e.currentTarget.style.borderColor = '#6366f1')}
                onBlur={e => (e.currentTarget.style.borderColor = '#e5e7eb')}
              />
              <p style={hintStyle}>Separate skills with commas</p>
            </div>
            <div style={footerStyle}>
              <button
                style={pillBtnStyle(skillsInput.trim().length > 0)}
                onClick={advanceFromSkills}
                onMouseEnter={e => { if (skillsInput.trim()) e.currentTarget.style.opacity = '0.85' }}
                onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
              >
                Next →
              </button>
            </div>
          </>
        )}

        {/* ── Step 2: Level ── */}
        {currentStep === 1 && (
          <>
            <h2 style={questionStyle}>What level are you targeting?</h2>
            <div style={gridStyle}>
              {LEVEL_OPTIONS.map(level => (
                <button
                  key={level}
                  style={optionCardStyle(level, jobLevel)}
                  onClick={() => selectLevel(level)}
                  onMouseEnter={() => setHoveredOption(level)}
                  onMouseLeave={() => setHoveredOption(null)}
                >
                  {level}
                </button>
              ))}
            </div>
            <div style={footerStyle}>
              <button style={backBtnStyle} onClick={goBack}>← Back</button>
            </div>
          </>
        )}

        {/* ── Step 3: Role ── */}
        {currentStep === 2 && (
          <>
            <h2 style={questionStyle}>What role are you interested in?</h2>

            {/* ── Quick-select grid ── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              {QUICK_ROLES.map(role => {
                const sel = selectedRole === role.id
                const hov = hoveredOption === role.id
                const iconColor = sel ? '#4f46e5' : '#6b7280'
                return (
                  <button
                    key={role.id}
                    onClick={() => { setSelectedRole(role.id); setCustomRole(role.label); setSuggestions(null) }}
                    onMouseEnter={() => setHoveredOption(role.id)}
                    onMouseLeave={() => setHoveredOption(null)}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      padding: '0 10px', height: '48px', borderRadius: '12px',
                      border: sel ? '2px solid #6366f1' : hov ? '2px solid #d1d5db' : '2px solid #e5e7eb',
                      background: sel ? 'rgba(99,102,241,0.08)' : hov ? '#f9fafb' : '#ffffff',
                      cursor: 'pointer', transition: 'all 0.15s ease',
                      fontFamily: 'system-ui, -apple-system, sans-serif',
                    }}
                  >
                    <span style={{
                      fontSize: '12px', fontWeight: 600, lineHeight: 1.3, textAlign: 'center',
                      color: sel ? '#4f46e5' : '#374151',
                    }}>
                      {role.label}
                    </span>
                  </button>
                )
              })}
            </div>

            {/* Suggestion cards — shown after "Suggest" is clicked */}
            {suggestions !== null && (
              suggestions.length === 0 ? (
                <p style={{ margin: 0, fontSize: '14px', color: '#9ca3af', textAlign: 'center' }}>
                  No suggestions found — try adding more skills.
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {suggestions.map(s => {
                    const demand = DEMAND_BADGE[(s.demand ?? '').toLowerCase()]
                    return (
                      <button
                        key={s.title}
                        style={suggestionCardStyle(s.title)}
                        onClick={() => { setCustomRole(s.title); setSelectedRole(null); setSuggestions(null) }}
                        onMouseEnter={() => setHoveredOption(s.title)}
                        onMouseLeave={() => setHoveredOption(null)}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontWeight: 700, fontSize: '14px', color: '#111111' }}>
                            {s.title}
                          </span>
                          {demand && (
                            <span style={{
                              fontSize: '11px', fontWeight: 600, flexShrink: 0,
                              padding: '2px 9px', borderRadius: '999px',
                              background: demand.bg, color: demand.color,
                            }}>
                              {demand.label}
                            </span>
                          )}
                        </div>
                        {s.description && (
                          <p style={{ margin: 0, fontSize: '12px', color: '#6b7280', lineHeight: 1.55 }}>
                            {s.description}
                          </p>
                        )}
                      </button>
                    )
                  })}
                </div>
              )
            )}

            {suggestError && (
              <p style={{ fontSize: '13px', color: '#ef4444', margin: '-8px 0 0' }}>{suggestError}</p>
            )}

            <input
              style={inputStyle}
              type="text"
              placeholder="or type your desired role"
              value={customRole}
              onChange={e => { setCustomRole(e.target.value); setSelectedRole(null) }}
              onFocus={e => (e.currentTarget.style.borderColor = '#6366f1')}
              onBlur={e => (e.currentTarget.style.borderColor = '#e5e7eb')}
            />

            <button
              style={{ ...suggestBtnStyle, display: 'flex', alignItems: 'center', gap: '6px' }}
              onClick={suggestLoading ? undefined : fetchSuggestedRoles}
            >
              {suggestLoading && (
                <div style={{
                  width: '12px', height: '12px', borderRadius: '50%',
                  border: '2px solid rgba(99,102,241,0.3)', borderTopColor: '#4f46e5',
                  animation: 'spin 0.7s linear infinite', flexShrink: 0,
                }} />
              )}
              {suggestLoading
                ? 'Fetching…'
                : suggestions !== null
                  ? '✦ Suggest different roles'
                  : '✦ Suggest roles based on my skills'}
            </button>

            {generateError && (
              <p style={{ fontSize: '13px', color: '#ef4444', margin: '-8px 0 0' }}>{generateError}</p>
            )}

            <div style={footerStyle}>
              <button style={backBtnStyle} onClick={goBack}>← Back</button>
              <button
                style={pillBtnStyle(!!effectiveRole && !generateLoading, '190px')}
                onClick={effectiveRole && !generateLoading ? generate : undefined}
                onMouseEnter={e => { if (effectiveRole) e.currentTarget.style.opacity = '0.85' }}
                onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
              >
                {generateLoading ? 'Generating…' : 'Generate My Pathway'}
              </button>
            </div>
          </>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
