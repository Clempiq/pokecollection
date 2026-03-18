import { createContext, useState, useEffect } from 'react'

export const ThemeContext = createContext()

const THEMES = {
  dark: {
    '--bg-primary': '#0f172a',
    '--bg-secondary': '#1e293b',
    '--bg-tertiary': '#334155',
    '--text-primary': '#f1f5f9',
    '--text-secondary': '#cbd5e1',
    '--text-muted': '#94a3b8',
    '--border-light': '#475569',
    '--border-strong': '#64748b',
    '--pokemon-blue': '#3b82f6',
    '--pokemon-red': '#ef4444',
    '--yellow': '#fbbf24',
  },
  light: {
    '--bg-primary': '#ffffff',
    '--bg-secondary': '#f8fafc',
    '--bg-tertiary': '#f1f5f9',
    '--text-primary': '#0f172a',
    '--text-secondary': '#334155',
    '--text-muted': '#94a3b8',
    '--border-light': '#e2e8f0',
    '--border-strong': '#cbd5e1',
    '--pokemon-blue': '#3b82f6',
    '--pokemon-red': '#ef4444',
    '--yellow': '#fbbf24',
  },
  vivid: {
    '--bg-primary': '#0a0e27',
    '--bg-secondary': '#151d3b',
    '--bg-tertiary': '#1f2937',
    '--text-primary': '#fef08a',
    '--text-secondary': '#fbbf24',
    '--text-muted': '#f59e0b',
    '--border-light': '#d97706',
    '--border-strong': '#b45309',
    '--pokemon-blue': '#00d9ff',
    '--pokemon-red': '#ff006e',
    '--yellow': '#ffd60a',
  },
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('theme') || 'dark'
  })

  useEffect(() => {
    localStorage.setItem('theme', theme)
    document.documentElement.setAttribute('data-theme', theme)
    const vars = THEMES[theme]
    Object.entries(vars).forEach(([key, value]) => {
      document.documentElement.style.setProperty(key, value)
    })
  }, [theme])

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}
