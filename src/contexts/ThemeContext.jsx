/**
 * ThemeContext — 3 themes : dark (défaut), light, vivid
 * Persisté dans localStorage ('theme').
 * Applique data-theme sur <html> pour que les overrides CSS fonctionnent.
 */
import { createContext, useContext, useEffect, useState } from 'react'

export const THEMES = [
  { id: 'dark',  label: 'Dark',  icon: '🌙' },
  { id: 'light', label: 'Light', icon: '☀️' },
  { id: 'vivid', label: 'Vivid', icon: '✨' },
]

const ThemeContext = createContext({ theme: 'dark', setTheme: () => {}, themes: THEMES })

export function ThemeProvider({ children }) {
  const [theme, setThemeRaw] = useState(
    () => localStorage.getItem('theme') || 'dark'
  )

  const setTheme = (t) => {
    setThemeRaw(t)
    localStorage.setItem('theme', t)
  }

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  // Apply on first render (before React hydration)
  // handled by the initializer above + the effect

  return (
    <ThemeContext.Provider value={{ theme, setTheme, themes: THEMES }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}
