import { createContext, useContext, useState } from 'react'

const ThemeContext = createContext(null)

export function ThemeProvider({ children }) {
  const [darkMode, setDarkMode] = useState(() => {
    try { return localStorage.getItem('pathwaycs-darkmode') === 'true' }
    catch { return false }
  })

  function toggleDarkMode() {
    setDarkMode(prev => {
      const next = !prev
      try { localStorage.setItem('pathwaycs-darkmode', String(next)) } catch {}
      return next
    })
  }

  return (
    <ThemeContext.Provider value={{ darkMode, toggleDarkMode }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}
