/* Pantalla de acceso (email + contraseña) + acceso al modo demo.
   Las cuentas se crean en el panel de Supabase (o activa el registro público;
   ver README). El modo demo usa "Anonymous Sign-In" de Supabase: cada visitante
   recibe una sesión propia y desechable con datos de ejemplo. */

import { useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { Button } from './common.jsx'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [demoLoading, setDemoLoading] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    setLoading(false)
    if (error) setError('No se pudo iniciar sesión. Revisa el email y la contraseña.')
  }

  const enterDemo = async () => {
    setError('')
    setDemoLoading(true)
    const { error } = await supabase.auth.signInAnonymously()
    setDemoLoading(false)
    if (error) setError('El modo demo no está disponible. Activa "Anonymous sign-ins" en Supabase (Auth → Providers).')
  }

  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 20, background: 'var(--bg)' }}>
      <div className="card" style={{ width: '100%', maxWidth: 360, padding: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 20 }}>
          <div className="brand-mark">P</div>
          <div>
            <div className="brand-name">Panel</div>
            <div className="brand-sub">Tu día, en orden</div>
          </div>
        </div>
        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <label className="field">
            <span className="field-label">Email</span>
            <input type="email" value={email} autoFocus autoComplete="username" placeholder="tu@email.com" onChange={(e) => setEmail(e.target.value)} />
          </label>
          <label className="field">
            <span className="field-label">Contraseña</span>
            <input type="password" value={password} autoComplete="current-password" placeholder="••••••••" onChange={(e) => setPassword(e.target.value)} />
          </label>
          {error && <div style={{ fontSize: 12.5, color: 'var(--red)' }}>{error}</div>}
          <div style={{ marginTop: 4 }}>
            <Button type="submit" variant="primary" disabled={loading || !email || !password} style={{ width: '100%' }}>
              {loading ? 'Entrando…' : 'Entrar'}
            </Button>
          </div>
        </form>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '18px 0 14px' }}>
          <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
          <span className="muted" style={{ fontSize: 11 }}>o</span>
          <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
        </div>

        <Button variant="soft" onClick={enterDemo} disabled={demoLoading} style={{ width: '100%' }}>
          {demoLoading ? 'Cargando demo…' : 'Ver demo'}
        </Button>
        <div className="muted" style={{ fontSize: 11, textAlign: 'center', marginTop: 8 }}>
          Entra sin registrarte y explora la app con datos de ejemplo.
        </div>
      </div>
    </div>
  )
}
