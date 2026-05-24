import API_BASE_URL from '../config'
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'
import { useTheme } from '../lib/ThemeContext'
import { supabase } from '../lib/supabase'
import axios from 'axios'

const FF = 'system-ui, -apple-system, sans-serif'

const ROLES = [
  'Software Engineer',
  'Frontend Developer',
  'Data Scientist',
  'DevOps Engineer',
  'ML Engineer',
  'Cybersecurity Analyst',
  'Cloud Engineer',
]

const LEVELS = [
  { label: 'Intern',  value: 'intern' },
  { label: 'Junior',  value: 'junior' },
  { label: 'Mid',     value: 'mid-level' },
  { label: 'Senior',  value: 'senior' },
]

function formatSalary(min, max) {
  const fmt = n => `$${Math.round(n / 1000)}k`
  if (min && max) return `${fmt(min)} – ${fmt(max)}`
  if (min) return `From ${fmt(min)}`
  if (max) return `Up to ${fmt(max)}`
  return null
}

function matchBadge(jobSkills, userSkills) {
  if (!jobSkills.length || !userSkills.length) return null
  const norm = s => s.toLowerCase().replace(/[.\-_/\\]/g, ' ').trim()
  const normedUser = userSkills.map(norm)
  const count = jobSkills.filter(js => {
    const n = norm(js)
    return normedUser.some(u => u === n || u.includes(n) || n.includes(u))
  }).length
  const pct = Math.round((count / jobSkills.length) * 100)
  if (pct >= 60) return { label: `${count}/${jobSkills.length} skills matched`, bg: '#dcfce7', color: '#15803d' }
  if (pct >= 30) return { label: `${count}/${jobSkills.length} skills matched`, bg: '#fef3c7', color: '#d97706' }
  return { label: `${count}/${jobSkills.length} skills matched`, bg: '#f3f4f6', color: '#6b7280' }
}

export default function Jobs() {
  const { user } = useAuth()
  const { darkMode } = useTheme()
  const navigate = useNavigate()

  const D = {
    bg:          darkMode ? '#0f0f1a' : '#f8fafc',
    card:        darkMode ? '#1a1a2e' : '#ffffff',
    shadow:      darkMode ? '0 1px 3px rgba(0,0,0,0.4), 0 4px 16px rgba(0,0,0,0.25)' : '0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)',
    shadowHover: darkMode ? '0 4px 20px rgba(0,0,0,0.5)' : '0 4px 20px rgba(0,0,0,0.1)',
    border:      darkMode ? '1px solid #2a2a3e' : 'none',
    text:        darkMode ? '#f1f5f9' : '#111827',
    textMuted:   darkMode ? '#94a3b8' : '#6b7280',
    inputBg:     darkMode ? '#0f0f1a' : '#f9fafb',
    inputBorder: darkMode ? '#2a2a3e' : '#e5e7eb',
    tagBg:       darkMode ? '#2a2a3e' : '#f3f4f6',
    tagText:     darkMode ? '#94a3b8' : '#6b7280',
    skelBg:      darkMode ? '#2a2a3e' : '#e5e7eb',
    selectBg:    darkMode ? '#1a1a2e' : '#ffffff',
  }

  const [role,     setRole]     = useState(ROLES[0])
  const [level,    setLevel]    = useState('junior')
  const [listings, setListings] = useState([])
  const [loading,  setLoading]  = useState(false)
  const [searched, setSearched] = useState(false)
  const [userSkills, setUserSkills] = useState([])

  // Load user's current skills from their latest roadmap
  useEffect(() => {
    if (!user) return
    supabase
      .from('roadmaps')
      .select('current_skills, target_role, job_level')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .then(({ data }) => {
        if (data?.length) {
          setUserSkills(data[0].current_skills ?? [])
          if (data[0].target_role) setRole(data[0].target_role)
          if (data[0].job_level)   setLevel(data[0].job_level)
        }
      })
  }, [user])

  async function search() {
    setLoading(true)
    setSearched(true)
    try {
      const res = await axios.get(API_BASE_URL + '/job-listings', {
        params: { target_role: role, job_level: level },
      })
      setListings(res.data.listings ?? [])
    } catch {
      setListings([])
    }
    setLoading(false)
  }

  const selectStyle = {
    padding: '10px 14px', borderRadius: 10, fontSize: 14,
    background: D.selectBg, color: D.text,
    border: `1px solid ${D.inputBorder}`,
    fontFamily: FF, cursor: 'pointer', outline: 'none',
    appearance: 'none', WebkitAppearance: 'none',
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2' stroke-linecap='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 12px center',
    paddingRight: 36,
  }

  return (
    <div style={{ minHeight: '100vh', background: D.bg, fontFamily: FF, paddingTop: 52, transition: 'background 0.2s' }}>

      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #6366f1 0%, #14b8a6 100%)',
        padding: '48px 48px 40px',
      }}>
        <h1 style={{ margin: '0 0 8px', fontSize: 30, fontWeight: 800, color: '#fff' }}>
          Live Jobs in Boston
        </h1>
        <p style={{ margin: 0, fontSize: 15, color: 'rgba(255,255,255,0.82)' }}>
          Browse real listings and see how your skills stack up.
        </p>
      </div>

      <div style={{ padding: '28px 48px', maxWidth: 1200, margin: '0 auto' }}>

        {/* Filter bar */}
        <div style={{
          display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap',
          background: D.card, borderRadius: 16, padding: '20px 24px',
          boxShadow: D.shadow, border: D.border, marginBottom: 28,
        }}>
          <select value={role} onChange={e => setRole(e.target.value)} style={{ ...selectStyle, minWidth: 200 }}>
            {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
          <select value={level} onChange={e => setLevel(e.target.value)} style={{ ...selectStyle, minWidth: 140 }}>
            {LEVELS.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
          </select>
          <button
            onClick={search}
            disabled={loading}
            style={{
              padding: '10px 24px', borderRadius: 999,
              background: loading ? '#9ca3af' : 'linear-gradient(90deg, #6366f1, #14b8a6)',
              color: '#fff', border: 'none', fontSize: 14, fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer', fontFamily: FF,
              transition: 'opacity 0.15s',
            }}
            onMouseEnter={e => { if (!loading) e.currentTarget.style.opacity = '0.88' }}
            onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
          >
            {loading ? 'Searching…' : 'Search Jobs'}
          </button>
        </div>

        {/* Skeleton loader */}
        {loading && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={i} bg={D.skelBg} card={D.card} border={D.border} shadow={D.shadow} />
            ))}
          </div>
        )}

        {/* Results */}
        {!loading && listings.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
            {listings.map((job, i) => (
              <JobCard key={i} job={job} userSkills={userSkills} D={D} darkMode={darkMode} />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && searched && listings.length === 0 && (
          <div style={{
            textAlign: 'center', padding: '80px 24px',
            color: D.textMuted, fontSize: 15,
          }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>🔍</div>
            <p style={{ margin: 0, fontWeight: 600, color: D.text }}>No listings found</p>
            <p style={{ margin: '8px 0 0', fontSize: 14 }}>Try a different role or level.</p>
          </div>
        )}

        {/* Pre-search prompt */}
        {!loading && !searched && (
          <div style={{
            textAlign: 'center', padding: '80px 24px',
            color: D.textMuted, fontSize: 15,
          }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>💼</div>
            <p style={{ margin: 0, fontWeight: 600, color: D.text }}>Search for jobs to get started</p>
            <p style={{ margin: '8px 0 0', fontSize: 14 }}>Select a role and level above, then click Search Jobs.</p>
          </div>
        )}
      </div>
    </div>
  )
}

function JobCard({ job, userSkills, D, darkMode }) {
  const [hovered, setHovered] = useState(false)
  const salary = formatSalary(job.salary_min, job.salary_max)
  const badge  = matchBadge(job.skills, userSkills)

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: D.card, borderRadius: 16,
        padding: '22px 24px', border: D.border,
        boxShadow: hovered ? D.shadowHover : D.shadow,
        display: 'flex', flexDirection: 'column', gap: 14,
        transition: 'box-shadow 0.2s, transform 0.2s',
        transform: hovered ? 'translateY(-2px)' : 'none',
      }}
    >
      {/* Title + company */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span style={{ fontSize: 15, fontWeight: 700, color: D.text, lineHeight: 1.3 }}>
          {job.title}
        </span>
        <span style={{ fontSize: 13, color: D.textMuted, fontWeight: 500 }}>
          {job.company}
        </span>
      </div>

      {/* Location + salary row */}
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
        {job.location && (
          <span style={{ fontSize: 12, color: D.textMuted, display: 'flex', alignItems: 'center', gap: 4 }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
            </svg>
            {job.location}
          </span>
        )}
        {salary && (
          <span style={{ fontSize: 12, color: '#22c55e', fontWeight: 600 }}>
            {salary}
          </span>
        )}
      </div>

      {/* Description snippet */}
      {job.description && (
        <p style={{ margin: 0, fontSize: 13, color: D.textMuted, lineHeight: 1.55 }}>
          {job.description}
        </p>
      )}

      {/* Skill tags */}
      {job.skills.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {job.skills.map(sk => (
            <span key={sk} style={{
              padding: '3px 9px', borderRadius: 999,
              background: D.tagBg, color: D.tagText,
              fontSize: 11, fontWeight: 600,
            }}>
              {sk}
            </span>
          ))}
        </div>
      )}

      {/* Footer: match badge + apply */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 }}>
        {badge ? (
          <span style={{
            fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 999,
            background: badge.bg, color: badge.color,
          }}>
            {badge.label}
          </span>
        ) : <span />}
        {job.redirect_url && (
          <a
            href={job.redirect_url}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              padding: '8px 18px', borderRadius: 999,
              background: 'linear-gradient(90deg, #6366f1, #14b8a6)',
              color: '#fff', fontSize: 13, fontWeight: 700,
              textDecoration: 'none', display: 'inline-block',
              transition: 'opacity 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.opacity = '0.88')}
            onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
          >
            Apply →
          </a>
        )}
      </div>
    </div>
  )
}

function SkeletonCard({ bg, card, border, shadow }) {
  const pulse = {
    background: bg, borderRadius: 8,
    animation: 'pulse 1.4s ease-in-out infinite',
  }
  return (
    <>
      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>
      <div style={{
        background: card, borderRadius: 16,
        padding: '22px 24px', border, boxShadow: shadow,
        display: 'flex', flexDirection: 'column', gap: 14,
      }}>
        <div style={{ ...pulse, height: 18, width: '70%' }} />
        <div style={{ ...pulse, height: 13, width: '45%' }} />
        <div style={{ ...pulse, height: 13, width: '55%' }} />
        <div style={{ display: 'flex', gap: 8 }}>
          {[60, 50, 70].map((w, i) => (
            <div key={i} style={{ ...pulse, height: 22, width: w, borderRadius: 999 }} />
          ))}
        </div>
        <div style={{ ...pulse, height: 32, width: 90, borderRadius: 999, alignSelf: 'flex-end' }} />
      </div>
    </>
  )
}
