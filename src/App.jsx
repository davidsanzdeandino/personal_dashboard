import { useState, useEffect } from 'react'
import { Icon } from './components/icons.jsx'
import { useTheme } from './lib/theme.js'
import { store, usePD } from './lib/store.js'
import { supabase } from './lib/supabase.js'
import { startSync, stopSync, useSyncStatus } from './lib/sync.js'
import { demoState } from './lib/demoData.js'
import SettingsModal from './components/SettingsModal.jsx'
import Login from './components/Login.jsx'
import HomeView from './sections/home.jsx'
import CalendarView from './sections/calendar.jsx'
import TrainingView from './sections/training.jsx'
import FinanceView from './sections/finance.jsx'
import GoalsView from './sections/goals.jsx'

const NAV = [
  { id: 'home', label: 'Resumen', icon: 'home' },
  { id: 'calendar', label: 'Calendario', icon: 'calendar' },
  { id: 'training', label: 'Entrenamiento', icon: 'dumbbell' },
  { id: 'finance', label: 'Finanzas', icon: 'wallet' },
  { id: 'goals', label: 'Objetivos', icon: 'target' },
]

const TITLES = { home: 'Resumen', calendar: 'Calendario', training: 'Entrenamiento', finance: 'Finanzas', goals: 'Objetivos' }

const VIEWS = {
  home: HomeView,
  calendar: CalendarView,
  training: TrainingView,
  finance: FinanceView,
  goals: GoalsView,
}

const SYNC_TEXT = { syncing: 'Sincronizando…', synced: 'Sincronizado', offline: 'Sin conexión', error: 'Error de sync' }
const SYNC_TONE = { syncing: 'var(--muted)', synced: 'var(--green)', offline: 'var(--amber)', error: 'var(--red)' }

function isEmptyState(s) {
  if (!s) return true
  return !(
    (s.accounts || []).length || (s.movements || []).length || (s.workouts || []).length ||
    (s.events || []).length || (s.goals || []).length || (s.habits || []).length ||
    (s.businesses || []).length
  )
}

export default function App() {
  const [session, setSession] = useState(undefined) // undefined = cargando
  const [pd] = usePD()
  const [view, setView] = useState(() => localStorage.getItem('pd_view') || 'home')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [t, setTweak] = useTheme()
  const syncStatus = useSyncStatus()

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  // Modo demo: para una sesión anónima, carga datos de ejemplo una sola vez
  // (si el estado está vacío). Se ejecuta antes de arrancar la sincronización.
  useEffect(() => {
    if (session?.user?.is_anonymous && !sessionStorage.getItem('pd_demo_seeded')) {
      sessionStorage.setItem('pd_demo_seeded', '1')
      if (isEmptyState(store.getState())) store.setState(demoState())
    }
  }, [session])

  useEffect(() => {
    if (session) {
      startSync()
      return () => stopSync()
    }
  }, [session])

  const go = (v) => { setView(v); localStorage.setItem('pd_view', v); window.scrollTo(0, 0) }
  const resetData = () => { if (confirm('¿Vaciar TODOS los datos? Esta acción no se puede deshacer.')) { store.reset(); setSettingsOpen(false) } }
  const logout = async () => { setSettingsOpen(false); sessionStorage.removeItem('pd_demo_seeded'); await supabase.auth.signOut() }

  if (session === undefined) {
    return <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', color: 'var(--muted)' }}>Cargando…</div>
  }
  if (!session) {
    return <Login />
  }

  const Current = VIEWS[view]
  const isDemo = !!session.user?.is_anonymous
  const initial = (pd.profile?.name || '').trim().charAt(0).toUpperCase() || '·'

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">P</div>
          <div>
            <div className="brand-name">Panel</div>
            <div className="brand-sub">Tu día, en orden</div>
          </div>
        </div>
        {NAV.map((n) => (
          <button key={n.id} className={'nav-item' + (view === n.id ? ' active' : '')} onClick={() => go(n.id)}>
            <Icon name={n.icon} size={18} />
            <span>{n.label}</span>
          </button>
        ))}
        <div className="nav-spacer" />
        <div className="nav-foot">
          <button className="nav-item" onClick={() => setSettingsOpen(true)}>
            <Icon name="settings" size={18} />
            <span>Ajustes</span>
          </button>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <div>
            <div className="crumb">Panel personal</div>
            <h1>{TITLES[view]}</h1>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {SYNC_TEXT[syncStatus] && (
              <span className="mono" style={{ fontSize: 11, color: SYNC_TONE[syncStatus], display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: SYNC_TONE[syncStatus], flexShrink: 0 }} />
                <span className="sync-text">{SYNC_TEXT[syncStatus]}</span>
              </span>
            )}
            <button className="icon-btn" aria-label="Ajustes" title="Ajustes" onClick={() => setSettingsOpen(true)}>
              <Icon name="settings" size={18} />
            </button>
            <button className="icon-btn" aria-label="Notificaciones" title="Notificaciones">
              <Icon name="bell" size={18} />
            </button>
            <div className="avatar">{initial}</div>
          </div>
        </header>

        {isDemo && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
            margin: '0 0 4px', padding: '10px 14px', borderRadius: 'var(--radius-sm)',
            background: 'var(--blue-soft)', color: 'var(--ink-soft)', fontSize: 12.5,
            border: '1px solid var(--border)',
          }}>
            <Icon name="target" size={16} style={{ color: 'var(--blue)', flexShrink: 0 }} />
            <span><strong>Modo demo.</strong> Los datos son de ejemplo: edítalos o bórralos libremente, no afectan a nadie.</span>
          </div>
        )}

        <main className="content">
          {Current ? <Current go={go} /> : null}
        </main>
      </div>

      <nav className="mobile-nav">
        {NAV.map((n) => (
          <button key={n.id} className={'mnav-item' + (view === n.id ? ' active' : '')} onClick={() => go(n.id)}>
            <Icon name={n.icon} size={21} />
            <span>{n.label}</span>
          </button>
        ))}
      </nav>

      {settingsOpen && <SettingsModal t={t} setTweak={setTweak} onReset={resetData} onLogout={logout} onClose={() => setSettingsOpen(false)} />}
    </div>
  )
}
