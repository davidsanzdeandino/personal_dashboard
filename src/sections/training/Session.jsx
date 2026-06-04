/* Pestaña Sesión — sesión activa con cronómetro, descanso con sonido y registro.
   Al empezar puedes cargar una rutina guardada de ese deporte.
   Cada serie de fuerza guarda objetivo (target*) y real (reps/weight);
   lo que queda por debajo del objetivo se resalta en ámbar. */

import { useState, useEffect, useRef } from 'react'
import { usePD } from '../../lib/store.js'
import { TODAY, uid, fmtDuration } from '../../lib/format.js'
import { Card, Button, SectionTitle, EmptyState, Field, IconButton, ProgressBar, Modal } from '../../components/common.jsx'
import { Icon, SPORT_ICON } from '../../components/icons.jsx'
import { SPORTS, SPORT_LABEL } from './constants.js'

const ASESS_KEY = 'pd_active_session'
const isStrengthSport = (sport) => SPORTS.find((s) => s.id === sport)?.kind === 'strength'

// ---- beep (Web Audio) ----
let audioCtx = null
function beep(times = 3) {
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)()
    if (audioCtx.state === 'suspended') audioCtx.resume()
    for (let i = 0; i < times; i++) {
      const o = audioCtx.createOscillator()
      const g = audioCtx.createGain()
      const t = audioCtx.currentTime + i * 0.22
      o.frequency.value = i === times - 1 ? 1040 : 760
      o.connect(g)
      g.connect(audioCtx.destination)
      g.gain.setValueAtTime(0.0001, t)
      g.gain.exponentialRampToValueAtTime(0.25, t + 0.02)
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18)
      o.start(t)
      o.stop(t + 0.2)
    }
  } catch (e) { /* sin audio */ }
}

function loadSession() {
  try {
    return JSON.parse(localStorage.getItem(ASESS_KEY))
  } catch (e) {
    return null
  }
}
function saveSession(s) {
  if (s) localStorage.setItem(ASESS_KEY, JSON.stringify(s))
  else localStorage.removeItem(ASESS_KEY)
}

function routineSummary(r) {
  if (r.exercises) {
    const sets = r.exercises.reduce((a, e) => a + e.sets.length, 0)
    return `${r.exercises.length} ejercicios · ${sets} series`
  }
  const bits = []
  if (r.targetDistanceKm) bits.push(`${r.targetDistanceKm} km`)
  if (r.targetDurationMin) bits.push(`${r.targetDurationMin} min`)
  if (r.targetRounds) bits.push(`${r.targetRounds} rounds`)
  return bits.join(' · ') || 'Sin objetivos'
}

// Construye una sesión nueva (vacía o desde una rutina).
function buildSession(sport, routine) {
  const s = {
    sport, routineName: routine ? routine.name : null,
    startedAt: Date.now(), accum: 0, running: true,
    exercises: null, distanceKm: '', rounds: '', notes: '', target: null,
  }
  if (isStrengthSport(sport)) {
    s.exercises = routine && routine.exercises
      ? routine.exercises.map((e) => ({
          name: e.name,
          sets: e.sets.map((st) => ({
            targetReps: st.targetReps ?? null,
            targetWeight: st.targetWeight ?? null,
            reps: st.targetReps ?? 0,
            weight: st.targetWeight ?? 0,
            restSec: st.restSec ?? 90,
          })),
        }))
      : []
  } else if (routine) {
    s.notes = routine.notes || ''
    s.target = {
      distanceKm: routine.targetDistanceKm ?? null,
      durationMin: routine.targetDurationMin ?? null,
      rounds: routine.targetRounds ?? null,
    }
  }
  return s
}

export default function Session() {
  const [state, pdUpdate] = usePD()
  const [session, setSession] = useState(loadSession)
  const [picking, setPicking] = useState(null) // sport mientras se elige rutina

  const updateSession = (fn) => setSession((prev) => {
    const n = structuredClone(prev)
    fn(n)
    saveSession(n)
    return n
  })

  const routines = state.routines || []

  const begin = (sport, routine) => {
    const s = buildSession(sport, routine)
    saveSession(s)
    setSession(s)
    setPicking(null)
    beep(1)
  }

  const onPickSport = (sport) => {
    if (routines.some((r) => r.sport === sport)) setPicking(sport)
    else begin(sport, null)
  }

  const discard = () => {
    if (confirm('¿Descartar la sesión actual?')) {
      saveSession(null)
      setSession(null)
    }
  }

  const finish = () => {
    const elapsed = session.accum + (session.running ? Date.now() - session.startedAt : 0)
    const w = {
      id: uid(), date: TODAY, sport: session.sport,
      name: session.routineName || SPORT_LABEL[session.sport],
      durationSec: Math.round(elapsed / 1000), notes: session.notes,
    }
    if (session.exercises) {
      w.exercises = session.exercises
      w.volume = session.exercises.reduce((a, e) => a + e.sets.reduce((b, st) => b + (st.reps || 0) * (st.weight || 0), 0), 0)
    }
    if (session.distanceKm) w.distanceKm = +session.distanceKm
    if (session.rounds) w.rounds = +session.rounds
    pdUpdate((d) => d.workouts.unshift(w))
    saveSession(null)
    setSession(null)
    beep(2)
  }

  if (!session) {
    return (
      <>
        <Card>
          <SectionTitle icon="dumbbell" sub="Elige el deporte para empezar a registrar">Nueva sesión</SectionTitle>
          <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(120px,1fr))', gap: 10 }}>
            {SPORTS.map((s) => (
              <button key={s.id} className="sport-pick" onClick={() => onPickSport(s.id)}>
                <Icon name={SPORT_ICON[s.id]} size={26} />
                <span>{s.label}</span>
                <span className="sport-kind">{s.kind === 'strength' ? 'Fuerza' : 'Cardio'}</span>
              </button>
            ))}
          </div>
        </Card>

        {picking && (
          <Modal title={`Empezar ${SPORT_LABEL[picking]}`} onClose={() => setPicking(null)}>
            <Button variant="ghost" icon="plus" onClick={() => begin(picking, null)} style={{ width: '100%', justifyContent: 'flex-start' }}>
              Empezar vacío
            </Button>
            <div className="grid" style={{ gap: 8 }}>
              {routines.filter((r) => r.sport === picking).map((r) => (
                <button key={r.id} className="ev-row" onClick={() => begin(picking, r)} style={{ width: '100%', textAlign: 'left' }}>
                  <div className="hist-icon"><Icon name={SPORT_ICON[r.sport]} size={18} /></div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 13.5 }}>{r.name}</div>
                    <div className="muted" style={{ fontSize: 11.5 }}>{routineSummary(r)}</div>
                  </div>
                </button>
              ))}
            </div>
          </Modal>
        )}
      </>
    )
  }
  return <ActiveSession session={session} update={updateSession} finish={finish} discard={discard} />
}

function ActiveSession({ session, update, finish, discard }) {
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 250)
    return () => clearInterval(t)
  }, [])
  const elapsed = Math.floor((session.accum + (session.running ? now - session.startedAt : 0)) / 1000)

  const toggleRun = () => update((s) => {
    if (s.running) {
      s.accum += Date.now() - s.startedAt
      s.running = false
    } else {
      s.startedAt = Date.now()
      s.running = true
    }
  })

  // ---- descanso (robusto en StrictMode: updater puro; cierre/pitido en efecto) ----
  const [rest, setRest] = useState(null)
  const restRef = useRef(null)
  const startRest = (sec) => {
    clearInterval(restRef.current)
    setRest({ remaining: sec, total: sec })
    beep(1)
    restRef.current = setInterval(() => {
      setRest((r) => (r ? { ...r, remaining: r.remaining - 1 } : r))
    }, 1000)
  }
  const stopRest = () => {
    clearInterval(restRef.current)
    restRef.current = null
    setRest(null)
  }
  useEffect(() => {
    if (rest && rest.remaining <= 0) {
      clearInterval(restRef.current)
      restRef.current = null
      beep(3)
      setRest(null)
    }
  }, [rest])
  useEffect(() => () => clearInterval(restRef.current), [])

  const isStrength = !!session.exercises

  return (
    <div className="grid" style={{ gap: 16 }}>
      <Card className="tint-ink" style={{ position: 'relative', overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div className="session-icon"><Icon name={SPORT_ICON[session.sport]} size={24} /></div>
            <div>
              <div style={{ fontSize: 12, color: 'oklch(0.8 0.01 260)' }}>
                En curso · {SPORT_LABEL[session.sport]}{session.routineName ? ' — ' + session.routineName : ''}
              </div>
              <div className="big-timer">{fmtDuration(elapsed)}</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="round-btn" onClick={toggleRun} title={session.running ? 'Pausar' : 'Reanudar'}>
              <Icon name={session.running ? 'pause' : 'play'} size={20} />
            </button>
            <Button variant="ghost" size="sm" onClick={discard} style={{ background: 'transparent', color: 'oklch(0.85 0.01 260)', borderColor: 'oklch(0.4 0.01 260)' }}>Descartar</Button>
            <Button variant="accent" size="sm" icon="check" onClick={finish}>Finalizar</Button>
          </div>
        </div>
      </Card>

      {rest && (
        <div className="rest-overlay">
          <div className="rest-card">
            <div className="rest-label">Descanso</div>
            <div className="rest-count">{fmtDuration(Math.max(0, rest.remaining))}</div>
            <ProgressBar value={rest.total - rest.remaining} max={rest.total} tone="amber" height={6} />
            <div style={{ display: 'flex', gap: 8, marginTop: 14, justifyContent: 'center' }}>
              <Button variant="soft" size="sm" onClick={() => setRest((r) => (r ? { ...r, remaining: r.remaining + 15 } : r))}>+15 s</Button>
              <Button variant="primary" size="sm" onClick={stopRest}>Saltar</Button>
            </div>
          </div>
        </div>
      )}

      {isStrength
        ? <StrengthLogger session={session} update={update} startRest={startRest} />
        : <CardioLogger session={session} update={update} startRest={startRest} />}
    </div>
  )
}

function StrengthLogger({ session, update, startRest }) {
  const [newName, setNewName] = useState('')
  const addExercise = () => {
    if (!newName.trim()) return
    update((s) => s.exercises.push({ name: newName.trim(), sets: [{ targetReps: null, targetWeight: null, reps: 8, weight: 0, restSec: 90 }] }))
    setNewName('')
  }
  const addSet = (ei) => update((s) => {
    const ex = s.exercises[ei]
    const last = ex.sets[ex.sets.length - 1]
    ex.sets.push(last
      ? { targetReps: last.targetReps ?? null, targetWeight: last.targetWeight ?? null, reps: last.reps, weight: last.weight, restSec: last.restSec }
      : { targetReps: null, targetWeight: null, reps: 8, weight: 0, restSec: 90 })
  })
  const setField = (ei, si, k, v) => update((s) => { s.exercises[ei].sets[si][k] = v })
  const delSet = (ei, si) => update((s) => s.exercises[ei].sets.splice(si, 1))
  const delEx = (ei) => update((s) => s.exercises.splice(ei, 1))

  return (
    <div className="grid" style={{ gap: 14 }}>
      {session.exercises.length === 0 && (
        <Card><EmptyState icon="dumbbell" title="Añade tu primer ejercicio" sub="Registra series, repeticiones, peso y descanso." /></Card>
      )}
      {session.exercises.map((ex, ei) => (
        <Card key={ei}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3 style={{ fontSize: 15 }}>{ex.name}</h3>
            <IconButton name="trash" size={16} label="Eliminar ejercicio" onClick={() => delEx(ei)} />
          </div>
          <div className="set-head">
            <span>#</span>
            <span>Reps</span>
            <span>Peso (kg)</span>
            <span>Descanso</span>
            <span />
          </div>
          {ex.sets.map((st, si) => {
            const repTarget = st.targetReps != null
            const wTarget = st.targetWeight != null && st.targetWeight > 0
            const repMiss = repTarget && st.reps < st.targetReps
            const wMiss = wTarget && st.weight < st.targetWeight
            return (
              <div key={si} className="set-row">
                <span className="set-idx mono">{si + 1}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <input type="number" value={st.reps} min={0} onChange={(e) => setField(ei, si, 'reps', +e.target.value)} style={{ flex: 1, minWidth: 0, ...(repMiss ? { color: 'var(--amber)', fontWeight: 600 } : {}) }} />
                  {repTarget && <span className="mono" style={{ fontSize: 11, color: 'var(--faint)' }}>/{st.targetReps}</span>}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <input type="number" value={st.weight} min={0} step={0.5} onChange={(e) => setField(ei, si, 'weight', +e.target.value)} style={{ flex: 1, minWidth: 0, ...(wMiss ? { color: 'var(--amber)', fontWeight: 600 } : {}) }} />
                  {wTarget && <span className="mono" style={{ fontSize: 11, color: 'var(--faint)' }}>/{st.targetWeight}</span>}
                </div>
                <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
                  <input type="number" value={st.restSec} min={0} step={15} style={{ width: 64 }} onChange={(e) => setField(ei, si, 'restSec', +e.target.value)} />
                  <button className="rest-btn" title="Iniciar descanso" onClick={() => startRest(st.restSec)}><Icon name="clock" size={15} /></button>
                </div>
                <IconButton name="x" size={14} label="Quitar serie" onClick={() => delSet(ei, si)} />
              </div>
            )
          })}
          <Button variant="soft" size="sm" icon="plus" onClick={() => addSet(ei)} style={{ marginTop: 10 }}>Añadir serie</Button>
        </Card>
      ))}
      <Card className="flat" style={{ background: 'var(--surface-2)' }}>
        <div style={{ display: 'flex', gap: 10 }}>
          <input value={newName} placeholder="Nuevo ejercicio (p. ej. Sentadilla)" onChange={(e) => setNewName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addExercise()} />
          <Button variant="primary" icon="plus" onClick={addExercise}>Ejercicio</Button>
        </div>
      </Card>
    </div>
  )
}

function CardioLogger({ session, update, startRest }) {
  const isDist = ['running', 'natacion', 'bici'].includes(session.sport)
  const tgt = session.target
  const tgtText = tgt
    ? [tgt.distanceKm && `${tgt.distanceKm} km`, tgt.durationMin && `${tgt.durationMin} min`, tgt.rounds && `${tgt.rounds} rounds`].filter(Boolean).join(' · ')
    : ''
  return (
    <Card>
      <SectionTitle icon={SPORT_ICON[session.sport]}>Datos de la sesión</SectionTitle>
      {tgtText && <div className="muted" style={{ fontSize: 12, marginBottom: 4 }}>Objetivo: {tgtText}</div>}
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: 14 }}>
        {isDist && (
          <Field label="Distancia (km)">
            <input type="number" step={0.1} value={session.distanceKm} placeholder="0.0" onChange={(e) => update((s) => { s.distanceKm = e.target.value })} />
          </Field>
        )}
        {session.sport === 'boxeo' && (
          <Field label="Rounds">
            <input type="number" value={session.rounds} placeholder="0" onChange={(e) => update((s) => { s.rounds = e.target.value })} />
          </Field>
        )}
      </div>
      <div style={{ marginTop: 16 }}>
        <div className="field-label" style={{ marginBottom: 8 }}>Temporizador de intervalos</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {[30, 60, 90, 120, 180].map((sec) => (
            <Button key={sec} variant="ghost" size="sm" icon="clock" onClick={() => startRest(sec)}>{sec}s</Button>
          ))}
        </div>
      </div>
      <Field label="Notas" hint="Sensaciones, ritmo, etc.">
        <textarea value={session.notes} placeholder="¿Cómo ha ido?" onChange={(e) => update((s) => { s.notes = e.target.value })} />
      </Field>
    </Card>
  )
}