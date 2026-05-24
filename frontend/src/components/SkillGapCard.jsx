import API_BASE_URL from '../config'
import { useState, useEffect, useRef } from 'react'
import axios from 'axios'

const FF = 'system-ui, -apple-system, sans-serif'

// ── Matching helpers ──────────────────────────────────────────────────────────

function normalize(s) {
  return (s ?? '').toLowerCase().replace(/[.\-_/\\]/g, ' ').trim()
}

function currentSkillMatches(marketSkill, userSkill) {
  const mk = normalize(marketSkill)
  const sk = normalize(userSkill)
  return sk === mk || sk.includes(mk) || mk.includes(sk)
}

function marketSkillInTitle(marketSkill, stepTitle) {
  const mk = normalize(marketSkill)
  const title = normalize(stepTitle)
  if (!mk) return false
  const escaped = mk.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  try { return new RegExp(`\\b${escaped}\\b`).test(title) }
  catch { return title.includes(mk) }
}

function autoHasSkill(marketSkill, currentSkills, completedTitles) {
  return (
    currentSkills.some(s => currentSkillMatches(marketSkill, s)) ||
    completedTitles.some(t => marketSkillInTitle(marketSkill, t))
  )
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function SkeletonRow({ barBg, index }) {
  const widths = [72, 96, 60, 84, 78]
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{
        width: 22, height: 22, borderRadius: 6, background: barBg,
        opacity: 0.4, flexShrink: 0,
      }} />
      <div style={{
        width: widths[index % widths.length] + 40, height: 12,
        borderRadius: 6, background: barBg, opacity: 0.55,
        animation: 'skeletonPulse 1.4s ease-in-out infinite',
        animationDelay: `${index * 0.1}s`,
      }} />
      <div style={{
        flex: 1, height: 10, borderRadius: 999, background: barBg,
        opacity: 0.35, animation: 'skeletonPulse 1.4s ease-in-out infinite',
        animationDelay: `${index * 0.1 + 0.2}s`,
      }} />
      <div style={{
        width: 56, height: 12, borderRadius: 6, background: barBg,
        opacity: 0.4, animation: 'skeletonPulse 1.4s ease-in-out infinite',
        animationDelay: `${index * 0.1 + 0.4}s`,
      }} />
    </div>
  )
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function SkillGapCard({
  targetRole,
  currentSkills    = [],
  steps            = [],
  completedSteps   = {},
  marketSkills     = [],
  skillsLoading    = true,
  knownSkills      = [],   // saved array from profiles.known_skills
  onKnownSkillsChange,     // (newArray) => void — called on every toggle
  jobLevel,
  userId,
  D,
  darkMode,
  navigate,
}) {
  if (!targetRole) return null

  const completedTitles = steps
    .filter(s => completedSteps[s.step ?? s.step_number])
    .map(s => s.title ?? '')

  const barBg = darkMode ? '#2a2a3e' : '#e5e7eb'

  // ── Checked state ─────────────────────────────────────────────────────────
  const [checkedSkills, setCheckedSkills] = useState(new Set())
  const autoInitDone = useRef(false)

  // Initialise from auto-matched skills once market data arrives.
  useEffect(() => {
    if (skillsLoading || marketSkills.length === 0 || autoInitDone.current) return
    autoInitDone.current = true
    const initial = new Set()
    marketSkills.forEach(skill => {
      if (autoHasSkill(skill, currentSkills, completedTitles)) initial.add(skill)
    })
    setCheckedSkills(initial)
  }, [skillsLoading, marketSkills])

  // Merge in DB-saved skills whenever knownSkills prop arrives / updates.
  useEffect(() => {
    if (!knownSkills.length || !marketSkills.length) return
    setCheckedSkills(prev => {
      const next = new Set(prev)
      knownSkills.forEach(k => {
        const match = marketSkills.find(s => normalize(s) === normalize(k))
        if (match) next.add(match)
      })
      return next
    })
  }, [knownSkills, marketSkills])

  function toggleSkill(skill) {
    setCheckedSkills(prev => {
      const next = new Set(prev)
      next.has(skill) ? next.delete(skill) : next.add(skill)
      onKnownSkillsChange?.(Array.from(next))
      return next
    })
  }

  const haveCount = checkedSkills.size
  const total     = marketSkills.length

  const [generating, setGenerating] = useState(false)
  const [toast,      setToast]      = useState(false)

  async function generateGapPathway() {
    if (generating) return
    const missingSkills = marketSkills.filter(s => !checkedSkills.has(s))
    setGenerating(true)
    try {
      const res = await axios.post(API_BASE_URL + '/generate-roadmap', {
        current_skills: Array.from(checkedSkills),
        target_role:    targetRole,
        job_level:      (jobLevel ?? 'mid-level').toLowerCase(),
        user_id:        userId ?? null,
        pathway_type:   'skill_gap',
        missing_skills: missingSkills,
        context: missingSkills.length
          ? `The user is missing these specific market skills: ${missingSkills.join(', ')}. Generate a focused pathway to help them acquire exactly these skills for their target role.`
          : undefined,
      })
      // Write new pathway into dashboard cache before dispatching so the
      // dashboard event listener (and any subsequent visit) gets fresh data.
      try {
        sessionStorage.setItem(
          `pathwaycs-roadmap-${userId}`,
          JSON.stringify({
            ts: Date.now(),
            data: {
              id:            res.data.roadmap_id,
              steps:         res.data.steps,
              target_role:   res.data.target_role ?? targetRole,
              job_level:     res.data.job_level   ?? jobLevel,
              current_skills: Array.from(checkedSkills),
              pathway_type:  'skill_gap',
            },
          }),
        )
      } catch {}
      window.dispatchEvent(new CustomEvent('pathwaycs:pathways-changed'))
      setToast(true)
      setTimeout(() => {
        navigate('/roadmap', {
          state: { ...res.data, roadmap_id: res.data.roadmap_id, track: 'gap' },
        })
      }, 1800)
    } catch (err) {
      console.error('[SkillGapCard] generate error:', err.message)
      setGenerating(false)
    }
  }

  return (
    <div style={{
      background: D.card, borderRadius: 16,
      padding: '24px 28px', border: D.border,
      boxShadow: D.shadow,
      display: 'flex', flexDirection: 'column', gap: 20,
      transition: 'background 0.2s',
    }}>
      <style>{`
        @keyframes skeletonPulse {
          0%, 100% { opacity: var(--sk-lo, 0.35); }
          50%       { opacity: var(--sk-hi, 0.7); }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        .skill-row:hover { opacity: 0.85; }
      `}</style>

      {/* Header */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: D.text }}>
          My Skill Gap
        </h2>
        <p style={{ margin: 0, fontSize: 13, color: D.textMuted, lineHeight: 1.4 }}>
          Check the skills you already know — we'll show you what to learn next
        </p>
      </div>

      {/* ── Skeleton ── */}
      {skillsLoading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{
            width: 220, height: 14, borderRadius: 6, background: barBg,
            opacity: 0.5, animation: 'skeletonPulse 1.4s ease-in-out infinite',
          }} />
          {[0, 1, 2, 3, 4].map(i => <SkeletonRow key={i} barBg={barBg} index={i} />)}
        </div>
      )}

      {/* ── Loaded with results ── */}
      {!skillsLoading && total > 0 && (
        <>
          <p style={{ margin: 0, fontSize: 14, color: D.text, lineHeight: 1.5 }}>
            <strong>You have {haveCount} of {total} top skills</strong>{' '}
            <span style={{ color: D.textMuted }}>
              employers want for{' '}
              <span style={{ textTransform: 'capitalize', fontWeight: 600 }}>{targetRole}</span>.
            </span>
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {marketSkills.map(skill => {
              const checked = checkedSkills.has(skill)
              return (
                <div
                  key={skill}
                  className="skill-row"
                  onClick={() => toggleSkill(skill)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    cursor: 'pointer', userSelect: 'none',
                    padding: '4px 0',
                  }}
                >
                  {/* Checkbox */}
                  <div style={{
                    width: 22, height: 22, borderRadius: 6, flexShrink: 0,
                    border: checked ? 'none' : `2px solid ${darkMode ? '#4a4a6a' : '#d1d5db'}`,
                    background: checked ? '#22c55e' : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'background 0.15s, border-color 0.15s',
                  }}>
                    {checked && (
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                        stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </div>

                  {/* Skill name */}
                  <span style={{
                    width: 126, flexShrink: 0,
                    fontSize: 13, fontWeight: 500, color: D.text,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {skill}
                  </span>

                  {/* Progress bar */}
                  <div style={{
                    flex: 1, height: 10, borderRadius: 999,
                    background: barBg, overflow: 'hidden', position: 'relative',
                  }}>
                    <div style={{
                      position: 'absolute', inset: 0,
                      width: checked ? '100%' : '0%',
                      borderRadius: 999,
                      background: 'linear-gradient(90deg, #22c55e, #16a34a)',
                      transition: 'width 0.4s ease',
                    }} />
                  </div>

                  {/* Label */}
                  <div style={{ width: 56, flexShrink: 0 }}>
                    {checked ? (
                      <span style={{ fontSize: 12, fontWeight: 600, color: '#22c55e' }}>
                        Have it
                      </span>
                    ) : (
                      <span style={{ fontSize: 12, fontWeight: 600, color: darkMode ? '#4a4a6a' : '#d1d5db' }}>
                        Missing
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          <button
            onClick={generating ? undefined : generateGapPathway}
            style={{
              alignSelf: 'flex-start', padding: '10px 22px', borderRadius: 999,
              background: 'linear-gradient(90deg, #6366f1, #14b8a6)',
              color: '#ffffff', border: 'none', fontSize: 14, fontWeight: 700,
              cursor: generating ? 'default' : 'pointer', fontFamily: FF,
              transition: 'opacity 0.15s', opacity: generating ? 0.8 : 1,
              display: 'flex', alignItems: 'center', gap: 8,
            }}
            onMouseEnter={e => { if (!generating) e.currentTarget.style.opacity = '0.88' }}
            onMouseLeave={e => (e.currentTarget.style.opacity = generating ? '0.8' : '1')}
          >
            {generating && (
              <div style={{
                width: 13, height: 13, borderRadius: '50%', flexShrink: 0,
                border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#ffffff',
                animation: 'spin 0.7s linear infinite',
              }} />
            )}
            {generating ? 'Building your pathway…' : 'Build a Pathway to fill these gaps →'}
          </button>

          {/* Toast */}
          {toast && (
            <div style={{
              position: 'fixed', top: 24, left: '50%', transform: 'translateX(-50%)',
              zIndex: 9999, background: '#22c55e', color: '#ffffff',
              padding: '12px 28px', borderRadius: 999, fontSize: 14, fontWeight: 600,
              boxShadow: '0 4px 20px rgba(0,0,0,0.15)', fontFamily: FF,
              whiteSpace: 'nowrap', pointerEvents: 'none',
            }}>
              ✓ New pathway generated for your skill gaps!
            </div>
          )}
        </>
      )}

      {/* ── No results ── */}
      {!skillsLoading && total === 0 && (
        <p style={{ margin: 0, fontSize: 14, color: D.textMuted }}>
          No market data found for{' '}
          <strong style={{ textTransform: 'capitalize' }}>{targetRole}</strong>
          {' '}— try generating a new pathway with a standard role name.
        </p>
      )}
    </div>
  )
}
