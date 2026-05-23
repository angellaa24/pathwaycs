import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTheme } from '../lib/ThemeContext'
import { useAuth } from '../lib/AuthContext'
import { supabase } from '../lib/supabase'
import axios from 'axios'
import SkillGapCard from '../components/SkillGapCard'

const FF = 'system-ui, -apple-system, sans-serif'

const ROLES = [
  {
    id: 'software-engineer',
    title: 'Software Engineer',
    tagline: 'Build the products millions of people use daily',
    description: "You spend most days writing, reviewing, and debugging code in collaborative sprints. Half the work is understanding what to build, not just building it — expect design reviews, standups, and postmortems. The craft never stops: new frameworks and patterns emerge constantly.",
    demand: 'High',
    salary: '$95k – $175k',
    skills: ['Algorithms', 'System Design', 'Git'],
    role: 'software engineer',
  },
  {
    id: 'frontend-developer',
    title: 'Frontend Developer',
    tagline: 'Create the interfaces users actually interact with',
    description: "You live in the browser — translating designs into pixel-precise, performant UIs while wrestling with CSS quirks and cross-browser differences. Your work is invisible when done right and obvious when done wrong. Expect tight collaboration with designers and backend engineers.",
    demand: 'High',
    salary: '$80k – $155k',
    skills: ['React', 'CSS', 'JavaScript'],
    role: 'frontend developer',
  },
  {
    id: 'data-scientist',
    title: 'Data Scientist',
    tagline: 'Turn raw data into decisions that shape strategy',
    description: "Mornings often start with messy datasets and SQL queries before any analysis can happen. You'll build models and notebooks, then spend significant time explaining findings to stakeholders who need to trust your conclusions. Reality: it's 60% data wrangling, 30% analysis, 10% glamorous ML work.",
    demand: 'High',
    salary: '$100k – $165k',
    skills: ['Python', 'SQL', 'Statistics'],
    role: 'data scientist',
  },
  {
    id: 'devops-engineer',
    title: 'DevOps Engineer',
    tagline: 'Keep the entire engineering org running smoothly',
    description: "You're the person everyone calls when something is on fire — and your job is making those fires happen less often. You design CI/CD pipelines, manage infrastructure as code, and build monitoring that alerts before things break. You enable every other team to ship faster and more reliably.",
    demand: 'High',
    salary: '$110k – $185k',
    skills: ['Docker', 'Kubernetes', 'CI/CD'],
    role: 'devops engineer',
  },
  {
    id: 'ml-engineer',
    title: 'Machine Learning Engineer',
    tagline: 'Put AI models into production at scale',
    description: "Unlike data scientists who prototype in notebooks, you make those models work in the real world — optimizing for latency, building retraining pipelines, and debugging sudden accuracy drops. You sit at the intersection of software engineering and ML research, and need to be strong in both.",
    demand: 'High',
    salary: '$130k – $220k',
    skills: ['PyTorch', 'MLOps', 'Python'],
    role: 'machine learning engineer',
  },
  {
    id: 'cybersecurity-analyst',
    title: 'Cybersecurity Analyst',
    tagline: 'Protect systems and data from constant threats',
    description: "Most days aren't dramatic — reviewing alerts, running scans, and maintaining security policies. But when an incident hits, everything changes: log investigation, tracing attacker movement, coordinating response under pressure. The role rewards curiosity and a healthy sense of paranoia equally.",
    demand: 'High',
    salary: '$85k – $155k',
    skills: ['Network Security', 'SIEM', 'Threat Analysis'],
    role: 'cybersecurity analyst',
  },
  {
    id: 'product-manager',
    title: 'Product Manager (Technical)',
    tagline: 'Define what gets built and why it matters',
    description: "Your day mixes writing specs, running user interviews, analyzing metrics, and aligning engineers, designers, and executives on what to build next. You don't write code, but you need to understand it well enough to spot underestimates and over-engineering. It's about leading without authority.",
    demand: 'Medium',
    salary: '$120k – $200k',
    skills: ['Product Strategy', 'SQL', 'User Research'],
    role: 'product manager',
  },
  {
    id: 'cloud-engineer',
    title: 'Cloud Engineer',
    tagline: 'Design the infrastructure modern software runs on',
    description: "You provision servers, design network architectures, and configure storage — almost entirely through code and cloud consoles. Most time goes to cost optimization, reliability improvements, and migrating legacy systems to cloud-native architectures. Certifications carry more weight here than in most tech roles.",
    demand: 'High',
    salary: '$115k – $185k',
    skills: ['AWS/GCP/Azure', 'Terraform', 'Networking'],
    role: 'cloud engineer',
  },
]

const ENJOY_OPTIONS = [
  { id: 'visual',     label: 'Building visual things' },
  { id: 'data',       label: 'Working with data' },
  { id: 'security',   label: 'Solving security puzzles' },
  { id: 'automation', label: 'Automating and scaling systems' },
]

const PRIORITY_OPTIONS = [
  { id: 'creative',  label: 'Creative work' },
  { id: 'salary',    label: 'High salary' },
  { id: 'security',  label: 'Job security' },
  { id: 'learning',  label: 'Constant learning' },
]

const DEMAND_BADGE = {
  High:   { bg: '#dcfce7', color: '#15803d' },
  Medium: { bg: '#fef3c7', color: '#d97706' },
}

function normalizeDemand(d) {
  if (!d) return 'Medium'
  const cap = d.charAt(0).toUpperCase() + d.slice(1).toLowerCase()
  return DEMAND_BADGE[cap] ? cap : 'Medium'
}

export default function Explore() {
  const { darkMode } = useTheme()
  const { user } = useAuth()
  const navigate = useNavigate()
  const quizRef = useRef(null)

  const [userRoadmap, setUserRoadmap] = useState(null)

  useEffect(() => {
    if (!user) return
    supabase
      .from('roadmaps')
      .select('target_role, job_level, current_skills')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .then(({ data }) => { if (data?.length) setUserRoadmap(data[0]) })
  }, [user])

  const D = {
    bg:          darkMode ? '#0f0f1a' : '#f8fafc',
    card:        darkMode ? '#1a1a2e' : '#ffffff',
    shadow:      darkMode ? '0 1px 3px rgba(0,0,0,0.4), 0 4px 16px rgba(0,0,0,0.25)' : '0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)',
    shadowHover: darkMode ? '0 6px 28px rgba(0,0,0,0.55)' : '0 6px 28px rgba(0,0,0,0.11)',
    border:      darkMode ? '1px solid #2a2a3e' : '1px solid #e5e7eb',
    text:        darkMode ? '#f1f5f9' : '#111827',
    textMuted:   darkMode ? '#94a3b8' : '#6b7280',
    inputBg:     darkMode ? '#0f0f1a' : '#ffffff',
    inputBorder: darkMode ? '#2a2a3e' : '#e5e7eb',
    optionSel:   darkMode ? '#1e1b4b' : '#eef2ff',
    tagBg:       darkMode ? '#2a2a3e' : '#f1f5f9',
    tagText:     darkMode ? '#94a3b8' : '#6b7280',
    btnDisabledBg:   darkMode ? '#1e1e2e' : '#e5e7eb',
    btnDisabledText: darkMode ? '#3a3a5a' : '#9ca3af',
    barBg:           darkMode ? '#2a2a3e' : '#e5e7eb',
  }

  const [enjoys,   setEnjoys]   = useState(null)
  const [skill,    setSkill]    = useState('')
  const [priority, setPriority] = useState(null)
  const [quizLoading, setQuizLoading] = useState(false)
  const [quizResults, setQuizResults] = useState(null)
  const [quizError,   setQuizError]   = useState(null)

  async function handleFindMatch() {
    setQuizLoading(true)
    setQuizError(null)
    setQuizResults(null)
    try {
      const { data } = await axios.post('http://localhost:8000/suggest-roles', {
        enjoys,
        strongest_skill: skill.trim() || null,
        career_priority: priority,
      })
      setQuizResults(data.roles?.slice(0, 3) ?? [])
    } catch {
      setQuizError('Something went wrong. Please try again.')
    } finally {
      setQuizLoading(false)
    }
  }

  const canSubmit = !!(enjoys && priority && !quizLoading)

  return (
    <div style={{ minHeight: '100vh', background: D.bg, fontFamily: FF, paddingTop: 52, transition: 'background 0.2s' }}>

      {/* ── Page header ──────────────────────────────────────────────────────── */}
      <div style={{ padding: '60px 48px 52px', textAlign: 'center', maxWidth: 680, margin: '0 auto' }}>
        <h1 style={{ margin: '0 0 14px', fontSize: 36, fontWeight: 800, color: D.text, letterSpacing: '-0.02em', lineHeight: 1.15 }}>
          Explore CS Careers
        </h1>
        <p style={{ margin: 0, fontSize: 17, color: D.textMuted, lineHeight: 1.65 }}>
          Discover roles you might not know exist — with honest day-in-the-life descriptions.
        </p>
      </div>

      {/* ── Role cards grid ───────────────────────────────────────────────────── */}
      <div style={{ padding: '0 48px 72px', maxWidth: 1300, margin: '0 auto', boxSizing: 'border-box' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(272px, 1fr))', gap: 20 }}>
          {ROLES.map(r => <RoleCard key={r.id} role={r} D={D} navigate={navigate} />)}
        </div>
      </div>

      {/* ── How close are you to your goal? ──────────────────────────────────── */}
      {userRoadmap && (
        <div style={{ padding: '0 48px 72px', maxWidth: 1300, margin: '0 auto', boxSizing: 'border-box' }}>
          <div style={{ marginBottom: 20 }}>
            <h2 style={{ margin: '0 0 6px', fontSize: 22, fontWeight: 800, color: D.text, letterSpacing: '-0.01em' }}>
              How close are you to your goal?
            </h2>
            <p style={{ margin: 0, fontSize: 14, color: D.textMuted }}>
              Based on your saved pathway for{' '}
              <span style={{ textTransform: 'capitalize', fontWeight: 600, color: D.text }}>
                {userRoadmap.target_role}
              </span>.
            </p>
          </div>
          <SkillGapCard
            targetRole={userRoadmap.target_role}
            currentSkills={userRoadmap.current_skills ?? []}
            jobLevel={userRoadmap.job_level}
            D={D}
            darkMode={darkMode}
            navigate={navigate}
          />
        </div>
      )}

      {/* ── "Find My Path" banner ─────────────────────────────────────────────── */}
      <div style={{ padding: '0 48px 72px' }}>
        <div style={{
          borderRadius: 24,
          background: 'linear-gradient(135deg, #6366f1 0%, #14b8a6 100%)',
          padding: '52px 56px',
          display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', gap: 32, flexWrap: 'wrap',
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 520 }}>
            <h2 style={{ margin: 0, fontSize: 26, fontWeight: 800, color: '#ffffff', lineHeight: 1.25 }}>
              Not sure which path is right for you?
            </h2>
            <p style={{ margin: 0, fontSize: 15, color: 'rgba(255,255,255,0.82)', lineHeight: 1.6 }}>
              Answer three quick questions and we'll match you to the roles that fit your interests and strengths.
            </p>
          </div>
          <button
            onClick={() => quizRef.current?.scrollIntoView({ behavior: 'smooth' })}
            style={{
              padding: '13px 30px', borderRadius: 999,
              background: '#ffffff', border: 'none',
              color: '#4f46e5', fontSize: 15, fontWeight: 700,
              cursor: 'pointer', fontFamily: FF, flexShrink: 0,
              boxShadow: '0 4px 14px rgba(0,0,0,0.15)',
              transition: 'opacity 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.opacity = '0.9')}
            onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
          >
            Find My Path →
          </button>
        </div>
      </div>

      {/* ── Quiz section ──────────────────────────────────────────────────────── */}
      <div ref={quizRef} style={{ padding: '0 48px 100px', maxWidth: 860, margin: '0 auto', boxSizing: 'border-box' }}>

        <div style={{ marginBottom: 44 }}>
          <h2 style={{ margin: '0 0 8px', fontSize: 28, fontWeight: 800, color: D.text, letterSpacing: '-0.01em' }}>
            Find My Path
          </h2>
          <p style={{ margin: 0, fontSize: 15, color: D.textMuted }}>
            Three questions to find your best-fit CS career.
          </p>
        </div>

        {/* Q1 */}
        <QuizBlock label="1. What do you enjoy most?" D={D}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
            {ENJOY_OPTIONS.map(opt => (
              <OptionCard key={opt.id} selected={enjoys === opt.id} onClick={() => setEnjoys(opt.id)} D={D}>
                {opt.label}
              </OptionCard>
            ))}
          </div>
        </QuizBlock>

        {/* Q2 */}
        <QuizBlock label="2. What's your strongest skill right now?" D={D}>
          <input
            type="text"
            value={skill}
            onChange={e => setSkill(e.target.value)}
            placeholder="e.g. Python, design, communication…"
            style={{
              width: '100%', padding: '13px 16px', borderRadius: 12,
              border: `1.5px solid ${D.inputBorder}`, fontSize: 15,
              fontFamily: FF, color: D.text, background: D.inputBg,
              outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.15s',
            }}
            onFocus={e => (e.currentTarget.style.borderColor = '#6366f1')}
            onBlur={e  => (e.currentTarget.style.borderColor = D.inputBorder)}
          />
        </QuizBlock>

        {/* Q3 */}
        <QuizBlock label="3. What matters most in your career?" D={D}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
            {PRIORITY_OPTIONS.map(opt => (
              <OptionCard key={opt.id} selected={priority === opt.id} onClick={() => setPriority(opt.id)} D={D}>
                {opt.label}
              </OptionCard>
            ))}
          </div>
        </QuizBlock>

        {/* Submit */}
        <button
          onClick={handleFindMatch}
          disabled={!canSubmit}
          style={{
            marginTop: 8,
            padding: '13px 38px', borderRadius: 999,
            background: canSubmit ? 'linear-gradient(90deg, #6366f1, #14b8a6)' : D.btnDisabledBg,
            color: canSubmit ? '#ffffff' : D.btnDisabledText,
            border: 'none', fontSize: 15, fontWeight: 700,
            cursor: canSubmit ? 'pointer' : 'default',
            fontFamily: FF,
            boxShadow: canSubmit ? '0 4px 14px rgba(99,102,241,0.3)' : 'none',
            transition: 'opacity 0.15s, background 0.2s',
          }}
          onMouseEnter={e => { if (canSubmit) e.currentTarget.style.opacity = '0.9' }}
          onMouseLeave={e => { e.currentTarget.style.opacity = '1' }}
        >
          {quizLoading ? 'Finding your match…' : 'Find My Match →'}
        </button>

        {quizError && (
          <p style={{ marginTop: 16, fontSize: 14, color: '#ef4444', margin: '16px 0 0' }}>{quizError}</p>
        )}

        {/* Results */}
        {quizResults && quizResults.length > 0 && (
          <div style={{ marginTop: 48 }}>
            <h3 style={{ margin: '0 0 20px', fontSize: 20, fontWeight: 700, color: D.text }}>
              Your top matches
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {quizResults.map((r, i) => (
                <ResultCard key={i} role={r} D={D} navigate={navigate} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function RoleCard({ role, D, navigate }) {
  const [hovered, setHovered] = useState(false)
  const dem = DEMAND_BADGE[role.demand] ?? DEMAND_BADGE.Medium
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: D.card, border: D.border, borderRadius: 18,
        padding: '22px 24px',
        display: 'flex', flexDirection: 'column', gap: 13,
        boxShadow: hovered ? D.shadowHover : D.shadow,
        transform: hovered ? 'translateY(-2px)' : 'translateY(0)',
        transition: 'box-shadow 0.15s, transform 0.15s',
      }}
    >
      {/* Title row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
        <div style={{ flex: 1 }}>
          <h3 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 700, color: D.text, lineHeight: 1.3 }}>
            {role.title}
          </h3>
          <p style={{ margin: 0, fontSize: 12, color: '#6366f1', fontWeight: 600, lineHeight: 1.4 }}>
            {role.tagline}
          </p>
        </div>
        <span style={{
          padding: '3px 10px', borderRadius: 999,
          background: dem.bg, color: dem.color,
          fontSize: 11, fontWeight: 700, flexShrink: 0,
          whiteSpace: 'nowrap',
        }}>
          {role.demand}
        </span>
      </div>

      {/* Description */}
      <p style={{ margin: 0, fontSize: 13, color: D.textMuted, lineHeight: 1.65, flex: 1 }}>
        {role.description}
      </p>

      {/* Salary */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: D.text }}>{role.salary}</span>
        <span style={{ fontSize: 12, color: D.textMuted }}>avg. salary</span>
      </div>

      {/* Skill tags */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {role.skills.map(s => (
          <span key={s} style={{
            padding: '3px 10px', borderRadius: 999,
            background: D.tagBg, color: D.tagText,
            fontSize: 11, fontWeight: 600,
          }}>
            {s}
          </span>
        ))}
      </div>

      {/* CTA */}
      <button
        onClick={() => navigate('/onboarding/experience', { state: { prefillRole: role.role } })}
        style={{
          alignSelf: 'flex-start', padding: '8px 18px', borderRadius: 999,
          background: 'linear-gradient(90deg, #6366f1, #14b8a6)',
          color: '#ffffff', border: 'none',
          fontSize: 13, fontWeight: 700,
          cursor: 'pointer', fontFamily: FF,
          transition: 'opacity 0.15s',
        }}
        onMouseEnter={e => (e.currentTarget.style.opacity = '0.88')}
        onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
      >
        Build My Pathway →
      </button>
    </div>
  )
}

function QuizBlock({ label, children, D }) {
  return (
    <div style={{ marginBottom: 36 }}>
      <p style={{ margin: '0 0 14px', fontSize: 15, fontWeight: 700, color: D.text }}>{label}</p>
      {children}
    </div>
  )
}

function OptionCard({ selected, onClick, children, D }) {
  const [hovered, setHovered] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding: '14px 18px', borderRadius: 12, textAlign: 'left',
        background: selected ? D.optionSel : hovered ? D.optionSel : D.card,
        border: `2px solid ${selected ? '#6366f1' : D.inputBorder}`,
        color: selected ? '#6366f1' : D.text,
        fontSize: 14, fontWeight: selected ? 700 : 500,
        cursor: 'pointer', fontFamily: FF,
        transition: 'background 0.12s, border-color 0.12s, color 0.12s',
      }}
    >
      {children}
    </button>
  )
}

function ResultCard({ role, D, navigate }) {
  const demKey = normalizeDemand(role.demand)
  const dem = DEMAND_BADGE[demKey]
  return (
    <div style={{
      background: D.card, border: D.border, borderRadius: 16,
      padding: '22px 24px',
      display: 'flex', flexDirection: 'column', gap: 12,
      boxShadow: D.shadow,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: D.text }}>{role.title}</h3>
        <span style={{
          padding: '3px 10px', borderRadius: 999,
          background: dem.bg, color: dem.color,
          fontSize: 11, fontWeight: 700,
        }}>
          {demKey} Demand
        </span>
      </div>
      <p style={{ margin: 0, fontSize: 14, color: D.textMuted, lineHeight: 1.65 }}>
        {role.description}
      </p>
      <button
        onClick={() => navigate('/onboarding/experience', { state: { prefillRole: role.title.toLowerCase() } })}
        style={{
          alignSelf: 'flex-start', padding: '9px 20px', borderRadius: 999,
          background: 'linear-gradient(90deg, #6366f1, #14b8a6)',
          color: '#ffffff', border: 'none',
          fontSize: 13, fontWeight: 700,
          cursor: 'pointer', fontFamily: FF,
          transition: 'opacity 0.15s',
        }}
        onMouseEnter={e => (e.currentTarget.style.opacity = '0.88')}
        onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
      >
        Build My Pathway →
      </button>
    </div>
  )
}
