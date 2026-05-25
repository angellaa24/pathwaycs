import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from './supabase'

const ProfileContext = createContext(null)

export function ProfileProvider({ children }) {
  const [avatarCharacter, setAvatarCharacter] = useState(
    localStorage.getItem('pathwaycs-avatar-character') || 'owly'
  )
  const [avatarColor, setAvatarColor] = useState(
    localStorage.getItem('pathwaycs-avatar-color') || 'indigo'
  )
  const [profileLoaded,   setProfileLoaded]   = useState(false)
  const [userId,          setUserId]          = useState(null)

  const fetchProfile = async (userId) => {
    try {
      console.log('Profile query starting for:', userId)
      const result = await supabase
        .from('profiles')
        .select('avatar_character, avatar_color, display_name')
        .eq('id', userId)
        .single()
      console.log('Profile query result:', result)
      if (result.data) {
        const char  = result.data.avatar_character || 'owly'
        const color = result.data.avatar_color     || 'indigo'
        setAvatarCharacter(char)
        setAvatarColor(color)
        localStorage.setItem('pathwaycs-avatar-character', char)
        localStorage.setItem('pathwaycs-avatar-color', color)
        console.log('Profile applied:', char, color)
      } else {
        console.log('Profile error:', result.error)
      }
    } catch (err) {
      console.log('Profile fetch threw:', err.message)
    } finally {
      setProfileLoaded(true)
    }
  }

  // Handles page reload — reads the existing session from localStorage.
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.log('[Profile] getSession error:', error.message)
        setProfileLoaded(true)
        return
      }
      if (session?.user) {
        console.log('Profile fetch triggered by: reload')
        fetchProfile(session.user.id)
      } else {
        console.log('[Profile] getSession — no session')
        setProfileLoaded(true)
      }
    })
  }, [])

  // Handles login — fires on explicit SIGNED_IN event.
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('[Profile] Auth event:', event, '| uid:', session?.user?.id ?? null)

        if (event === 'SIGNED_IN' && session?.user) {
          console.log('Profile fetch triggered by: login')
          await fetchProfile(session.user.id)
        } else if (event === 'SIGNED_OUT') {
          // Keep avatar keys in localStorage so they load immediately on next login
          setUserId(null)
          setProfileLoaded(true)
        }
      }
    )
    return () => subscription.unsubscribe()
  }, [])

  function saveAvatar(character, color) {
    // Update state and localStorage immediately — UI doesn't wait for Supabase.
    setAvatarCharacter(character)
    setAvatarColor(color)
    localStorage.setItem('pathwaycs-avatar-character', character)
    localStorage.setItem('pathwaycs-avatar-color', color)
    console.log('Profile applied:', character, color)

    // Sync to Supabase in the background with a 5s timeout — silent on failure.
    supabase.auth.getUser().then(({ data: { user } }) => {
      const uid = user?.id ?? userId
      if (!uid) return

      const timeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('timeout')), 5000)
      )
      const upsert = supabase.from('profiles').upsert(
        { id: uid, avatar_character: character, avatar_color: color },
        { onConflict: 'id' },
      )
      Promise.race([upsert, timeout])
        .then(({ error } = {}) => {
          if (error) console.log('[Profile] background sync error:', error.message)
          else console.log('[Profile] background sync complete')
        })
        .catch(err => console.log('[Profile] background sync failed:', err.message))
    })
  }

  const avatar = { character: avatarCharacter, color: avatarColor }

  return (
    <ProfileContext.Provider value={{ avatar, saveAvatar, profileLoaded }}>
      {children}
    </ProfileContext.Provider>
  )
}

export function useProfile() { return useContext(ProfileContext) }
