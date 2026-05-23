import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'
import { useProfile } from '../lib/ProfileContext'
import AvatarSVG, { COLOR_FILTERS } from '../components/AvatarSVG'

const FF = 'system-ui, -apple-system, sans-serif'

const CHARACTERS = [
  { id: 'owly',  name: 'Owly',  sub: 'The Wise Owl' },
  { id: 'robo',  name: 'Robo',  sub: 'The Robot'    },
  { id: 'fox',   name: 'Fox',   sub: 'The Fox'       },
  { id: 'cosmo', name: 'Cosmo', sub: 'The Cat'       },
]

const COLORS = [
  { id: 'indigo', hex: '#6366f1', name: 'Indigo' },
  { id: 'teal',   hex: '#14b8a6', name: 'Teal'   },
  { id: 'pink',   hex: '#ec4899', name: 'Pink'   },
  { id: 'orange', hex: '#f97316', name: 'Orange' },
  { id: 'red',    hex: '#ef4444', name: 'Red'    },
]

export default function AvatarPicker() {
  const { user, loading: authLoading } = useAuth()
  const { avatar, saveAvatar, profileLoaded } = useProfile()
  const navigate = useNavigate()

  // Initialize directly from context — ProfileContext persists across navigation
  // so avatar is already loaded by the time this page mounts in most cases.
  const [selectedChar,  setSelectedChar]  = useState(() => avatar.character)
  const [selectedColor, setSelectedColor] = useState(() => avatar.color)
  const userHasSelected = useRef(false)

  useEffect(() => {
    if (!authLoading && !user) navigate('/login', { replace: true })
  }, [authLoading, user])

  // If profile loads AFTER mount (e.g. direct navigation to /avatar on page reload),
  // sync the selection once as long as the user hasn't manually picked something yet.
  useEffect(() => {
    if (profileLoaded && !userHasSelected.current) {
      setSelectedChar(avatar.character)
      setSelectedColor(avatar.color)
    }
  }, [profileLoaded, avatar.character, avatar.color])

  function handleSave() {
    saveAvatar(selectedChar, selectedColor)  // instant — localStorage + context, Supabase in background
    navigate('/dashboard')
  }

  if (authLoading) return null

  const selectedCharLabel = CHARACTERS.find(c => c.id === selectedChar)
  const selectedColorLabel = COLORS.find(c => c.id === selectedColor)

  return (
    <div style={{
      minHeight: '100vh', background: '#ffffff',
      fontFamily: FF, paddingTop: 52,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        width: '100%', maxWidth: 700,
        padding: '48px 24px',
        display: 'flex', flexDirection: 'column', gap: 44, alignItems: 'center',
      }}>

        {/* Header */}
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <h1 style={{ margin: 0, fontSize: 30, fontWeight: 800, color: '#111827', letterSpacing: '-0.02em' }}>
            Choose Your Character
          </h1>
          <p style={{ margin: 0, fontSize: 16, color: '#6b7280' }}>
            Pick an avatar that represents you
          </p>
        </div>

        {/* Live preview */}
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16,
          padding: '32px 48px', borderRadius: 24,
          background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
          border: '1.5px solid #e5e7eb',
          width: '100%', maxWidth: 280, boxSizing: 'border-box',
        }}>
          <AvatarSVG character={selectedChar} color={selectedColor} size={140} />
          <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 16, fontWeight: 700, color: '#111827' }}>
              {selectedCharLabel?.name}
            </span>
            <span style={{ fontSize: 13, color: '#9ca3af' }}>
              {selectedColorLabel?.name} theme
            </span>
          </div>
        </div>

        {/* Character grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, width: '100%' }}>
          {CHARACTERS.map(ch => {
            const sel = selectedChar === ch.id
            return (
              <CharCard key={ch.id} selected={sel} onClick={() => { userHasSelected.current = true; setSelectedChar(ch.id) }}>
                <AvatarSVG character={ch.id} color={selectedColor} size={72} />
                <span style={{ fontSize: 14, fontWeight: 700, color: sel ? '#4f46e5' : '#111827' }}>
                  {ch.name}
                </span>
              </CharCard>
            )
          })}
        </div>

        {/* Color swatches */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, alignItems: 'center' }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: '#374151' }}>Pick a color</span>
          <div style={{ display: 'flex', gap: 14 }}>
            {COLORS.map(col => {
              const sel = selectedColor === col.id
              return (
                <button
                  key={col.id}
                  onClick={() => { userHasSelected.current = true; setSelectedColor(col.id) }}
                  title={col.name}
                  style={{
                    width: 44, height: 44, borderRadius: '50%',
                    background: col.hex, border: 'none',
                    boxShadow: sel ? `0 0 0 3px white, 0 0 0 5px ${col.hex}` : 'none',
                    cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transform: sel ? 'scale(1.15)' : 'scale(1)',
                    transition: 'transform 0.14s, box-shadow 0.14s',
                  }}
                >
                  {sel && (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                      stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </button>
              )
            })}
          </div>
        </div>



        {/* Save */}
        <button
          onClick={handleSave}
          style={{
            padding: '14px 52px', borderRadius: 999,
            background: 'linear-gradient(90deg, #6366f1, #14b8a6)',
            color: '#ffffff',
            border: 'none', fontSize: 16, fontWeight: 700,
            cursor: 'pointer',
            fontFamily: FF,
            boxShadow: '0 4px 18px rgba(99,102,241,0.32)',
            transition: 'opacity 0.15s',
          }}
          onMouseEnter={e => (e.currentTarget.style.opacity = '0.9')}
          onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
        >
          Save Avatar
        </button>

      </div>
    </div>
  )
}

function CharCard({ selected, onClick, children }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
        padding: '20px 12px', borderRadius: 20,
        border: selected ? '2.5px solid #6366f1' : '2px solid #e5e7eb',
        background: selected ? '#eef2ff' : '#ffffff',
        cursor: 'pointer', fontFamily: FF,
        boxShadow: selected
          ? '0 0 0 4px rgba(99,102,241,0.14), 0 2px 8px rgba(0,0,0,0.06)'
          : '0 1px 3px rgba(0,0,0,0.06)',
        transition: 'border-color 0.14s, background 0.14s, box-shadow 0.14s',
      }}
    >
      {children}
    </button>
  )
}
