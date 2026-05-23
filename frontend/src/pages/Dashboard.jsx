import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'
import { useTheme } from '../lib/ThemeContext'
import { useProfile } from '../lib/ProfileContext'
import { supabase } from '../lib/supabase'
import axios from 'axios'
import AvatarSVG from '../components/AvatarSVG'
import SkillGapCard from '../components/SkillGapCard'

const FF = 'system-ui, -apple-system, sans-serif'
const SKILLS_CACHE_TTL  = 60 * 60 * 1000  // 1 hour
const ROADMAP_CACHE_TTL = 5  * 60 * 1000  // 5 minutes

const REL_BADGE = {
  high:   { bg: '#dcfce7', color: '#15803d', label: 'High Market Fit' },
  medium: { bg: '#fef3c7', color: '#d97706', label: 'Medium Market Fit' },
  low:    { bg: '#f3f4f6', color: '#6b7280', label: 'Lower Priority' },
}

// ── Skills cache helpers ──────────────────────────────────────────────────────

function getCachedSkills(role) {
  try {
    const key = `pathwaycs-skills-${role.toLowerCase().replace(/\s+/g, '-')}`
    const raw = localStorage.getItem(key)
    if (!raw) return null
    const { ts, skills } = JSON.parse(raw)
    if (Date.now() - ts > SKILLS_CACHE_TTL) return null
    console.log('[Dashboard] Market skills cache hit for', role)
    return skills
  } catch { return null }
}

function setCachedSkills(role, skills) {
  try {
    const key = `pathwaycs-skills-${role.toLowerCase().replace(/\s+/g, '-')}`
    localStorage.setItem(key, JSON.stringify({ ts: Date.now(), skills }))
  } catch {}
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const { user, loading: authLoading } = useAuth()
  const { darkMode } = useTheme()
  const { avatar } = useProfile()
  const navigate = useNavigate()

  const D = {
    bg:        darkMode ? '#0f0f1a' : '#f8fafc',
    card:      darkMode ? '#1a1a2e' : '#ffffff',
    shadow:    darkMode ? '0 1px 3px rgba(0,0,0,0.4), 0 4px 16px rgba(0,0,0,0.25)' : '0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)',
    border:    darkMode ? '1px solid #2a2a3e' : 'none',
    text:      darkMode ? '#f1f5f9' : '#111827',
    textMuted: darkMode ? '#94a3b8' : '#6b7280',
    textSub:   darkMode ? '#64748b' : '#9ca3af',
    hr:        darkMode ? '#2a2a3e' : '#f3f4f6',
    barBg:     darkMode ? '#2a2a3e' : '#e5e7eb',
    progGreen: darkMode ? '#052e16' : '#f0fdf4',
    progBorder:darkMode ? '#14532d' : '#bbf7d0',
    progText:  darkMode ? '#4ade80' : '#15803d',
    hoverRow:  darkMode ? '#2a2a3e' : '#f9fafb',
  }

  // Phase 1 state — gates the initial render
  const [roadmap,  setRoadmap]  = useState(null)
  const [loading,  setLoading]  = useState(true)

  // Phase 2 state — fills in after the page is visible
  const [progress,      setProgress]      = useState({})
  const [marketSkills,  setMarketSkills]  = useState([])
  const [skillsLoading, setSkillsLoading] = useState(true)
  const [knownSkills,   setKnownSkills]   = useState([])

  useEffect(() => {
    if (!authLoading && !user) navigate('/login', { replace: true })
  }, [authLoading, user])

  // ── Pathway-switch listener ───────────────────────────────────────────────
  // When the user picks a different pathway from the navbar dropdown (or a new
  // one is generated), the navbar writes the new data into sessionStorage and
  // dispatches this event.  If the dashboard is mounted we can swap the active
  // roadmap immediately without waiting for a Supabase round-trip.
  useEffect(() => {
    if (!user?.id) return
    function onPathwayChanged() {
      try {
        const raw = sessionStorage.getItem(`pathwaycs-roadmap-${user.id}`)
        if (!raw) return
        const { data } = JSON.parse(raw)
        if (data?.id) {
          setRoadmap(data)
          setProgress({})       // reset so Phase-2 re-fetches for the new roadmap
          setMarketSkills([])
          setSkillsLoading(true)
        }
      } catch {}
    }
    window.addEventListener('pathwaycs:pathways-changed', onPathwayChanged)
    return () => window.removeEventListener('pathwaycs:pathways-changed', onPathwayChanged)
  }, [user?.id])

  // ── Phase 1: fetch roadmap (blocks render) ────────────────────────────────
  useEffect(() => {
    if (authLoading || !user) return

    let mounted = true
    const cacheKey = `pathwaycs-roadmap-${user.id}`

    // Fast path: serve from sessionStorage and render immediately
    let servedFromCache = false
    try {
      const raw = sessionStorage.getItem(cacheKey)
      if (raw) {
        const { ts, data } = JSON.parse(raw)
        if (Date.now() - ts < ROADMAP_CACHE_TTL) {
          servedFromCache = true
          setRoadmap(data)
          setLoading(false)
          console.log('[Dashboard] Roadmap from cache — rendering immediately')
        }
      }
    } catch {}

    // Always fetch fresh — primary on cache miss, silent refresh on cache hit.
    // Query active pathway first; fall back to most recent if none has is_active=true
    // (handles existing users whose roadmaps predate the is_active column).
    const FETCH_TIMEOUT = 6000
    const timeout = (ms) => new Promise((_, reject) =>
      setTimeout(() => reject(new Error('timeout')), ms)
    )

    async function fetchFreshRoadmap() {
      try {
        let rows
        try {
          const result = await Promise.race([
            supabase
              .from('roadmaps')
              .select('id, steps, target_role, job_level, current_skills, pathway_type, created_at')
              .eq('user_id', user.id)
              .eq('is_active', true)
              .limit(1),
            timeout(FETCH_TIMEOUT),
          ])
          if (result.error) {
            console.error('[Dashboard] Roadmap query error:', result.error.message)
          } else {
            rows = result.data
          }
        } catch (e) {
          console.log('[Dashboard] Roadmap active fetch skipped:', e.message)
        }

        // Fallback for users whose roadmaps predate the is_active column
        if (!rows?.length) {
          try {
            const fb = await Promise.race([
              supabase
                .from('roadmaps')
                .select('id, steps, target_role, job_level, current_skills, pathway_type, created_at')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })
                .limit(1),
              timeout(FETCH_TIMEOUT),
            ])
            rows = fb.data
          } catch (e) {
            console.log('[Dashboard] Roadmap fallback fetch skipped:', e.message)
          }
        }

        if (!mounted) return
        console.log('[Dashboard] Roadmap fetch complete —', rows?.length ?? 0, 'rows')
        if (rows?.length) {
          setRoadmap(rows[0])
          try {
            sessionStorage.setItem(cacheKey, JSON.stringify({ ts: Date.now(), data: rows[0] }))
          } catch {}
        }
      } catch (err) {
        if (!mounted) return
        console.error('[Dashboard] Roadmap fetch rejected:', err?.message)
      } finally {
        if (!mounted) return
        if (!servedFromCache) {
          setLoading(false)
          console.log('[Dashboard] Phase 1 complete — page rendering')
        }
      }
    }
    fetchFreshRoadmap()

    return () => { mounted = false }
  }, [authLoading, user])

  // ── Phase 2: fetch progress + market skills in parallel (background) ──────
  useEffect(() => {
    if (!roadmap) return

    async function fetchProgress() {
      console.log('[Dashboard] Fetching progress for roadmap', roadmap.id)
      try {
        const res = await axios.get(
          `http://localhost:8000/progress/${roadmap.id}`,
          { timeout: 8000 },
        )
        const rows = res.data?.progress ?? []
        const map = {}
        rows.forEach(row => { if (row.completed) map[row.step_number] = true })
        setProgress(map)
        console.log('[Dashboard] Progress fetch complete —', Object.keys(map).length, 'completed')
      } catch (err) {
        console.error('[Dashboard] Progress fetch failed:', err?.message)
      }
    }

    async function fetchMarketSkills() {
      const role = roadmap.target_role
      if (!role) { setSkillsLoading(false); return }

      // Serve from cache if fresh — avoids 7-8s Adzuna round-trip on repeat visits
      const cached = getCachedSkills(role)
      if (cached) {
        setMarketSkills(cached)
        setSkillsLoading(false)
        return
      }

      console.log('[Dashboard] Fetching market skills for', role)
      try {
        const res = await axios.get(
          'http://localhost:8000/jobs',
          { params: { target_role: role }, timeout: 15000 },
        )
        const skills = res.data.top_skills?.slice(0, 10) ?? []
        console.log('[Dashboard] Market skills fetch complete —', skills.length, 'skills')
        setMarketSkills(skills)
        setCachedSkills(role, skills)
      } catch (err) {
        console.error('[Dashboard] Market skills fetch failed:', err?.message)
      } finally {
        setSkillsLoading(false)
      }
    }

    async function fetchKnownSkills() {
      if (!user?.id) return
      try {
        const result = await Promise.race([
          supabase.from('profiles').select('known_skills').eq('id', user.id).single(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 4000)),
        ])
        const skills = result?.data?.known_skills
        if (Array.isArray(skills) && skills.length) {
          setKnownSkills(skills)
          console.log('[Dashboard] Known skills loaded:', skills.length)
        }
      } catch (err) {
        console.log('[Dashboard] fetchKnownSkills skipped:', err.message)
      }
    }

    // All three run in parallel — none blocks the others
    Promise.allSettled([fetchProgress(), fetchMarketSkills(), fetchKnownSkills()])
  }, [roadmap])

  // ── Re-fetch progress on tab focus ───────────────────────────────────────
  useEffect(() => {
    if (!roadmap?.id) return
    function onVisible() {
      if (document.visibilityState !== 'visible') return
      axios.get(`http://localhost:8000/progress/${roadmap.id}`, { timeout: 8000 })
        .then(res => {
          const rows = res.data?.progress ?? []
          const map = {}
          rows.forEach(row => { if (row.completed) map[row.step_number] = true })
          setProgress(map)
        })
        .catch(() => {})
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [roadmap?.id])

  // ── Phase 1 gate ─────────────────────────────────────────────────────────
  if (authLoading || loading) {
    return (
      <div style={{
        width: '100vw', height: '100vh', background: '#f8fafc',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: FF, paddingTop: 52, boxSizing: 'border-box',
      }}>
        <p style={{ color: '#9ca3af', fontSize: 15, margin: 0 }}>Loading…</p>
      </div>
    )
  }

  const displayName = user?.user_metadata?.display_name
    ?? user?.email?.split('@')[0]
    ?? 'there'

  const steps          = roadmap?.steps ?? []
  const completedCount = Object.values(progress).filter(Boolean).length
  const totalCount     = steps.length
  const recentCompleted = steps.filter(s => progress[s.step]).slice(-3).reverse()
  const nextStep        = steps.find(s => !progress[s.step])

  function saveKnownSkills(skillsArray) {
    if (!user?.id) return
    supabase.from('profiles')
      .upsert({ id: user.id, known_skills: skillsArray }, { onConflict: 'id' })
      .then(({ error } = {}) => {
        if (error) console.log('[Dashboard] saveKnownSkills error:', error.message)
      })
      .catch(err => console.log('[Dashboard] saveKnownSkills threw:', err.message))
  }

  function goToRoadmap() {
    if (!roadmap) return
    navigate('/roadmap', {
      state: {
        steps:        roadmap.steps,
        roadmap_id:   roadmap.id,
        target_role:  roadmap.target_role,
        job_level:    roadmap.job_level,
        pathway_type: roadmap.pathway_type ?? 'role',
      },
    })
  }

  async function switchToRolePathway() {
    if (!user?.id) return
    try {
      const res = await axios.get(`http://localhost:8000/roadmaps?user_id=${user.id}`, { timeout: 5000 })
      const pathways = res.data?.roadmaps ?? []
      const rolePathway = pathways.find(p => (p.pathway_type ?? 'role') === 'role')
      if (rolePathway) {
        const active = await axios.post(
          `http://localhost:8000/roadmaps/${rolePathway.id}/set-active`,
          { user_id: user.id },
        )
        const full = active.data
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
        window.dispatchEvent(new CustomEvent('pathwaycs:pathways-changed'))
        navigate('/roadmap', {
          state: {
            steps:        full.steps,
            roadmap_id:   full.id,
            target_role:  full.target_role,
            job_level:    full.job_level,
            pathway_type: full.pathway_type ?? 'role',
          },
        })
      } else {
        navigate('/onboarding/experience')
      }
    } catch (err) {
      console.error('[Dashboard] switchToRolePathway error:', err.message)
      navigate('/onboarding/experience')
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: D.bg, fontFamily: FF, paddingTop: 52, transition: 'background 0.2s' }}>

      {/* ── Hero banner ──────────────────────────────────────────────────────── */}
      <div style={{
        background: 'linear-gradient(135deg, #6366f1 0%, #14b8a6 100%)',
        padding: '52px 48px',
        display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', gap: 32,
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 540 }}>
          <h1 style={{ margin: 0, fontSize: 32, fontWeight: 800, color: '#ffffff', lineHeight: 1.2 }}>
            Welcome back, {displayName}! 🎯
          </h1>
          <p style={{ margin: 0, fontSize: 16, color: 'rgba(255,255,255,0.85)', lineHeight: 1.6 }}>
            Keep building your CS career — you're making great progress.
          </p>
          <div style={{ display: 'flex', gap: 12, marginTop: 4, flexWrap: 'wrap' }}>
            <HeroButton solid onClick={goToRoadmap}>Continue Learning →</HeroButton>
            <HeroButton onClick={goToRoadmap}>View Full Pathway</HeroButton>
          </div>
        </div>
        <div style={{
          width: 140, height: 140, borderRadius: '50%',
          background: darkMode ? '#1a1a2e' : '#ffffff',
          border: darkMode ? '3px solid rgba(255,255,255,0.10)' : '3px solid rgba(0,0,0,0.08)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <AvatarSVG character={avatar.character} color={avatar.color} size={112} />
        </div>
      </div>

      {/* ── Content ──────────────────────────────────────────────────────────── */}
      <div style={{ padding: '32px 48px', display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 1200, margin: '0 auto' }}>

        {/* Row 1 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 24 }}>

          {/* My Pathway */}
          <Card title="My Pathway" D={D}>
            {roadmap ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 20, fontWeight: 700, color: D.text, textTransform: 'capitalize' }}>
                    {roadmap.target_role}
                  </span>
                  {roadmap.pathway_type === 'skill_gap' ? (
                    <span style={{
                      padding: '3px 12px', borderRadius: 999,
                      background: 'rgba(20,184,166,0.15)', color: '#14b8a6',
                      fontSize: 12, fontWeight: 600,
                    }}>
                      Skill Boost
                    </span>
                  ) : roadmap.job_level ? (
                    <span style={{
                      padding: '3px 12px', borderRadius: 999,
                      background: 'rgba(99,102,241,0.15)', color: '#818cf8',
                      fontSize: 12, fontWeight: 600, textTransform: 'capitalize',
                    }}>
                      {roadmap.job_level}
                    </span>
                  ) : null}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 13, color: D.textMuted }}>
                      {completedCount} of {totalCount} steps completed
                    </span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#818cf8' }}>
                      {totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0}%
                    </span>
                  </div>
                  <div style={{ height: 8, borderRadius: 999, background: D.barBg, overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', borderRadius: 999,
                      background: 'linear-gradient(90deg, #6366f1, #14b8a6)',
                      width: `${totalCount > 0 ? (completedCount / totalCount) * 100 : 0}%`,
                      transition: 'width 0.5s ease',
                    }} />
                  </div>
                </div>
                <PillButton onClick={goToRoadmap}>Continue Learning →</PillButton>
              </>
            ) : (
              <>
                <p style={{ margin: 0, fontSize: 15, color: D.textSub }}>No pathway yet.</p>
                <PillButton onClick={() => navigate('/')}>Generate My Pathway</PillButton>
              </>
            )}
          </Card>

          {/* Quick Actions */}
          <Card title="Quick Actions" D={D}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <QuickAction D={D}
                icon="✦" iconBg="rgba(99,102,241,0.15)" iconColor="#818cf8"
                title="Generate New Pathway" sub="Start fresh"
                onClick={() => navigate('/')}
              />
              <QuickAction D={D}
                icon="✎" iconBg="rgba(20,184,166,0.15)" iconColor="#2dd4bf"
                title="Edit Profile" sub="Update your avatar and info"
                onClick={() => navigate('/profile')}
              />
              <QuickAction D={D}
                icon="◎" iconBg="rgba(6,182,212,0.15)" iconColor="#22d3ee"
                title="Explore Roles" sub="Browse CS career paths"
                onClick={() => navigate('/onboarding/experience')}
              />
            </div>
          </Card>
        </div>

        {/* Row 2 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>

          {/* Recent Progress */}
          <Card title="Recent Progress" D={D}>
            {recentCompleted.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {recentCompleted.map(s => (
                  <div key={s.step} style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '12px 14px', borderRadius: 12,
                    background: D.progGreen, border: `1px solid ${D.progBorder}`,
                  }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                      stroke={D.progText} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                      style={{ flexShrink: 0 }}>
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    <span style={{ fontSize: 14, fontWeight: 600, color: D.progText }}>{s.title}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ margin: 0, fontSize: 14, color: D.textSub }}>
                No steps completed yet — dive in!
              </p>
            )}
          </Card>

          {/* Next Up */}
          <Card title="Next Up" D={D}>
            {nextStep ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <span style={{ fontSize: 16, fontWeight: 700, color: D.text }}>{nextStep.title}</span>
                  {nextStep.description && (
                    <p style={{ margin: 0, fontSize: 14, color: D.textMuted, lineHeight: 1.55 }}>
                      {nextStep.description.length > 110
                        ? nextStep.description.slice(0, 110) + '…'
                        : nextStep.description}
                    </p>
                  )}
                  {(() => {
                    const rel = REL_BADGE[(nextStep.market_relevance ?? '').toLowerCase()]
                    return rel ? (
                      <span style={{
                        alignSelf: 'flex-start', padding: '3px 10px', borderRadius: 999,
                        background: rel.bg, color: rel.color, fontSize: 12, fontWeight: 600,
                      }}>{rel.label}</span>
                    ) : null
                  })()}
                </div>
                <PillButton onClick={goToRoadmap}>Start →</PillButton>
              </div>
            ) : roadmap ? (
              <p style={{ margin: 0, fontSize: 14, color: D.textSub }}>🎉 All steps completed — great work!</p>
            ) : (
              <p style={{ margin: 0, fontSize: 14, color: D.textSub }}>Generate a pathway to see your next step.</p>
            )}
          </Card>
        </div>

        {/* Skill Gap — only for role pathways */}
        {roadmap && roadmap.pathway_type !== 'skill_gap' && (
          <SkillGapCard
            targetRole={roadmap.target_role}
            currentSkills={roadmap.current_skills ?? []}
            steps={steps}
            completedSteps={progress}
            marketSkills={marketSkills}
            skillsLoading={skillsLoading}
            knownSkills={knownSkills}
            onKnownSkillsChange={saveKnownSkills}
            jobLevel={roadmap.job_level}
            userId={user?.id}
            D={D}
            darkMode={darkMode}
            navigate={navigate}
          />
        )}

        {/* Skill Boost notice — shown instead of skill gap for skill_gap pathways */}
        {roadmap && roadmap.pathway_type === 'skill_gap' && (
          <div style={{
            background: D.card, borderRadius: 16,
            padding: '24px 28px', border: D.border,
            boxShadow: D.shadow,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            gap: 24, flexWrap: 'wrap',
            transition: 'background 0.2s',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{
                width: 42, height: 42, borderRadius: 12, flexShrink: 0,
                background: 'rgba(20,184,166,0.12)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                  stroke="#14b8a6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                </svg>
              </div>
              <div>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: D.text }}>
                  This is a Skill Boost pathway
                </p>
                <p style={{ margin: '2px 0 0', fontSize: 13, color: D.textMuted }}>
                  Focused on filling your specific skill gaps for {roadmap.target_role}
                </p>
              </div>
            </div>
            <button
              onClick={switchToRolePathway}
              style={{
                padding: '10px 20px', borderRadius: 999, border: 'none',
                background: 'linear-gradient(90deg, #6366f1, #14b8a6)',
                color: '#ffffff', fontSize: 13, fontWeight: 700,
                cursor: 'pointer', fontFamily: FF, whiteSpace: 'nowrap',
                transition: 'opacity 0.15s',
              }}
              onMouseEnter={e => (e.currentTarget.style.opacity = '0.88')}
              onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
            >
              Switch to Role Pathway
            </button>
          </div>
        )}
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
      display: 'flex', flexDirection: 'column', gap: 18,
      transition: 'background 0.2s',
    }}>
      {title && <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: D.text }}>{title}</h2>}
      {children}
    </div>
  )
}

function PillButton({ onClick, children }) {
  return (
    <button
      onClick={onClick}
      style={{
        alignSelf: 'flex-start', padding: '10px 22px', borderRadius: 999,
        background: 'linear-gradient(90deg, #6366f1, #14b8a6)',
        color: '#ffffff', border: 'none', fontSize: 14, fontWeight: 700,
        cursor: 'pointer', fontFamily: FF,
      }}
      onMouseEnter={e => (e.currentTarget.style.opacity = '0.88')}
      onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
    >
      {children}
    </button>
  )
}

function HeroButton({ solid, onClick, children }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '11px 22px', borderRadius: 999,
        background: solid ? '#ffffff' : 'rgba(255,255,255,0.18)',
        color: solid ? '#4f46e5' : '#ffffff',
        border: solid ? 'none' : '1.5px solid rgba(255,255,255,0.5)',
        fontSize: 14, fontWeight: solid ? 700 : 600,
        cursor: 'pointer', fontFamily: FF,
      }}
      onMouseEnter={e => (e.currentTarget.style.opacity = '0.88')}
      onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
    >
      {children}
    </button>
  )
}

function QuickAction({ icon, iconBg, iconColor, title, sub, onClick, D }) {
  const [hovered, setHovered] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 14,
        padding: '11px 10px', borderRadius: 12,
        background: hovered ? D.hoverRow : 'transparent',
        border: 'none', cursor: 'pointer', textAlign: 'left',
        fontFamily: FF, transition: 'background 0.12s', width: '100%',
      }}
    >
      <div style={{
        width: 38, height: 38, borderRadius: 10,
        background: iconBg, color: iconColor,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 15, flexShrink: 0, fontWeight: 700,
      }}>
        {icon}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: D.text }}>{title}</span>
        <span style={{ fontSize: 12, color: D.textSub }}>{sub}</span>
      </div>
    </button>
  )
}
