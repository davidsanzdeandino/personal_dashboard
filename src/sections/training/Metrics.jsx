/* Pestaña Métricas — resumen semanal/mensual + adherencia (series cumplidas). */

import { useState, useMemo } from 'react'
import { usePD } from '../../lib/store.js'
import { TODAY, addDays, weekStart, fmtDuration } from '../../lib/format.js'
import { Card, Stat, SectionTitle, EmptyState, Bars, ProgressBar, Segmented } from '../../components/common.jsx'
import { Icon, SPORT_ICON } from '../../components/icons.jsx'
import { SPORTS } from './constants.js'

// ¿la serie con objetivo se cumplió? null si no tenía objetivo.
function setHit(st) {
  const hasTarget = st.targetReps != null || st.targetWeight != null
  if (!hasTarget) return null
  const repsOk = st.targetReps == null ? true : st.reps >= st.targetReps
  const weightOk = (st.targetWeight == null || st.targetWeight === 0) ? true : st.weight >= st.targetWeight
  return repsOk && weightOk
}

export default function Metrics() {
  const [state] = usePD()
  const [range, setRange] = useState('week')

  const data = useMemo(() => {
    const days = range === 'week' ? 7 : 30
    const since = addDays(TODAY, -(days - 1))
    const ws = state.workouts.filter((w) => w.date >= since && w.date <= TODAY)
    const sessions = ws.length
    const totalSec = ws.reduce((a, w) => a + (w.durationSec || 0), 0)
    const distance = ws.reduce((a, w) => a + (w.distanceKm || 0), 0)
    const volume = ws.reduce((a, w) => a + (w.volume || 0), 0)
    const calories = ws.reduce((a, w) => a + (w.calories || 0), 0)

    let planned = 0
    let hit = 0
    ws.forEach((w) => {
      if (!w.exercises) return
      w.exercises.forEach((e) => e.sets.forEach((st) => {
        const h = setHit(st)
        if (h === null) return
        planned += 1
        if (h) hit += 1
      }))
    })

    const bySport = {}
    ws.forEach((w) => { bySport[w.sport] = (bySport[w.sport] || 0) + 1 })

    const weeks = []
    for (let i = 7; i >= 0; i--) {
      const start = weekStart(addDays(TODAY, -i * 7))
      const end = addDays(start, 6)
      const c = state.workouts.filter((w) => w.date >= start && w.date <= end).length
      weeks.push({ label: `S${8 - i}`, value: c, tone: i === 0 ? 'green' : 'ink' })
    }
    return { sessions, totalSec, distance, volume, calories, bySport, weeks, planned, hit }
  }, [state, range])

  const adherencePct = data.planned > 0 ? Math.round((data.hit / data.planned) * 100) : null

  return (
    <div className="grid" style={{ gap: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Segmented size="sm" value={range} onChange={setRange} options={[{ value: 'week', label: 'Semana' }, { value: 'month', label: 'Mes' }]} />
      </div>
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))' }}>
        <Card><Stat label="Sesiones" value={data.sessions} tone="green" /></Card>
        <Card><Stat label="Tiempo total" value={fmtDuration(data.totalSec)} /></Card>
        <Card><Stat label="Distancia" value={data.distance.toFixed(1) + ' km'} /></Card>
        <Card><Stat label="Volumen fuerza" value={(data.volume / 1000).toFixed(1) + ' t'} sub="peso × reps" /></Card>
        <Card><Stat label="Calorías (est.)" value={data.calories.toLocaleString('es-ES') + ' kcal'} /></Card>
        {adherencePct != null && (
          <Card><Stat label="Adherencia" value={adherencePct + '%'} tone={adherencePct >= 80 ? 'green' : adherencePct >= 50 ? 'amber' : 'red'} sub={`${data.hit}/${data.planned} series`} /></Card>
        )}
      </div>
      <div className="grid metrics-cols" style={{ gridTemplateColumns: 'minmax(0,1.4fr) minmax(0,1fr)', gap: 18 }}>
        <Card>
          <SectionTitle icon="dumbbell" sub="Sesiones por semana (últimas 8)">Constancia</SectionTitle>
          <Bars data={data.weeks} height={150} showVals />
        </Card>
        <Card>
          <SectionTitle sub={range === 'week' ? 'Esta semana' : 'Este mes'}>Reparto por deporte</SectionTitle>
          {Object.keys(data.bySport).length === 0 ? (
            <EmptyState icon="dumbbell" title="Sin sesiones aún" />
          ) : (
            <div className="grid" style={{ gap: 11 }}>
              {SPORTS.filter((s) => data.bySport[s.id]).map((s) => {
                const max = Math.max(...Object.values(data.bySport))
                return (
                  <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                    <Icon name={SPORT_ICON[s.id]} size={17} style={{ color: 'var(--muted)', width: 20 }} />
                    <span style={{ fontSize: 12.5, width: 78, fontWeight: 500 }}>{s.label}</span>
                    <div style={{ flex: 1 }}><ProgressBar value={data.bySport[s.id]} max={max} tone="green" /></div>
                    <span className="mono" style={{ fontSize: 12, color: 'var(--muted)', width: 16, textAlign: 'right' }}>{data.bySport[s.id]}</span>
                  </div>
                )
              })}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}