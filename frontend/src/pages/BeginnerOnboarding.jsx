import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { useAuth } from '../lib/AuthContext'

const steps = [
  {
    question: 'What interests you most?',
    options: [
      'Building websites & apps',
      'Working with data',
      'Cybersecurity',
      'AI & Machine Learning',
    ],
  },
  {
    question: 'How much time can you dedicate per week?',
    options: ['1-5 hours', '5-10 hours', '10-20 hours', '20+ hours'],
  },
  {
    question: 'What is your goal?',
    options: ['Get an internship', 'Land my first job', 'Explore CS as a career'],
  },
]

export default function BeginnerOnboarding() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [currentStep, setCurrentStep] = useState(0)
  const [answers, setAnswers] = useState({})
  const [hoveredOption, setHoveredOption] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const step = steps[currentStep]
  const isLast = currentStep === steps.length - 1

  function selectOption(option) {
    const updated = { ...answers, [currentStep]: option }
    setAnswers(updated)
    if (!isLast) {
      setCurrentStep(currentStep + 1)
    }
  }

  function goBack() {
    setCurrentStep(currentStep - 1)
  }

  async function finish() {
    if (loading || !answers[currentStep]) return
    setLoading(true)
    setError(null)

    const requestBody = {
      current_skills: [],
      target_role: answers[0],
      job_level: 'intern',
      user_id: user?.id ?? null,
    }

    let res
    try {
      res = await axios.post(API_BASE_URL + '/generate-roadmap', requestBody)
    } catch {
      setError('This is taking longer than usual, please wait…')
      await new Promise(r => setTimeout(r, 3000))
      try {
        res = await axios.post(API_BASE_URL + '/generate-roadmap', requestBody)
      } catch (err) {
        console.error('[generate-roadmap]', err.response?.data || err.message)
        setError('Something went wrong. Please try again.')
        setLoading(false)
        return
      }
    }

    setError(null)
    navigate('/roadmap', {
      state: {
        ...res.data,
        roadmap_id: res.data.roadmap_id,
        track: 'beginner',
      },
    })
    setLoading(false)
  }

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

  const blobBase = {
    position: 'absolute',
    borderRadius: '50%',
    pointerEvents: 'none',
  }

  const blobLeft = {
    ...blobBase,
    width: '420px',
    height: '320px',
    top: '30%',
    left: '-60px',
    filter: 'blur(80px)',
    background: 'rgba(99, 102, 241, 0.7)',
  }

  const blobTopRight = {
    ...blobBase,
    width: '400px',
    height: '280px',
    top: '-40px',
    right: '40px',
    filter: 'blur(55px)',
    background: 'rgba(20, 184, 166, 0.75)',
  }

  const blobBottomRight = {
    ...blobBase,
    width: '300px',
    height: '240px',
    bottom: '-30px',
    right: '-40px',
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
    maxWidth: '520px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
    display: 'flex',
    flexDirection: 'column',
    gap: '28px',
  }

  const progressBarTrackStyle = {
    width: '100%',
    height: '4px',
    background: '#e5e7eb',
    borderRadius: '999px',
    overflow: 'hidden',
  }

  const progressBarFillStyle = {
    height: '100%',
    width: `${((currentStep + 1) / steps.length) * 100}%`,
    background: 'linear-gradient(90deg, #6366f1, #14b8a6)',
    borderRadius: '999px',
    transition: 'width 0.35s ease',
  }

  const progressLabelStyle = {
    fontSize: '13px',
    color: '#9ca3af',
    fontWeight: 500,
  }

  const questionStyle = {
    fontSize: '22px',
    fontWeight: 700,
    color: '#111111',
    margin: 0,
    lineHeight: 1.3,
  }

  const optionsGridStyle = {
    display: 'grid',
    gridTemplateColumns: step.options.length === 3 ? '1fr' : '1fr 1fr',
    gap: '12px',
  }

  function optionCardStyle(option) {
    const selected = answers[currentStep] === option
    const hovered = hoveredOption === option
    return {
      padding: '16px 20px',
      borderRadius: '12px',
      border: selected
        ? '2px solid #6366f1'
        : hovered
        ? '2px solid #d1d5db'
        : '2px solid #e5e7eb',
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

  const footerStyle = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: currentStep > 0 ? 'space-between' : 'flex-end',
    gap: '12px',
  }

  const backBtnStyle = {
    background: 'none',
    border: 'none',
    fontSize: '14px',
    fontWeight: 500,
    color: '#6b7280',
    cursor: 'pointer',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    padding: '8px 0',
  }

  const finishActive = !!answers[currentStep] && !loading
  const finishBtnStyle = {
    padding: '13px 28px',
    borderRadius: '999px',
    fontSize: '15px',
    fontWeight: 600,
    background: finishActive ? 'linear-gradient(90deg, #6366f1, #14b8a6)' : '#e5e7eb',
    color: finishActive ? '#ffffff' : '#9ca3af',
    border: 'none',
    cursor: finishActive ? 'pointer' : 'default',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    transition: 'opacity 0.15s ease',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  }

  return (
    <div style={containerStyle}>
      <div style={blobLeft} />
      <div style={blobTopRight} />
      <div style={blobBottomRight} />

      <div style={cardStyle}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <span style={progressLabelStyle}>Step {currentStep + 1} of {steps.length}</span>
          <div style={progressBarTrackStyle}>
            <div style={progressBarFillStyle} />
          </div>
        </div>

        <h2 style={questionStyle}>{step.question}</h2>

        <div style={optionsGridStyle}>
          {step.options.map(option => (
            <button
              key={option}
              style={optionCardStyle(option)}
              onClick={() => selectOption(option)}
              onMouseEnter={() => setHoveredOption(option)}
              onMouseLeave={() => setHoveredOption(null)}
            >
              {option}
            </button>
          ))}
        </div>

        {error && (
          <p style={{ margin: 0, fontSize: '14px', color: '#ef4444', textAlign: 'center' }}>
            {error}
          </p>
        )}

        <div style={footerStyle}>
          {currentStep > 0 && (
            <button style={backBtnStyle} onClick={goBack} disabled={loading}>
              ← Back
            </button>
          )}
          {isLast && (
            <button
              style={finishBtnStyle}
              onClick={finish}
              onMouseEnter={e => { if (finishActive) e.currentTarget.style.opacity = '0.85' }}
              onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
            >
              {loading && (
                <div style={{
                  width: '14px', height: '14px', borderRadius: '50%',
                  border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#ffffff',
                  animation: 'spin 0.7s linear infinite', flexShrink: 0,
                }} />
              )}
              {loading ? 'Generating…' : 'Generate My Pathway'}
            </button>
          )}
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
