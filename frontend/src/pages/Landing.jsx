import { useNavigate } from 'react-router-dom'

export default function Landing() {
  const navigate = useNavigate()

  const containerStyle = {
    position: 'relative',
    width: '100vw',
    height: '100vh',
    background: '#ffffff',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  }

  const blobBase = {
    position: 'absolute',
    borderRadius: '50%',
    filter: 'blur(80px)',
    pointerEvents: 'none',
  }

  const blobTopLeft = {
    ...blobBase,
    width: '420px',
    height: '320px',
    top: '30%',
    left: '-60px',
    filter: 'blur(80px)',
    background: 'rgba(99, 102, 241, 0.7)',
    animation: 'blobPulse 4s ease-in-out infinite',
  }

  const blobTopRight = {
    ...blobBase,
    width: '400px',
    height: '280px',
    top: '-40px',
    right: '40px',
    filter: 'blur(55px)',
    background: 'rgba(20, 184, 166, 0.75)',
    animation: 'blobPulse 5s ease-in-out 1s infinite',
  }

  const blobBottomCenter = {
    ...blobBase,
    width: '300px',
    height: '240px',
    bottom: '-30px',
    right: '-40px',
    filter: 'blur(65px)',
    background: 'rgba(6, 182, 212, 0.65)',
    animation: 'blobPulse 6s ease-in-out 2s infinite',
  }

  const contentStyle = {
    position: 'relative',
    zIndex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '20px',
    padding: '0 24px',
    textAlign: 'center',
  }

  const subtitleStyle = {
    fontSize: '16px',
    color: '#6b7280',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    fontWeight: 400,
    maxWidth: '520px',
    lineHeight: 1.5,
    margin: 0,
  }

  const headingStyle = {
    fontSize: 'clamp(32px, 5vw, 56px)',
    fontWeight: 800,
    color: '#111111',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    lineHeight: 1.15,
    maxWidth: '640px',
    margin: 0,
  }

  const buttonRowStyle = {
    display: 'flex',
    gap: '16px',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginTop: '12px',
  }

  const btnBase = {
    padding: '14px 28px',
    borderRadius: '999px',
    fontSize: '15px',
    fontWeight: 600,
    fontFamily: 'system-ui, -apple-system, sans-serif',
    cursor: 'pointer',
    transition: 'opacity 0.15s ease',
    whiteSpace: 'nowrap',
  }

  const btnPrimary = {
    ...btnBase,
    background: '#111111',
    color: '#ffffff',
    border: 'none',
  }

  const btnSecondary = {
    ...btnBase,
    background: '#ffffff',
    color: '#111111',
    border: '2px solid #111111',
  }

  return (
    <div style={containerStyle}>
      <style>{`
        @keyframes blobPulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.4; }
        }
      `}</style>
      <div style={blobTopLeft} />
      <div style={blobTopRight} />
      <div style={blobBottomCenter} />

      <div style={contentStyle}>
        <p style={subtitleStyle}>
          Personalized learning pathways built from live Boston job postings — not guesswork.
        </p>
        <h1 style={headingStyle}>Your CS Career, Mapped by Real Jobs.</h1>
        <div style={buttonRowStyle}>
          <button
            style={btnPrimary}
            onClick={() => navigate('/onboarding/beginner')}
            onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
            onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
          >
            I am just starting out
          </button>
          <button
            style={btnSecondary}
            onClick={() => navigate('/onboarding/experience')}
            onMouseEnter={e => (e.currentTarget.style.opacity = '0.75')}
            onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
          >
            I have some experience
          </button>
        </div>
      </div>
    </div>
  )
}
