/* Resumen del día — agrega agenda, hábitos, finanzas, entreno y objetivos. */

import { useMemo, useState, useEffect } from 'react'
import { usePD } from '../lib/store.js'
import { TODAY, addDays, weekStart, fmtDateLong, fmtMoney, uid } from '../lib/format.js'
import { netWorth, calcMonth, monthOffset, monthLabel } from '../lib/finance.js'
import { Card, Button, Stat, Ring, SectionTitle, EmptyState, Bars, ProgressBar, Pill, Modal, Field, IconButton, cls } from '../components/common.jsx'
import { Icon } from '../components/icons.jsx'
import { EVENT_TONE, EVENT_LABEL } from '../lib/constants.js'
import { fetchStripeStats } from '../lib/stripeStats.js'
import { fetchWalletStats } from '../lib/walletStats.js'

const HABIT_ICONS = ['drop', 'leaf', 'book', 'stretch', 'moon', 'flame', 'run', 'dumbbell', 'sun', 'clock', 'check', 'target']

export default function HomeView({ go }) {
  const [state, update] = usePD()
  const [managingHabits, setManagingHabits] = useState(false)
  const T = TODAY

  // Saldos en vivo (Stripe + cripto), en € — para sumarlos al patrimonio del inicio.
  // Opcionales: solo se consultan si hay una cartera configurada o un negocio con Stripe.
  const hasStripe = state.businesses.some((b) => b.stripe)
  const walletAddr = state.investments?.address || ''
  const [liveExtra, setLiveExtra] = useState(0) // suma en € de Stripe + cripto

  useEffect(() => {
    if (!walletAddr && !hasStripe) { setLiveExtra(0); return }
    let alive = true
    ;(async () => {
      let cryptoEur = 0
      let stripeEur = 0
      if (walletAddr) {
        try {
          const w = await fetchWalletStats(walletAddr)
          if (w?.eurUsd != null) cryptoEur = (w.morphoTotal || 0) * w.eurUsd
        } catch (e) { /* sin cripto */ }
      }
      if (hasStripe) {
        try {
          const s = await fetchStripeStats()
          const pick = (o) => (o ? (o.eur ?? Object.values(o)[0] ?? 0) : 0)
          stripeEur = (pick(s?.balanceAvailable) + pick(s?.balancePending)) / 100
        } catch (e) { /* sin stripe */ }
      }
      if (alive) setLiveExtra(cryptoEur + stripeEur)
    })()
    return () => { alive = false }
  }, [hasStripe, walletAddr])

  const metrics = useMemo(() => {
    const cur = calcMonth(state, monthOffset(0))
    const nw = netWorth(state)
    const ws = weekStart(T)
    const trainThisWeek = state.workouts.filter((w) => w.date >= ws && w.date <= T).length
    let streak = 0
    for (let i = 1; i < 90; i++) {
      const d = addDays(T, -i)
      const done = state.habits.filter((h) => h.log[d]).length
      if (state.habits.length && done / state.habits.length >= 0.6) streak++
      else break
    }
    return { inc: cur.inc, exp: cur.exp, balance: cur.balance, netWorth: nw, trainThisWeek, streak }
  }, [state])

  // Objetivo de patrimonio: se toma de tus objetivos de finanzas (si hay).
  const financeGoal = state.goals.find((g) => g.kind === 'finance' && !g.lowerIsBetter)

  const todayEvents = state.events.filter((e) => e.date === T).sort((a, b) => a.time.localeCompare(b.time))
  const habitsToday = state.habits
  const habitsDone = habitsToday.filter((h) => h.log[T]).length

  const months6 = useMemo(() => {
    const out = []
    for (let i = 5; i >= 0; i--) {
      const mk = monthOffset(-i)
      out.push({ label: monthLabel(mk), value: Math.round(calcMonth(state, mk).inc), tone: i === 0 ? 'blue' : 'ink' })
    }
    return out
  }, [state])

  const topGoals = state.goals.slice(0, 3)

  const toggleHabit = (id) => update((d) => {
    const h = d.habits.find((x) => x.id === id)
    if (h.log[T]) delete h.log[T]
    else h.log[T] = true
  })
  const addHabit = (name, icon) => update((d) => {
    d.habits.push({ id: uid(), name: name.trim(), icon: icon || 'leaf', color: 'green', log: {} })
  })
  const delHabit = (id) => update((d) => {
    d.habits = d.habits.filter((x) => x.id !== id)
  })

  const greeting = (() => {
    const hr = new Date().getHours()
    return hr < 14 ? 'Buenos días' : hr < 21 ? 'Buenas tardes' : 'Buenas noches'
  })()

  return (
    <div className="grid" style={{ gap: 18 }}>
      {/* saludo */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, marginBottom: 2 }}>
        <div>
          <div className="mono" style={{ fontSize: 12, color: 'var(--muted)', textTransform: 'capitalize' }}>{fmtDateLong(T)}</div>
          <h2 style={{ fontFamily: 'var(--display)', fontSize: 26, marginTop: 4 }}>{greeting}{state.profile.name ? `, ${state.profile.name}` : ''}.</h2>
        </div>
        <Button variant="accent" icon="play" onClick={() => go('training')}>Empezar entreno</Button>
      </div>

      {/* KPIs */}
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))' }}>
        <Card className="tint-ink">
          <Stat label="Balance del mes" value={fmtMoney(metrics.balance)} delta={metrics.inc > 0 ? fmtMoney(metrics.inc).replace(' €', '€') : null} deltaTone="up" sub={`de ${fmtMoney(metrics.inc)} ingresos`} />
        </Card>
        <Card>
          <Stat label="Patrimonio total" value={fmtMoney(Math.round(metrics.netWorth + liveExtra))} tone="blue" sub={financeGoal ? `objetivo ${fmtMoney(financeGoal.target)}` : null} />
        </Card>
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <Ring value={metrics.trainThisWeek} max={5} tone="green" label={metrics.trainThisWeek} sublabel="/ 5" size={58} stroke={7} />
            <div>
              <div className="stat-label">Entrenos esta semana</div>
              <div style={{ fontFamily: 'var(--display)', fontWeight: 600, marginTop: 3 }}>{metrics.trainThisWeek >= 4 ? 'En racha 🔥' : 'Sigue así'}</div>
              <div className="stat-sub" style={{ marginTop: 2 }}>meta 5/sem</div>
            </div>
          </div>
        </Card>
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Icon name="flame" size={26} style={{ color: 'var(--amber)' }} />
            <Stat label="Racha de hábitos" value={`${metrics.streak} días`} />
          </div>
        </Card>
      </div>

      {/* dos columnas */}
      <div className="grid home-cols" style={{ gridTemplateColumns: 'minmax(0,1.5fr) minmax(0,1fr)' }}>
        <div className="grid" style={{ gap: 18, alignContent: 'start' }}>
          <Card>
            <SectionTitle icon="calendar" right={<Button variant="soft" size="sm" onClick={() => go('calendar')}>Ver agenda</Button>}>Hoy</SectionTitle>
            {todayEvents.length === 0 ? (
              <EmptyState icon="calendar" title="Día libre" sub="No tienes eventos programados." />
            ) : (
              <div className="timeline">
                {todayEvents.map((e) => (
                  <div key={e.id} className="tl-row">
                    <div className="tl-time mono">{e.time}</div>
                    <div className={cls('tl-dot', `dot-${e.type}`)} />
                    <div className="tl-body">
                      <div className="tl-title">{e.title}</div>
                      <div className="tl-meta">
                        <Pill tone={EVENT_TONE[e.type] || 'neutral'}>{EVENT_LABEL[e.type] || e.type}</Pill>
                        <span className="muted" style={{ fontSize: 11.5 }}>{e.durationMin} min</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
          <Card>
            <SectionTitle icon="wallet" sub="Ingresos por mes" right={<Button variant="soft" size="sm" onClick={() => go('finance')}>Finanzas</Button>}>Tendencia de ingresos</SectionTitle>
            <Bars data={months6} height={130} showVals fmt={(v) => (v >= 1000 ? (v / 1000).toFixed(1) + 'k' : v)} />
          </Card>
        </div>

        <div className="grid" style={{ gap: 18, alignContent: 'start' }}>
          <Card>
            <SectionTitle
              icon="check"
              right={
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Pill tone={habitsToday.length > 0 && habitsDone === habitsToday.length ? 'green' : 'neutral'}>{habitsDone}/{habitsToday.length}</Pill>
                  <IconButton name="plus" size={16} label="Gestionar hábitos" onClick={() => setManagingHabits(true)} />
                </div>
              }
            >
              Hábitos de hoy
            </SectionTitle>
            {habitsToday.length === 0 ? (
              <EmptyState icon="check" title="Sin hábitos" sub="Pulsa + para crear tus hábitos diarios." />
            ) : (
              <div className="grid" style={{ gap: 8 }}>
                {habitsToday.map((h) => {
                  const done = !!h.log[T]
                  return (
                    <button key={h.id} className={cls('habit-row', done && 'habit-done')} onClick={() => toggleHabit(h.id)}>
                      <span className={cls('check-box', done && 'check-on')}>{done && <Icon name="check" size={13} stroke={3} />}</span>
                      <Icon name={h.icon} size={16} style={{ color: done ? 'var(--green)' : 'var(--faint)' }} />
                      <span className="habit-name">{h.name}</span>
                    </button>
                  )
                })}
              </div>
            )}
          </Card>
          <Card>
            <SectionTitle icon="target" right={<Button variant="soft" size="sm" onClick={() => go('goals')}>Todos</Button>}>Objetivos</SectionTitle>
            {topGoals.length === 0 ? (
              <EmptyState icon="target" title="Sin objetivos" sub="Créalos en la sección Objetivos." />
            ) : (
              <div className="grid" style={{ gap: 14 }}>
                {topGoals.map((g) => {
                  const pct = g.lowerIsBetter
                    ? Math.max(0, Math.min(100, ((g.start || g.current * 1.1) - g.current) / ((g.start || g.current * 1.1) - g.target) * 100))
                    : (g.current / g.target) * 100
                  const tone = g.kind === 'finance' ? 'blue' : g.kind === 'fitness' ? 'green' : 'amber'
                  return (
                    <div key={g.id}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, gap: 8 }}>
                        <span style={{ fontSize: 12.5, fontWeight: 500 }}>{g.title}</span>
                        <span className="mono" style={{ fontSize: 11.5, color: 'var(--muted)' }}>{Math.round(pct)}%</span>
                      </div>
                      <ProgressBar value={pct} max={100} tone={tone} />
                    </div>
                  )
                })}
              </div>
            )}
          </Card>
        </div>
      </div>

      {managingHabits && <HabitsModal habits={state.habits} onAdd={addHabit} onDelete={delHabit} onClose={() => setManagingHabits(false)} />}
    </div>
  )
}

function HabitsModal({ habits, onAdd, onDelete, onClose }) {
  const [name, setName] = useState('')
  const [icon, setIcon] = useState('leaf')
  const add = () => {
    if (!name.trim()) return
    onAdd(name, icon)
    setName('')
    setIcon('leaf')
  }
  return (
    <Modal title="Hábitos" onClose={onClose} footer={<Button variant="primary" onClick={onClose}>Cerrar</Button>}>
      {habits.length === 0 ? (
        <div className="muted" style={{ fontSize: 12.5 }}>Aún no tienes hábitos. Crea el primero abajo.</div>
      ) : (
        <div className="grid" style={{ gap: 8 }}>
          {habits.map((h) => (
            <div key={h.id} className="habit-row" style={{ cursor: 'default' }}>
              <Icon name={h.icon} size={16} style={{ color: 'var(--muted)' }} />
              <span className="habit-name">{h.name}</span>
              <IconButton name="trash" size={15} label="Eliminar hábito" onClick={() => onDelete(h.id)} />
            </div>
          ))}
        </div>
      )}
      <div className="hr" style={{ margin: '4px 0' }} />
      <Field label="Nuevo hábito">
        <input value={name} autoFocus placeholder="p. ej. Meditar 10 min" onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} />
      </Field>
      <div>
        <div className="field-label" style={{ marginBottom: 6 }}>Icono</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {HABIT_ICONS.map((ic) => (
            <button key={ic} type="button" className={cls('icon-btn', icon === ic && 'icon-btn-active')} onClick={() => setIcon(ic)} title={ic}>
              <Icon name={ic} size={16} />
            </button>
          ))}
        </div>
      </div>
      <Button variant="soft" icon="plus" onClick={add}>Añadir hábito</Button>
    </Modal>
  )
}
