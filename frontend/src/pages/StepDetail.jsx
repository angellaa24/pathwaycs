import { useState, useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { useTheme } from '../lib/ThemeContext'

const FF = 'system-ui, -apple-system, sans-serif'

// ── Theme tokens ───────────────────────────────────────────────────────────────
const LIGHT = {
  bg:              '#ffffff',
  headerBg:        'rgba(255,255,255,0.92)',
  border:          'rgba(0,0,0,0.08)',
  text:            '#111827',
  textMuted:       '#6b7280',
  textSubtle:      '#9ca3af',
  sectionLabel:    '#9ca3af',
  backBg:          'rgba(0,0,0,0.05)',
  backBorder:      'rgba(0,0,0,0.10)',
  backColor:       '#374151',
  indigoBg:        'rgba(99,102,241,0.06)',
  indigoBorder:    'rgba(99,102,241,0.18)',
  indigoText:      '#3730a3',
  grayBg:          '#f8fafc',
  grayBorder:      'rgba(0,0,0,0.07)',
  resourceIcon:    'rgba(99,102,241,0.10)',
  resourceIconFg:  '#6366f1',
  resourceLink:    '#4f46e5',
  resourceSub:     '#9ca3af',
  resourceLabel:   '#374151',
  tealBg:          'rgba(20,184,166,0.07)',
  tealBorder:      'rgba(20,184,166,0.22)',
  tealIcon:        'rgba(20,184,166,0.15)',
  tealIconFg:      '#0f766e',
  tealText:        '#115e59',
  nextBg:          '#f8fafc',
  timeBg:          '#f3f4f6',
  chatBg:          '#ffffff',
  chatArea:        '#f8fafc',
  chatBorder:      'rgba(0,0,0,0.08)',
  aiBubble:        '#f0f0f5',
  chipBg:          'rgba(99,102,241,0.08)',
  chipBorder:      'rgba(99,102,241,0.18)',
  chipText:        '#4f46e5',
  inputBg:         '#f9fafb',
  inputBorder:     '#e5e7eb',
}

const DARK = {
  bg:              '#0f172a',
  headerBg:        'rgba(15,23,42,0.92)',
  border:          'rgba(255,255,255,0.08)',
  text:            '#f1f5f9',
  textMuted:       '#94a3b8',
  textSubtle:      '#475569',
  sectionLabel:    '#475569',
  backBg:          'rgba(255,255,255,0.06)',
  backBorder:      'rgba(255,255,255,0.10)',
  backColor:       '#e2e8f0',
  indigoBg:        'rgba(99,102,241,0.12)',
  indigoBorder:    'rgba(99,102,241,0.25)',
  indigoText:      '#a5b4fc',
  grayBg:          'rgba(255,255,255,0.04)',
  grayBorder:      'rgba(255,255,255,0.07)',
  resourceIcon:    'rgba(99,102,241,0.18)',
  resourceIconFg:  '#818cf8',
  resourceLink:    '#818cf8',
  resourceSub:     '#475569',
  resourceLabel:   '#cbd5e1',
  tealBg:          'rgba(20,184,166,0.10)',
  tealBorder:      'rgba(20,184,166,0.22)',
  tealIcon:        'rgba(20,184,166,0.20)',
  tealIconFg:      '#2dd4bf',
  tealText:        '#99f6e4',
  nextBg:          'rgba(255,255,255,0.04)',
  timeBg:          'rgba(255,255,255,0.07)',
  chatBg:          '#1a1a2e',
  chatArea:        '#0f172a',
  chatBorder:      'rgba(255,255,255,0.08)',
  aiBubble:        'rgba(255,255,255,0.08)',
  chipBg:          'rgba(99,102,241,0.18)',
  chipBorder:      'rgba(99,102,241,0.30)',
  chipText:        '#a5b4fc',
  inputBg:         '#0f172a',
  inputBorder:     'rgba(255,255,255,0.12)',
}

// ── Market relevance metadata ──────────────────────────────────────────────────
const REL = {
  high:   { label: 'High Market Fit',   time: '~3 weeks', badgeBg: '#dcfce7', badgeColor: '#15803d' },
  medium: { label: 'Medium Market Fit', time: '~2 weeks', badgeBg: '#fef3c7', badgeColor: '#d97706' },
  low:    { label: 'Lower Priority',    time: '~1 week',  badgeBg: '#f3f4f6', badgeColor: '#6b7280' },
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function getDomain(url) {
  try { return new URL(url).hostname.replace(/^www\./, '') }
  catch { return url }
}

function buildProject(title) {
  const t = (title ?? '').toLowerCase()
  if (/\bapi\b/.test(t))                     return `Build a REST API using ${title} concepts — add proper error handling and test it with a tool like Postman.`
  if (/react|vue|angular|svelte/.test(t))    return `Create a small interactive UI with ${title} and deploy it to Vercel or Netlify.`
  if (/sql|database|postgres|mongo/.test(t)) return `Design a schema for a real-world app using ${title} and build a simple CRUD interface on top.`
  if (/algorithm|sort|search|tree/.test(t))  return `Implement the core ${title} algorithms, write tests for each, and benchmark them on real data.`
  if (/test|jest|cypress|vitest/.test(t))    return `Retrofit a test suite using ${title} onto one of your existing projects and aim for 80% coverage.`
  if (/css|tailwind|style|design/.test(t))   return `Clone a real product's landing page using ${title} — focus on responsiveness and pixel accuracy.`
  if (/git|version|ci|deploy/.test(t))       return `Set up a ${title} workflow for a project: branching strategy, automated checks, and a clean README.`
  if (/docker|container|k8s|cloud/.test(t))  return `Containerize a small app using ${title} and make it reproducible with a single command.`
  if (/auth|security|oauth|jwt/.test(t))     return `Add ${title} to a small app — implement login, token refresh, and protected routes end-to-end.`
  const opts = [
    `Build a small working project using ${title} and document your process in a public GitHub README.`,
    `Implement ${title} in a side project that solves a problem you personally care about.`,
    `Create a portfolio piece demonstrating ${title} — keep it scoped, ship it, and share the link.`,
  ]
  return opts[title.length % opts.length]
}

// ── Section header ─────────────────────────────────────────────────────────────
function SectionHead({ label, T }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
      <span style={{
        fontSize: 11, fontWeight: 700, letterSpacing: '0.08em',
        textTransform: 'uppercase', color: T.sectionLabel, whiteSpace: 'nowrap',
      }}>
        {label}
      </span>
      <div style={{ flex: 1, height: 1, background: T.border }} />
    </div>
  )
}

// ── Component ──────────────────────────────────────────────────────────────────
export default function StepDetail() {
  const { state } = useLocation()
  const navigate  = useNavigate()

  const step           = state?.step
  const roadmapId      = state?.roadmapId
  const completedSteps = state?.completedSteps ?? {}
  const allSteps       = state?.allSteps       ?? []
  const stepIndex      = state?.stepIndex      ?? 0
  const roadmapState   = state?.roadmapState

  const { darkMode: dark, toggleDarkMode } = useTheme()
  const [localCompleted, setLocalCompleted] = useState(() => ({ ...completedSteps }))
  const [marking,       setMarking]       = useState(false)
  const [celebrating,   setCelebrating]   = useState(false)
  const [error,         setError]         = useState(null)

  const [chatMessages,  setChatMessages]  = useState([])
  const [chatInput,     setChatInput]     = useState('')
  const [chatLoading,   setChatLoading]   = useState(false)
  const scrollAnchorRef = useRef(null)
  const chatInputRef    = useRef(null)

  useEffect(() => {
    scrollAnchorRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages, chatLoading])

  async function sendChatMessage(overrideText) {
    const text = (overrideText !== undefined ? overrideText : chatInput).trim()
    if (!text || chatLoading) return
    setChatInput('')
    const userMsg = { role: 'user', content: text, ts: Date.now() }
    setChatMessages(prev => [...prev, userMsg])
    setChatLoading(true)
    try {
      const history = chatMessages.map(m => ({ role: m.role, content: m.content }))
      const res = await axios.post('http://localhost:8000/chat', {
        message: text,
        step_title: step?.title ?? '',
        step_description: step?.description ?? '',
        history,
      })
      setChatMessages(prev => [...prev, { role: 'assistant', content: res.data.reply, ts: Date.now() }])
    } catch {
      setChatMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, something went wrong. Please try again.',
        ts: Date.now(),
        error: true,
      }])
    }
    setChatLoading(false)
  }

  const done = !!localCompleted[step?.step]

  // Always sync from Supabase when this step is viewed so the button reflects real state.
  useEffect(() => {
    if (!roadmapId) return
    axios.get(`http://localhost:8000/progress/${roadmapId}`)
      .then(res => {
        const rows = res.data?.progress ?? []
        const map = {}
        rows.forEach(row => { if (row.completed) map[row.step_number] = true })
        setLocalCompleted(map)
      })
      .catch(() => {})
  }, [roadmapId, step?.step])

  const T       = dark ? DARK : LIGHT
  const rel     = (step?.market_relevance ?? '').toLowerCase()
  const relMeta = REL[rel] ?? null
  const total   = allSteps.length
  const hasNext = stepIndex < total - 1

  async function markComplete() {
    if (done || marking || celebrating) return
    setMarking(true)
    setError(null)
    try {
      await axios.post(`http://localhost:8000/progress/${roadmapId}/${step.step}`)
      // Re-fetch from Supabase so localCompleted reflects the real persisted state.
      const res = await axios.get(`http://localhost:8000/progress/${roadmapId}`)
      const rows = res.data?.progress ?? []
      const map = {}
      rows.forEach(row => { if (row.completed) map[row.step_number] = true })
      setLocalCompleted(map)
      setMarking(false)
      setCelebrating(true)
      setTimeout(() => setCelebrating(false), 1700)
    } catch (err) {
      console.error('[mark-complete]', err.response?.data || err.message)
      setError('Failed to save progress. Please try again.')
      setMarking(false)
    }
  }

  function goBack() {
    navigate('/roadmap', { state: roadmapState })
  }

  function goToNext() {
    if (!hasNext) return
    const next = allSteps[stepIndex + 1]
    navigate(`/step/${roadmapId}/${next.step}`, {
      state: { step: next, roadmapId, completedSteps: localCompleted, allSteps, stepIndex: stepIndex + 1, roadmapState },
    })
  }

  // ── Not found ──────────────────────────────────────────────────────────────
  if (!step) {
    return (
      <div style={{
        width: '100%', minHeight: '100vh', background: '#fff',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 16,
        fontFamily: FF,
      }}>
        <p style={{ color: '#6b7280', fontSize: 17, margin: 0 }}>Step not found.</p>
        <button onClick={() => goBack()} style={{
          background: 'none', border: 'none', fontSize: 15,
          color: '#6b7280', cursor: 'pointer', fontFamily: FF,
        }}>← Go back</button>
      </div>
    )
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{
      width: '100vw', minHeight: '100vh',
      background: T.bg, color: T.text,
      fontFamily: FF, boxSizing: 'border-box',
      transition: 'background 0.22s, color 0.22s',
    }}>

      {/* ── Keyframes ───────────────────────────────────────────────────── */}
      <style>{`
        @keyframes celebratePop {
          0%   { transform: scale(0.3); opacity: 0; }
          55%  { transform: scale(1.18); opacity: 1; }
          75%  { transform: scale(0.94); }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes checkDraw {
          from { stroke-dashoffset: 36; }
          to   { stroke-dashoffset: 0; }
        }
        @keyframes celebrateFade {
          0%   { opacity: 1; }
          100% { opacity: 0; transform: translateY(-6px); }
        }
        @keyframes typingBlink {
          0%, 80%, 100% { opacity: 0.2; transform: translateY(0); }
          40%            { opacity: 1;   transform: translateY(-3px); }
        }
      `}</style>

      {/* ── Sticky header ───────────────────────────────────────────────── */}
      <div style={{
        position: 'sticky', top: 52, zIndex: 30,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 24px',
        background: T.headerBg,
        backdropFilter: 'blur(14px)',
        borderBottom: `1px solid ${T.border}`,
        transition: 'background 0.22s, border-color 0.22s',
      }}>
        {/* Back button */}
        <button
          onClick={() => goBack()}
          aria-label="Back to pathway"
          style={{
            display: 'flex', alignItems: 'center', gap: 7,
            background: T.backBg, border: `1px solid ${T.backBorder}`,
            borderRadius: 999, padding: '7px 14px 7px 10px',
            cursor: 'pointer', color: T.backColor,
            fontSize: 13, fontWeight: 500, fontFamily: FF,
            transition: 'background 0.15s',
          }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          Back to Pathway
        </button>

        {/* Step X of Y */}
        {total > 0 && (
          <span style={{ fontSize: 13, fontWeight: 500, color: T.textMuted }}>
            Step {step.step ?? stepIndex + 1} of {total}
          </span>
        )}

        {/* Dark mode toggle */}
        <button
          onClick={toggleDarkMode}
          aria-label="Toggle dark mode"
          style={{
            width: 36, height: 36, borderRadius: '50%',
            background: T.backBg, border: `1px solid ${T.backBorder}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: T.backColor,
            transition: 'background 0.15s',
            flexShrink: 0,
          }}
        >
          {dark ? (
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="12" cy="12" r="5"/>
              <line x1="12" y1="1"  x2="12" y2="3"/>   <line x1="12" y1="21" x2="12" y2="23"/>
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
              <line x1="1" y1="12" x2="3" y2="12"/>    <line x1="21" y1="12" x2="23" y2="12"/>
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
            </svg>
          ) : (
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
            </svg>
          )}
        </button>
      </div>

      {/* ── Page content ────────────────────────────────────────────────── */}
      <div style={{
        maxWidth: 680, margin: '0 auto',
        padding: '40px 24px 100px',
        display: 'flex', flexDirection: 'column', gap: 32,
      }}>

        {/* ── Hero badges ───────────────────────────────────────────────── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {/* Step number circle */}
          <div style={{
            width: 46, height: 46, borderRadius: '50%', flexShrink: 0,
            background: done
              ? 'linear-gradient(135deg, #22c55e, #15803d)'
              : 'linear-gradient(135deg, #6366f1, #14b8a6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16, fontWeight: 800, color: '#fff',
            boxShadow: done
              ? '0 2px 12px rgba(34,197,94,0.35)'
              : '0 2px 12px rgba(99,102,241,0.30)',
            transition: 'background 0.3s, box-shadow 0.3s',
          }}>
            {done ? '✓' : (step.step ?? stepIndex + 1)}
          </div>

          {/* Market relevance */}
          {relMeta && (
            <span style={{
              fontSize: 12, fontWeight: 600, padding: '5px 12px',
              borderRadius: 999, background: relMeta.badgeBg, color: relMeta.badgeColor,
            }}>
              {relMeta.label}
            </span>
          )}

          {/* Estimated time */}
          {relMeta && (
            <span style={{
              fontSize: 12, fontWeight: 500, padding: '5px 11px',
              borderRadius: 999, background: T.timeBg, color: T.textMuted,
              display: 'inline-flex', alignItems: 'center', gap: 5,
              transition: 'background 0.22s',
            }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12 6 12 12 16 14"/>
              </svg>
              {relMeta.time}
            </span>
          )}
        </div>

        {/* ── Title ─────────────────────────────────────────────────────── */}
        <h1 style={{
          margin: 0, fontSize: 'clamp(22px, 4vw, 30px)', fontWeight: 800,
          color: T.text, lineHeight: 1.25,
          transition: 'color 0.22s',
        }}>
          {step.title}
        </h1>

        {/* ── Section 1: Why This Matters ───────────────────────────────── */}
        <section>
          <SectionHead label="Why This Matters" T={T} />
          <div style={{
            background: T.indigoBg,
            border: `1.5px solid ${T.indigoBorder}`,
            borderRadius: 16, padding: '22px 24px',
            transition: 'background 0.22s, border-color 0.22s',
          }}>
            <p style={{
              margin: 0, fontSize: 15, lineHeight: 1.85,
              color: T.indigoText,
              transition: 'color 0.22s',
            }}>
              {step.description}
            </p>
          </div>
        </section>

        {/* ── Section 2: Resources ──────────────────────────────────────── */}
        {step.resources?.length > 0 && (
          <section>
            <SectionHead label="Resources" T={T} />
            <div style={{
              background: T.grayBg,
              border: `1.5px solid ${T.grayBorder}`,
              borderRadius: 16, overflow: 'hidden',
              transition: 'background 0.22s, border-color 0.22s',
            }}>
              {step.resources.map((r, i) => {
                const isUrl  = r.startsWith('http')
                const domain = isUrl ? getDomain(r) : r
                const isLast = i === step.resources.length - 1
                return (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: 14,
                    padding: '14px 20px',
                    borderBottom: isLast ? 'none' : `1px solid ${T.border}`,
                    transition: 'border-color 0.22s',
                  }}>
                    {/* Arrow icon chip */}
                    <div style={{
                      width: 30, height: 30, borderRadius: 8, flexShrink: 0,
                      background: T.resourceIcon,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'background 0.22s',
                    }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                        stroke={T.resourceIconFg} strokeWidth="2.5"
                        strokeLinecap="round" strokeLinejoin="round">
                        <line x1="5" y1="12" x2="19" y2="12"/>
                        <polyline points="12 5 19 12 12 19"/>
                      </svg>
                    </div>

                    {/* Label + URL */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                      {isUrl ? (
                        <a href={r} target="_blank" rel="noreferrer" style={{
                          fontSize: 14, fontWeight: 600, color: T.resourceLink,
                          textDecoration: 'none',
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          transition: 'color 0.22s',
                        }}>
                          {domain}
                        </a>
                      ) : (
                        <span style={{
                          fontSize: 14, fontWeight: 600, color: T.resourceLabel,
                          transition: 'color 0.22s',
                        }}>
                          {domain}
                        </span>
                      )}
                      {isUrl && (
                        <span style={{
                          fontSize: 11, color: T.resourceSub,
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          transition: 'color 0.22s',
                        }}>
                          {r.length > 64 ? r.slice(0, 64) + '…' : r}
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* ── Section 3: Mini Project ───────────────────────────────────── */}
        <section>
          <SectionHead label="Mini Project" T={T} />
          <div style={{
            background: T.tealBg,
            border: `1.5px solid ${T.tealBorder}`,
            borderRadius: 16, padding: '22px 24px',
            display: 'flex', gap: 16, alignItems: 'flex-start',
            transition: 'background 0.22s, border-color 0.22s',
          }}>
            {/* Lightbulb icon */}
            <div style={{
              width: 38, height: 38, borderRadius: 10, flexShrink: 0,
              background: T.tealIcon,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginTop: 2,
              transition: 'background 0.22s',
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                stroke={T.tealIconFg} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="9" y1="18" x2="15" y2="18"/>
                <line x1="10" y1="22" x2="14" y2="22"/>
                <path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14"/>
              </svg>
            </div>
            <p style={{
              margin: 0, fontSize: 15, lineHeight: 1.8,
              color: T.tealText,
              transition: 'color 0.22s',
            }}>
              {buildProject(step.title ?? '')}
            </p>
          </div>
        </section>

        {/* ── Section 4: Ask AI Tutor ──────────────────────────────────── */}
        <section>
          <SectionHead label="Ask AI Tutor" T={T} />
          <div style={{
            background: T.chatBg,
            border: `1.5px solid ${T.chatBorder}`,
            borderRadius: 16, overflow: 'hidden',
            transition: 'background 0.22s, border-color 0.22s',
          }}>

            {/* Messages area */}
            <div style={{
              height: 320, overflowY: 'auto',
              padding: '16px 16px 8px',
              background: T.chatArea,
              display: 'flex', flexDirection: 'column', gap: 12,
              transition: 'background 0.22s',
            }}>
              {chatMessages.length === 0 && (
                <div style={{
                  flex: 1, display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center', gap: 10,
                  opacity: 0.7,
                }}>
                  <div style={{
                    width: 48, height: 48, borderRadius: '50%',
                    background: T.chipBg,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill={T.chipText}>
                      <path d="M12 1l2.753 8.472h8.916l-7.209 5.237 2.753 8.472L12 18.944l-7.213 5.237 2.753-8.472L.327 10.472h8.916z"/>
                    </svg>
                  </div>
                  <p style={{ margin: 0, fontSize: 14, color: T.textMuted, textAlign: 'center', lineHeight: 1.5 }}>
                    Ask me anything about <strong style={{ color: T.text }}>{step.title}</strong>
                  </p>
                </div>
              )}

              {chatMessages.map((msg, i) => (
                <div key={i} style={{
                  display: 'flex',
                  flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
                  gap: 8, alignItems: 'flex-start',
                }}>
                  {msg.role === 'assistant' && (
                    <div style={{
                      width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                      background: 'rgba(99,102,241,0.18)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      marginTop: 2,
                    }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="#818cf8">
                        <path d="M12 1l2.753 8.472h8.916l-7.209 5.237 2.753 8.472L12 18.944l-7.213 5.237 2.753-8.472L.327 10.472h8.916z"/>
                      </svg>
                    </div>
                  )}
                  <div style={{ maxWidth: '78%', display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <div style={{
                      padding: '10px 14px',
                      borderRadius: msg.role === 'user' ? '18px 4px 18px 18px' : '4px 18px 18px 18px',
                      background: msg.role === 'user' ? '#6366f1' : T.aiBubble,
                      color: msg.role === 'user' ? '#ffffff' : (msg.error ? '#ef4444' : T.text),
                      fontSize: 14, lineHeight: 1.65,
                      transition: 'background 0.22s, color 0.22s',
                      whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                    }}>
                      {msg.content}
                    </div>
                    <span style={{
                      fontSize: 11, color: T.textSubtle,
                      textAlign: msg.role === 'user' ? 'right' : 'left',
                      transition: 'color 0.22s',
                    }}>
                      {new Date(msg.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              ))}

              {chatLoading && (
                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                    background: 'rgba(99,102,241,0.18)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="#818cf8">
                      <path d="M12 1l2.753 8.472h8.916l-7.209 5.237 2.753 8.472L12 18.944l-7.213 5.237 2.753-8.472L.327 10.472h8.916z"/>
                    </svg>
                  </div>
                  <div style={{
                    padding: '12px 16px', borderRadius: '4px 18px 18px 18px',
                    background: T.aiBubble, display: 'flex', gap: 5, alignItems: 'center',
                    transition: 'background 0.22s',
                  }}>
                    {[0, 160, 320].map(delay => (
                      <span key={delay} style={{
                        width: 7, height: 7, borderRadius: '50%',
                        background: '#818cf8', display: 'inline-block',
                        animation: `typingBlink 1.1s ${delay}ms ease-in-out infinite`,
                      }} />
                    ))}
                  </div>
                </div>
              )}

              <div ref={scrollAnchorRef} />
            </div>

            {/* Starter chips — visible only when chat is empty */}
            {chatMessages.length === 0 && !chatLoading && (
              <div style={{
                padding: '10px 14px',
                borderTop: `1px solid ${T.chatBorder}`,
                display: 'flex', gap: 8, flexWrap: 'wrap',
                transition: 'border-color 0.22s',
              }}>
                {[
                  'Explain this in simpler terms',
                  'Give me a project idea',
                  'What jobs use this skill?',
                ].map(prompt => (
                  <button
                    key={prompt}
                    onClick={() => sendChatMessage(prompt)}
                    style={{
                      padding: '6px 13px', borderRadius: 999, cursor: 'pointer',
                      background: T.chipBg, border: `1px solid ${T.chipBorder}`,
                      color: T.chipText, fontSize: 12, fontWeight: 600, fontFamily: FF,
                      transition: 'opacity 0.15s, background 0.22s, border-color 0.22s, color 0.22s',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.opacity = '0.75')}
                    onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            )}

            {/* Input area */}
            <div style={{
              padding: '12px 14px',
              borderTop: `1px solid ${T.chatBorder}`,
              display: 'flex', gap: 10, alignItems: 'center',
              transition: 'border-color 0.22s',
            }}>
              <input
                ref={chatInputRef}
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChatMessage() }
                }}
                placeholder="Ask anything about this step… e.g. 'Can you explain this in simpler terms?'"
                disabled={chatLoading}
                style={{
                  flex: 1, padding: '10px 14px', borderRadius: 10,
                  background: T.inputBg, border: `1px solid ${T.inputBorder}`,
                  color: T.text, fontSize: 14, fontFamily: FF, outline: 'none',
                  transition: 'background 0.22s, border-color 0.22s, color 0.22s',
                  opacity: chatLoading ? 0.6 : 1,
                }}
              />
              <button
                onClick={() => sendChatMessage()}
                disabled={chatLoading || !chatInput.trim()}
                style={{
                  width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
                  background: chatLoading || !chatInput.trim()
                    ? T.aiBubble
                    : 'linear-gradient(135deg, #6366f1, #14b8a6)',
                  border: 'none', cursor: chatLoading || !chatInput.trim() ? 'default' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'background 0.22s, opacity 0.15s',
                }}
                onMouseEnter={e => { if (!chatLoading && chatInput.trim()) e.currentTarget.style.opacity = '0.85' }}
                onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
                  stroke={chatLoading || !chatInput.trim() ? T.textSubtle : '#ffffff'}
                  strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 2L11 13"/><path d="M22 2L15 22 11 13 2 9 22 2Z"/>
                </svg>
              </button>
            </div>
          </div>
        </section>

        {/* ── Error ─────────────────────────────────────────────────────── */}
        {error && (
          <p style={{ margin: 0, fontSize: 14, color: '#ef4444' }}>{error}</p>
        )}

        {/* ── Celebration ───────────────────────────────────────────────── */}
        {celebrating && (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
            animation: 'celebratePop 0.5s cubic-bezier(0.34,1.56,0.64,1) forwards, celebrateFade 0.35s 1.3s ease forwards',
          }}>
            <div style={{
              width: 76, height: 76, borderRadius: '50%',
              background: 'linear-gradient(135deg, #22c55e, #15803d)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 6px 28px rgba(34,197,94,0.42)',
            }}>
              <svg width="34" height="34" viewBox="0 0 24 24" fill="none"
                stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                style={{
                  strokeDasharray: 36, strokeDashoffset: 36,
                  animation: 'checkDraw 0.4s 0.18s ease forwards',
                }}>
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
            <span style={{ fontSize: 15, fontWeight: 700, color: '#22c55e' }}>
              Step completed!
            </span>
          </div>
        )}

        {/* ── Mark as Complete ──────────────────────────────────────────── */}
        {!celebrating && (
          <button
            onClick={markComplete}
            style={{
              padding: '15px', borderRadius: 14,
              fontSize: 15, fontWeight: 700, fontFamily: FF,
              cursor: done || marking ? 'default' : 'pointer',
              pointerEvents: marking ? 'none' : 'auto',
              background: done
                ? (dark ? 'rgba(34,197,94,0.13)' : '#f0fdf4')
                : marking
                ? (dark ? 'rgba(255,255,255,0.04)' : '#f8fafc')
                : 'linear-gradient(90deg, #6366f1, #14b8a6)',
              color: done ? '#22c55e' : marking ? T.textMuted : '#fff',
              border: done
                ? '1.5px solid rgba(34,197,94,0.30)'
                : `1.5px solid ${marking ? T.border : 'transparent'}`,
              transition: 'opacity 0.15s, background 0.22s',
            }}
            onMouseEnter={e => { if (!done && !marking) e.currentTarget.style.opacity = '0.88' }}
            onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
          >
            {done ? '✓  Completed' : marking ? 'Saving…' : 'Mark as Complete'}
          </button>
        )}

        {/* ── Next Step ─────────────────────────────────────────────────── */}
        {hasNext && !celebrating && (
          <button
            onClick={goToNext}
            style={{
              padding: '14px', borderRadius: 14,
              fontSize: 15, fontWeight: 600, fontFamily: FF,
              cursor: 'pointer',
              background: T.nextBg,
              color: T.text,
              border: `1.5px solid ${T.border}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              transition: 'opacity 0.15s, background 0.22s',
            }}
            onMouseEnter={e => (e.currentTarget.style.opacity = '0.75')}
            onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
          >
            Next Step
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12"/>
              <polyline points="12 5 19 12 12 19"/>
            </svg>
          </button>
        )}

      </div>
    </div>
  )
}
