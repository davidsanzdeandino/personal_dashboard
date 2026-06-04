/* Tema/apariencia: acentos, fuente, densidad, esquinas, modo oscuro.
   Aplica variables CSS sobre :root y persiste la elección en localStorage. */

import { useState, useEffect } from 'react'

const KEY = 'pd_theme'

export const ACCENTS = {
  'Azul + verde': { blue: 'oklch(0.55 0.09 250)', green: 'oklch(0.62 0.07 162)' },
  'Ámbar + tierra': { blue: 'oklch(0.58 0.1 55)', green: 'oklch(0.55 0.06 145)' },
  'Violeta + cian': { blue: 'oklch(0.55 0.13 290)', green: 'oklch(0.62 0.09 200)' },
  'Carmesí + oliva': { blue: 'oklch(0.55 0.13 18)', green: 'oklch(0.58 0.07 125)' },
  'Monocromo': { blue: 'oklch(0.4 0.012 260)', green: 'oklch(0.55 0.012 260)' },
}

export const FONTS = {
  'IBM Plex': { sans: '"IBM Plex Sans", system-ui, sans-serif', display: '"Space Grotesk", system-ui, sans-serif' },
  'Helvetica': { sans: '"Helvetica Neue", Helvetica, Arial, sans-serif', display: '"Helvetica Neue", Helvetica, Arial, sans-serif' },
  'Grotesk': { sans: '"Space Grotesk", system-ui, sans-serif', display: '"Space Grotesk", system-ui, sans-serif' },
}

export const DENSITY = {
  compacta: { pad: '13px', gap: '11px' },
  normal: { pad: '18px', gap: '16px' },
  amplia: { pad: '24px', gap: '22px' },
}

export const THEME_DEFAULTS = { accent: 'Azul + verde', font: 'IBM Plex', density: 'normal', rounded: true, dark: false }

export function applyTheme(t) {
  const r = document.documentElement.style
  const a = ACCENTS[t.accent] || ACCENTS['Azul + verde']
  r.setProperty('--blue', a.blue)
  r.setProperty('--green', a.green)
  r.setProperty('--blue-soft', a.blue.replace(/[\d.]+ [\d.]+ /, '0.95 0.03 '))
  r.setProperty('--green-soft', a.green.replace(/[\d.]+ [\d.]+ /, '0.95 0.03 '))
  const f = FONTS[t.font] || FONTS['IBM Plex']
  r.setProperty('--sans', f.sans)
  r.setProperty('--display', f.display)
  const d = DENSITY[t.density] || DENSITY.normal
  r.setProperty('--pad-card', d.pad)
  r.setProperty('--gap', d.gap)
  r.setProperty('--radius', t.rounded ? '16px' : '8px')
  r.setProperty('--radius-sm', t.rounded ? '10px' : '6px')
  if (t.dark) {
    r.setProperty('--bg', 'oklch(0.20 0.008 260)')
    r.setProperty('--bg-deep', 'oklch(0.25 0.008 260)')
    r.setProperty('--surface', 'oklch(0.24 0.009 260)')
    r.setProperty('--surface-2', 'oklch(0.27 0.009 260)')
    r.setProperty('--ink', 'oklch(0.95 0.005 260)')
    r.setProperty('--ink-soft', 'oklch(0.84 0.006 260)')
    r.setProperty('--muted', 'oklch(0.66 0.008 260)')
    r.setProperty('--faint', 'oklch(0.5 0.008 260)')
    r.setProperty('--border', 'oklch(0.32 0.008 260)')
    r.setProperty('--border-strong', 'oklch(0.4 0.008 260)')
    r.setProperty('--track', 'oklch(0.32 0.008 260)')
    r.setProperty('--topbar-bg', 'oklch(0.22 0.008 260 / 0.8)')
    r.setProperty('--mobilenav-bg', 'oklch(0.24 0.009 260 / 0.9)')
  } else {
    ;['--bg', '--bg-deep', '--surface', '--surface-2', '--ink', '--ink-soft', '--muted', '--faint', '--border', '--border-strong', '--track', '--topbar-bg', '--mobilenav-bg'].forEach((k) => r.removeProperty(k))
  }
}

export function useTheme() {
  const [t, setT] = useState(() => {
    try {
      const raw = localStorage.getItem(KEY)
      if (raw) return { ...THEME_DEFAULTS, ...JSON.parse(raw) }
    } catch (e) { /* ignorar */ }
    return THEME_DEFAULTS
  })
  useEffect(() => {
    applyTheme(t)
    try { localStorage.setItem(KEY, JSON.stringify(t)) } catch (e) { /* ignorar */ }
  }, [t])
  const setTweak = (k, v) => setT((prev) => ({ ...prev, [k]: v }))
  return [t, setTweak]
}