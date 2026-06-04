/* Pestaña Historial — lista de entrenos registrados (con adherencia). */

import { usePD } from '../../lib/store.js'
import { TODAY, parse, MONTHS, fmtDuration } from '../../lib/format.js'
import { Card, EmptyState } from '../../components/common.jsx'
import { Icon, SPORT_ICON } from '../../components/icons.jsx'
import { SPORT_LABEL } from './constants.js'

function fmtRel(date) {
  const diff = Math.round((parse(TODAY) - parse(date)) / 86400000)
  if (diff === 0) return 'Hoy'
  if (diff === 1) return 'Ayer'
  if (diff < 7) return `Hace ${diff} días`
  const d = parse(date)
  return `${d.getDate()} ${MONTHS[d.getMonth()].slice(0, 3)}`
}

function adherence(w) {
  if (!w.exercises) return null
  let planned = 0
  let hit = 0
  w.exercises.forEach((e) => e.sets.forEach((st) => {
    const hasTarget = st.targetReps != null || st.targetWeight != null
    if (!hasTarget) return
    const repsOk = st.targetReps == null ? true : st.reps >= st.targetReps
    const weightOk = (st.targetWeight == null || st.targetWeight === 0) ? true : st.weight >= st.targetWeight
    planned += 1
    if (repsOk && weightOk) hit += 1
  }))
  return planned > 0 ? { planned, hit } : null
}

function MetaBit({ icon, text, tone }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, color: tone ? `var(--${tone})` : 'var(--muted)' }}>
      <Icon name={icon} size={13} />
      {text}
    </span>
  )
}

export default function History() {
  const [state] = usePD()
  const ws = [...state.workouts].sort((a, b) => b.date.localeCompare(a.date))
  if (ws.length === 0) return <Card><EmptyState icon="dumbbell" title="Sin entrenos registrados" /></Card>
  return (
    <div className="grid" style={{ gap: 10 }}>
      {ws.map((w) => {
        const ad = adherence(w)
        return (
          <Card key={w.id} style={{ padding: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
              <div className="hist-icon"><Icon name={SPORT_ICON[w.sport]} size={20} /></div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                  <span style={{ fontWeight: 600, fontSize: 14 }}>{SPORT_LABEL[w.sport]}{w.name && w.name !== SPORT_LABEL[w.sport] ? ' · ' + w.name : ''}</span>
                  <span className="mono" style={{ fontSize: 11.5, color: 'var(--muted)' }}>{fmtRel(w.date)}</span>
                </div>
                <div style={{ display: 'flex', gap: 14, marginTop: 4, flexWrap: 'wrap' }}>
                  {w.durationSec && <MetaBit icon="clock" text={fmtDuration(w.durationSec)} />}
                  {w.distanceKm && <MetaBit icon="run" text={w.distanceKm + ' km'} />}
                  {w.volume > 0 && <MetaBit icon="dumbbell" text={(w.volume / 1000).toFixed(1) + ' t'} />}
                  {w.exercises && <MetaBit icon="list" text={w.exercises.length + ' ejercicios'} />}
                  {w.rounds && <MetaBit icon="box" text={w.rounds + ' rounds'} />}
                  {ad && <MetaBit icon="check" text={`${ad.hit}/${ad.planned}`} tone={ad.hit === ad.planned ? 'green' : 'amber'} />}
                </div>
              </div>
            </div>
          </Card>
        )
      })}
    </div>
  )
}