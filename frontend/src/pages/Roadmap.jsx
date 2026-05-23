import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { useAuth } from '../lib/AuthContext'
import { useTheme } from '../lib/ThemeContext'
import { supabase } from '../lib/supabase'

// ── Layout constants ──────────────────────────────────────────────────────────
const FF       = 'system-ui, -apple-system, sans-serif'
const NODE_R   = 28      // node radius
const NODE_GAP = 240     // center-to-center horizontal spacing
const PAD_X    = 140     // left/right canvas padding
const STEM_H   = 58      // vertical stem from node edge to card edge
const CARD_W   = 188     // card width
const CARD_H   = 126     // card height (approximate, cards grow with content)
const TL_Y     = 260     // timeline Y within the canvas
const CANVAS_H = 520     // total canvas height

// Gradient cycles: indigo → teal → cyan → violet → repeat
const GRADS = [
  { id: 'g0', a: '#6366f1', b: '#14b8a6' },
  { id: 'g1', a: '#14b8a6', b: '#06b6d4' },
  { id: 'g2', a: '#06b6d4', b: '#8b5cf6' },
]

const RELEVANCE = {
  high:   { label: 'High Market Fit',   bg: '#dcfce7', color: '#15803d' },
  medium: { label: 'Medium Market Fit', bg: '#fef3c7', color: '#d97706' },
  low:    { label: 'Lower Priority',    bg: '#f3f4f6', color: '#6b7280' },
}

export default function Roadmap() {
  const { state } = useLocation()
  const navigate  = useNavigate()
  const { user, loading: authLoading } = useAuth()
  const { darkMode } = useTheme()

  const D = {
    bg:        darkMode ? '#0f0f1a' : '#ffffff',
    chip:      darkMode ? 'rgba(26,26,46,0.92)' : 'rgba(255,255,255,0.88)',
    chipText:  darkMode ? '#e2e8f0' : '#374151',
    chipBorder:darkMode ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.08)',
    stem:      darkMode ? '#3f3f5a' : '#d1d5db',
    timeline:  darkMode ? '#2a2a3e' : '#e5e7eb',
    card:      darkMode ? 'rgba(26,26,46,0.95)' : 'rgba(255,255,255,0.90)',
    cardBorder:darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
    cardDone:  darkMode ? 'rgba(34,197,94,0.22)' : 'rgba(34,197,94,0.28)',
    cardTitle: darkMode ? '#f1f5f9' : '#111827',
    cardDesc:  darkMode ? '#94a3b8' : '#6b7280',
    popup:     darkMode ? '#1a1a2e' : '#ffffff',
    popupText: darkMode ? '#f1f5f9' : '#111827',
    popupSub:  darkMode ? '#94a3b8' : '#6b7280',
    popupBorder:darkMode ? '#2a2a3e' : 'rgba(0,0,0,0.08)',
  }
  const [roadmapData,     setRoadmapData]     = useState(state ?? null)
  const [fetchingRoadmap, setFetchingRoadmap] = useState(!state)
  const [completed,       setCompleted]       = useState({})
  const [popupVisible,    setPopupVisible]    = useState(false)
  const [dismissed,       setDismissed]       = useState(false)

  // Log exactly what the page received so we can diagnose loading issues.
  useEffect(() => {
    console.log('[Roadmap] Mounted — location.state:', state)
    console.log('[Roadmap] Initial roadmapData:', roadmapData)
    console.log('[Roadmap] fetchingRoadmap:', !state, '| user:', user?.id ?? null)
  }, [])

  const steps       = roadmapData?.steps ?? []
  const roadmapId   = roadmapData?.roadmap_id
  const targetRole  = roadmapData?.target_role ?? roadmapData?.roadmap?.target_role ?? ''
  const jobLevel    = roadmapData?.job_level   ?? roadmapData?.roadmap?.job_level   ?? ''
  const pathwayType = roadmapData?.pathway_type ?? 'role'
  const n           = steps.length

  // Persist roadmap state so auth pages can navigate back here even if the
  // user arrived at /login or /signup without going through the popup.
  useEffect(() => {
    if (roadmapId) sessionStorage.setItem('pendingRoadmap', JSON.stringify(roadmapData))
  }, [roadmapId])

  useEffect(() => {
    if (!roadmapId) return
    axios.get(`http://localhost:8000/progress/${roadmapId}`)
      .then(res => {
        const rows = res.data?.progress ?? []
        const map = {}
        rows.forEach(row => { if (row.completed) map[row.step_number] = true })
        setCompleted(map)
      })
      .catch(() => {})
  }, [roadmapId])

  // Show save-prompt popup after 2s for anonymous users with a loaded roadmap.
  useEffect(() => {
    if (authLoading || user || !roadmapId || dismissed) return
    const t = setTimeout(() => setPopupVisible(true), 2000)
    return () => clearTimeout(t)
  }, [authLoading, user, roadmapId, dismissed])

  // Dismiss popup as soon as the user authenticates (covers logging in via
  // another tab, or returning to this page after completing auth).
  useEffect(() => {
    if (user) setPopupVisible(false)
  }, [user])

  // When the user switches pathways from the navbar dropdown while on /roadmap,
  // the navbar writes the new active pathway into sessionStorage and dispatches
  // this event.  Swap roadmap data immediately from that cache entry.
  useEffect(() => {
    if (!user?.id) return
    function onPathwayChanged() {
      try {
        const raw = sessionStorage.getItem(`pathwaycs-roadmap-${user.id}`)
        if (!raw) return
        const { data } = JSON.parse(raw)
        if (data?.id && data?.steps?.length) {
          setRoadmapData({
            steps:        data.steps,
            roadmap_id:   data.id,
            target_role:  data.target_role,
            job_level:    data.job_level,
            pathway_type: data.pathway_type ?? 'role',
          })
          setCompleted({})  // reset — progress fetch fires via roadmapId change
          setFetchingRoadmap(false)
        }
      } catch {}
    }
    window.addEventListener('pathwaycs:pathways-changed', onPathwayChanged)
    return () => window.removeEventListener('pathwaycs:pathways-changed', onPathwayChanged)
  }, [user?.id])

  // Fallback: if no roadmap was passed via location.state, load from the
  // Dashboard's sessionStorage cache first (instant), then fall back to Supabase.
  useEffect(() => {
    if (state) {
      console.log('[Roadmap] State provided — skipping fallback fetch. steps:', state?.steps?.length ?? 0)
      return
    }
    if (authLoading) return
    if (!user) {
      console.log('[Roadmap] No user — showing empty state')
      setFetchingRoadmap(false)
      return
    }

    // Fast path: use Dashboard's cached roadmap if available
    const cacheKey = `pathwaycs-roadmap-${user.id}`
    try {
      const raw = sessionStorage.getItem(cacheKey)
      if (raw) {
        const { data } = JSON.parse(raw)
        if (data?.steps?.length) {
          console.log('[Roadmap] Loaded from sessionStorage cache — steps:', data.steps.length)
          setRoadmapData({
            steps:        data.steps,
            roadmap_id:   data.id,
            target_role:  data.target_role,
            job_level:    data.job_level,
            pathway_type: data.pathway_type ?? 'role',
          })
          setFetchingRoadmap(false)
          return
        }
      }
    } catch {}

    // Slow path: cache miss — fetch from Supabase
    console.log('[Roadmap] No cache — fetching roadmap for user', user.id)
    async function fetchRoadmap() {
      try {
        // Prefer active pathway; fall back to most recent for pre-migration rows
        let { data: rows, error } = await supabase
          .from('roadmaps')
          .select('id, steps, target_role, job_level, pathway_type')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .limit(1)
        if (error) { console.error('[Roadmap] Fallback fetch error:', error.message) }
        if (!rows?.length) {
          const fb = await supabase
            .from('roadmaps')
            .select('id, steps, target_role, job_level, pathway_type')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(1)
          rows = fb.data
        }
        if (rows?.length) {
          const rm = rows[0]
          console.log('[Roadmap] Fallback fetch success — id:', rm.id, 'steps:', rm.steps?.length ?? 0)
          setRoadmapData({
            steps:        rm.steps,
            roadmap_id:   rm.id,
            target_role:  rm.target_role,
            job_level:    rm.job_level,
            pathway_type: rm.pathway_type ?? 'role',
          })
        } else {
          console.log('[Roadmap] Fallback fetch returned no rows for user', user.id)
        }
      } catch (err) {
        console.error('[Roadmap] Fallback fetch threw:', err?.message)
      }
      setFetchingRoadmap(false)
    }
    fetchRoadmap()
  }, [authLoading, user])

  // Canvas width: at least full viewport, expands for many steps
  const viewW   = typeof window !== 'undefined' ? window.innerWidth : 900
  const spanW   = Math.max(0, n - 1) * NODE_GAP
  const canvasW = Math.max(spanW + PAD_X * 2, viewW)
  const startX  = (canvasW - spanW) / 2   // first node x, centers span in canvas

  const nx = (i) => startX + i * NODE_GAP

  // ── Progress line geometry ────────────────────────────────────────────────
  const lineStart = n > 0 ? nx(0) - NODE_R : 0
  const lineEnd   = n > 0 ? nx(n - 1) + NODE_R : 0
  const totalLen  = lineEnd - lineStart

  const lastCompletedIdx = steps.reduce(
    (max, step, i) => (completed[step.step ?? i] ? i : max),
    -1,
  )
  const progressLen = lastCompletedIdx >= 0
    ? nx(lastCompletedIdx) - lineStart   // reaches center of last completed node
    : 0

  function openStep(step, i) {
    navigate(`/step/${roadmapId}/${step.step}`, {
      state: { step, roadmapId, completedSteps: completed, allSteps: steps, stepIndex: i, roadmapState: roadmapData },
    })
  }

  // ── Loading / empty states ────────────────────────────────────────────────
  console.log('[Roadmap] Render — fetchingRoadmap:', fetchingRoadmap, '| roadmap_id:', roadmapId, '| steps:', n)

  if (fetchingRoadmap) {
    return (
      <div style={{
        width: '100%', minHeight: '100vh', background: '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: FF,
      }}>
        <p style={{ color: '#6b7280', fontSize: 18, margin: 0 }}>Loading your pathway…</p>
      </div>
    )
  }

  if (!roadmapData || n === 0) {
    return (
      <div style={{
        width: '100%', minHeight: '100vh', background: '#fff',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 20,
        fontFamily: FF,
      }}>
        <p style={{ color: '#6b7280', fontSize: 18, margin: 0 }}>
          No pathway found — go back and generate one.
        </p>
        <button
          onClick={() => navigate('/')}
          style={{
            padding: '12px 28px', borderRadius: 999,
            background: 'linear-gradient(135deg, #6366f1, #14b8a6)',
            color: '#fff', border: 'none', fontSize: 15, fontWeight: 700,
            cursor: 'pointer', fontFamily: FF,
          }}
        >
          ← Back to Home
        </button>
      </div>
    )
  }

  return (
    <div style={{
      position: 'relative', width: '100vw', height: '100vh',
      background: D.bg, fontFamily: FF, overflow: 'hidden',
      transition: 'background 0.2s',
    }}>

      {/* ── Background blobs (same as landing page) ───────────────────────── */}
      <style>{`
        @keyframes blobPulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.4; }
        }
        @keyframes slideUp {
          from { transform: translateY(16px); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
      `}</style>
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
        <div style={{
          position: 'absolute', width: 420, height: 320,
          top: '30%', left: -60,
          borderRadius: '50%',
          background: 'rgba(99,102,241,0.7)',
          filter: 'blur(80px)',
          animation: 'blobPulse 4s ease-in-out infinite',
        }} />
        <div style={{
          position: 'absolute', width: 400, height: 280,
          top: -40, right: 40,
          borderRadius: '50%',
          background: 'rgba(20,184,166,0.75)',
          filter: 'blur(55px)',
          animation: 'blobPulse 5s ease-in-out 1s infinite',
        }} />
        <div style={{
          position: 'absolute', width: 300, height: 240,
          bottom: -30, right: -40,
          borderRadius: '50%',
          background: 'rgba(6,182,212,0.65)',
          filter: 'blur(65px)',
          animation: 'blobPulse 6s ease-in-out 2s infinite',
        }} />
      </div>

      {/* ── Role / level chip + type badge ───────────────────────────────── */}
      {(targetRole || jobLevel) && (
        <div style={{
          position: 'absolute', top: 66, left: '50%', transform: 'translateX(-50%)',
          zIndex: 50, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
        }}>
          <div style={{
            background: D.chip, backdropFilter: 'blur(8px)',
            border: `1px solid ${D.chipBorder}`,
            borderRadius: 999, padding: '6px 18px',
            fontSize: 13, fontWeight: 600, color: D.chipText,
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)', whiteSpace: 'nowrap',
          }}>
            {jobLevel && <span style={{ textTransform: 'capitalize' }}>{jobLevel} · </span>}
            <span style={{ textTransform: 'capitalize' }}>{targetRole}</span>
          </div>
          <div style={{
            padding: '3px 12px', borderRadius: 999,
            fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap',
            background: pathwayType === 'skill_gap'
              ? 'rgba(20,184,166,0.15)' : 'rgba(99,102,241,0.15)',
            color: pathwayType === 'skill_gap' ? '#14b8a6' : '#818cf8',
            border: `1px solid ${pathwayType === 'skill_gap' ? 'rgba(20,184,166,0.3)' : 'rgba(99,102,241,0.3)'}`,
          }}>
            {pathwayType === 'skill_gap' ? 'Skill Boost Pathway' : 'Career Pathway'}
          </div>
        </div>
      )}

      {/* ── Save-progress popup ───────────────────────────────────────────── */}
      {popupVisible && !user && (
        <div style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 200,
          width: 296, borderRadius: 16,
          boxShadow: '0 8px 36px rgba(0,0,0,0.28)',
          overflow: 'hidden', background: D.popup,
          border: `1px solid ${D.popupBorder}`,
          fontFamily: FF,
          animation: 'slideUp 0.4s cubic-bezier(0.34,1.56,0.64,1) forwards',
        }}>
          {/* Gradient accent bar */}
          <div style={{ height: 3, background: 'linear-gradient(90deg, #6366f1, #14b8a6)' }} />

          <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {/* Header row */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: D.popupText, lineHeight: 1.35 }}>
                💾 Would you like to save your progress?
              </span>
              <button
                onClick={() => { setPopupVisible(false); setDismissed(true) }}
                aria-label="Dismiss"
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  padding: '0 0 0 8px', color: '#9ca3af',
                  fontSize: 16, lineHeight: 1, flexShrink: 0,
                }}
              >
                ✕
              </button>
            </div>

            <p style={{ margin: 0, fontSize: 13, color: D.popupSub, lineHeight: 1.5 }}>
              Create a free account and pick up where you left off!
            </p>

            <div style={{ display: 'flex', gap: 8, marginTop: 2 }}>
              <button
                onClick={() => navigate('/signup', { state: { pendingRoadmap: roadmapData } })}
                style={{
                  flex: 1, padding: '9px 0', borderRadius: 999, border: 'none',
                  background: 'linear-gradient(90deg, #6366f1, #14b8a6)',
                  color: '#fff', fontSize: 13, fontWeight: 700,
                  cursor: 'pointer', fontFamily: FF,
                  transition: 'opacity 0.15s',
                }}
                onMouseEnter={e => (e.currentTarget.style.opacity = '0.88')}
                onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
              >
                Sign Up Free
              </button>
              <button
                onClick={() => navigate('/login', { state: { pendingRoadmap: roadmapData } })}
                style={{
                  flex: 1, padding: '9px 0', borderRadius: 999,
                  border: '1.5px solid #e5e7eb', background: '#fff',
                  color: '#374151', fontSize: 13, fontWeight: 600,
                  cursor: 'pointer', fontFamily: FF,
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = '#f9fafb')}
                onMouseLeave={e => (e.currentTarget.style.background = '#fff')}
              >
                Log In
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Horizontal scroll container ───────────────────────────────────── */}
      <div style={{
        position: 'absolute', top: 52, left: 0, right: 0, bottom: 0, zIndex: 1,
        overflowX: 'auto', overflowY: 'hidden',
        display: 'flex', alignItems: 'center',
      }}>
        {/* ── Canvas ──────────────────────────────────────────────────────── */}
        <div style={{
          position: 'relative',
          width: canvasW, height: CANVAS_H,
          flexShrink: 0,
        }}>

          {/* ── SVG: timeline line, stems, nodes ────────────────────────── */}
          <svg
            width={canvasW} height={CANVAS_H}
            style={{ position: 'absolute', top: 0, left: 0, overflow: 'visible' }}
          >
            <defs>
              {/* Node gradient cycle */}
              {GRADS.map(g => (
                <linearGradient key={g.id} id={g.id} x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor={g.a} />
                  <stop offset="100%" stopColor={g.b} />
                </linearGradient>
              ))}
              {/* Node drop shadow */}
              <filter id="ns" x="-40%" y="-40%" width="180%" height="180%">
                <feDropShadow dx="0" dy="4" stdDeviation="7" floodColor="rgba(0,0,0,0.16)" />
              </filter>
              {/* Green glow for completed nodes — gaussian blur on a solid green circle */}
              <filter id="glow" x="-80%" y="-80%" width="260%" height="260%">
                <feGaussianBlur stdDeviation="9" />
              </filter>
              {/* Progress line gradient — mapped to absolute coords so color position is fixed */}
              <linearGradient id="progressGrad" gradientUnits="userSpaceOnUse"
                x1={lineStart} y1={TL_Y} x2={lineEnd} y2={TL_Y}>
                <stop offset="0%"   stopColor="#6366f1" />
                <stop offset="100%" stopColor="#14b8a6" />
              </linearGradient>
            </defs>

            {/* Base timeline — full width */}
            <line
              x1={lineStart} y1={TL_Y}
              x2={lineEnd}   y2={TL_Y}
              stroke={D.timeline} strokeWidth={3} strokeLinecap="round"
            />
            {/* Progress line — grows left-to-right via stroke-dashoffset */}
            <line
              x1={lineStart} y1={TL_Y}
              x2={lineEnd}   y2={TL_Y}
              stroke="url(#progressGrad)"
              strokeWidth={3}
              strokeLinecap="round"
              strokeDasharray={totalLen}
              strokeDashoffset={totalLen - progressLen}
              style={{ transition: 'stroke-dashoffset 0.6s ease' }}
            />

            {/* Vertical stems */}
            {steps.map((_, i) => {
              const cx    = nx(i)
              const above = i % 2 === 0   // 1-indexed: step 1,3,5… above
              return (
                <line key={i}
                  x1={cx} y1={above ? TL_Y - NODE_R : TL_Y + NODE_R}
                  x2={cx} y2={above ? TL_Y - NODE_R - STEM_H : TL_Y + NODE_R + STEM_H}
                  stroke={D.stem} strokeWidth={2} strokeLinecap="round"
                />
              )
            })}

            {/* Nodes */}
            {steps.map((step, i) => {
              const cx   = nx(i)
              const done = !!completed[step.step ?? i]
              const gId  = GRADS[i % GRADS.length].id
              return (
                <g key={i} style={{ cursor: 'pointer' }} onClick={() => openStep(step, i)}>
                  {/* Green glow — blurred circle rendered behind the node */}
                  <circle cx={cx} cy={TL_Y} r={NODE_R + 10}
                    fill="#22c55e" filter="url(#glow)"
                    style={{ opacity: done ? 0.55 : 0, transition: 'opacity 0.55s ease' }}
                  />
                  {/* Shadow halo — present when incomplete, fades out when done */}
                  <circle cx={cx} cy={TL_Y} r={NODE_R + 6}
                    fill="white" filter="url(#ns)"
                    style={{ opacity: done ? 0 : 1, transition: 'opacity 0.55s ease' }}
                  />
                  {/* Gradient fill — incomplete state */}
                  <circle cx={cx} cy={TL_Y} r={NODE_R}
                    fill={`url(#${gId})`}
                    style={{ opacity: done ? 0 : 1, transition: 'opacity 0.55s ease' }}
                  />
                  {/* Solid green fill — complete state */}
                  <circle cx={cx} cy={TL_Y} r={NODE_R}
                    fill="#22c55e"
                    style={{ opacity: done ? 1 : 0, transition: 'opacity 0.55s ease' }}
                  />
                  {/* Inner highlight */}
                  <circle cx={cx} cy={TL_Y - NODE_R * 0.28} r={NODE_R * 0.52}
                    fill="rgba(255,255,255,0.14)"
                  />
                  {/* Step number — fades out as node completes */}
                  <text x={cx} y={TL_Y + 1}
                    textAnchor="middle" dominantBaseline="middle"
                    fontSize={13} fontWeight="800" fill="#fff" fontFamily={FF}
                    style={{ opacity: done ? 0 : 1, transition: 'opacity 0.3s ease' }}>
                    {step.step ?? i + 1}
                  </text>
                  {/* SVG checkmark — fades in after the green fill settles */}
                  <polyline
                    points={`${cx - 8},${TL_Y + 1} ${cx - 2},${TL_Y + 7} ${cx + 9},${TL_Y - 6}`}
                    stroke="white" strokeWidth="2.5"
                    strokeLinecap="round" strokeLinejoin="round"
                    fill="none"
                    style={{ opacity: done ? 1 : 0, transition: 'opacity 0.3s ease 0.2s' }}
                  />
                </g>
              )
            })}
          </svg>

          {/* ── HTML cards ──────────────────────────────────────────────── */}
          {steps.map((step, i) => {
            const cx       = nx(i)
            const above    = i % 2 === 0
            const cardLeft = cx - CARD_W / 2
            const cardTop  = above
              ? TL_Y - NODE_R - STEM_H - CARD_H
              : TL_Y + NODE_R + STEM_H

            const rel      = (step.market_relevance ?? '').toLowerCase()
            const relStyle = RELEVANCE[rel]
            const done     = !!completed[step.step ?? i]

            return (
              <div
                key={i}
                onClick={() => openStep(step, i)}
                style={{
                  position: 'absolute',
                  top: cardTop,
                  left: cardLeft,
                  width: CARD_W,
                  background: D.card,
                  backdropFilter: 'blur(12px)',
                  border: `1.5px solid ${done ? D.cardDone : D.cardBorder}`,
                  borderRadius: 14,
                  padding: '12px 14px',
                  boxSizing: 'border-box',
                  boxShadow: '0 4px 18px rgba(0,0,0,0.09)',
                  cursor: 'pointer',
                  display: 'flex', flexDirection: 'column', gap: 6,
                  userSelect: 'none', fontFamily: FF,
                  transition: 'box-shadow 0.15s, transform 0.15s',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.boxShadow = '0 8px 26px rgba(0,0,0,0.14)'
                  e.currentTarget.style.transform = above ? 'translateY(-3px)' : 'translateY(3px)'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.boxShadow = '0 4px 18px rgba(0,0,0,0.09)'
                  e.currentTarget.style.transform = 'translateY(0)'
                }}
              >
                {/* Title */}
                <div style={{
                  fontSize: 13, fontWeight: 700, color: D.cardTitle,
                  lineHeight: 1.35,
                  overflow: 'hidden',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                }}>
                  {step.title}
                </div>

                {/* Description — 2-line clamp */}
                {step.description && (
                  <div style={{
                    fontSize: 11, color: D.cardDesc, lineHeight: 1.5,
                    overflow: 'hidden',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                  }}>
                    {step.description}
                  </div>
                )}

                {/* Market relevance badge */}
                {relStyle && (
                  <span style={{
                    alignSelf: 'flex-start',
                    fontSize: 10, fontWeight: 600,
                    padding: '2px 8px', borderRadius: 999,
                    background: relStyle.bg, color: relStyle.color,
                    marginTop: 2,
                  }}>
                    {relStyle.label}
                  </span>
                )}
              </div>
            )
          })}

        </div>
      </div>
    </div>
  )
}
