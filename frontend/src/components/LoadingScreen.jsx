const FF = 'system-ui, -apple-system, sans-serif'

export default function LoadingScreen() {
  return (
    <div style={{
      width: '100vw', height: '100vh',
      background: '#ffffff',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      gap: 22,
      fontFamily: FF,
    }}>
      <style>{`
        @keyframes drawRoad {
          from { stroke-dashoffset: 1; }
          to   { stroke-dashoffset: 0; }
        }
        @keyframes arrowFade {
          0%, 78% { opacity: 0; }
          100%    { opacity: 1; }
        }
        @keyframes logoReveal {
          from { opacity: 0; transform: translateY(5px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <svg
        viewBox="0 0 220 56"
        width="220"
        height="56"
        style={{ overflow: 'visible' }}
      >
        <defs>
          {/* Gradient runs left (indigo) → right (teal) across the path */}
          <linearGradient id="lsGrad" x1="0" y1="0" x2="1" y2="0" gradientUnits="objectBoundingBox">
            <stop offset="0%"   stopColor="#6366f1" />
            <stop offset="100%" stopColor="#14b8a6" />
          </linearGradient>
        </defs>

        {/* Winding road — S-curve from left to right */}
        <path
          d="M 12,28 C 42,6 66,6 94,28 S 148,50 172,28"
          fill="none"
          stroke="url(#lsGrad)"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          pathLength="1"
          style={{
            strokeDasharray: 1,
            strokeDashoffset: 1,
            animation: 'drawRoad 1.5s cubic-bezier(0.4,0,0.2,1) infinite alternate',
          }}
        />

        {/* Arrowhead tip — fades in as the path reaches it */}
        <polyline
          points="163,23 176,32 163,41"
          fill="none"
          stroke="#14b8a6"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            animation: 'arrowFade 1.5s cubic-bezier(0.4,0,0.2,1) infinite alternate',
          }}
        />
      </svg>

      {/* Logo text — fades in once after path starts drawing, stays visible */}
      <span style={{
        fontSize: 18, fontWeight: 800,
        color: '#4f46e5',
        letterSpacing: '-0.02em',
        animation: 'logoReveal 0.45s 0.38s ease both',
      }}>
        PathwayCS
      </span>
    </div>
  )
}
