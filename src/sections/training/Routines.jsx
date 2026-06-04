/* Pestaña Rutinas — plantillas por deporte (objetivos de series o de cardio). */

import { useState } from 'react'
import { usePD } from '../../lib/store.js'
import { uid } from '../../lib/format.js'
import { Card, Button, Segmented, IconButton, Modal, Field, EmptyState, Pill } from '../../components/common.jsx'
import { Icon, SPORT_ICON } from '../../components/icons.jsx'
import { SPORTS, SPORT_LABEL } from './constants.js'

const KIND_OF = Object.fromEntries(SPORTS.map((s) => [s.id, s.kind]))
const isStrengthSport = (sport) => KIND_OF[sport] === 'strength'
const isDistSport = (sport) => ['running', 'natacion', 'bici'].includes(sport)

function blankRoutine(sport) {
  if (isStrengthSport(sport)) return { id: null, sport, name: '', exercises: [] }
  return { id: null, sport, name: '', exercises: null, targetDistanceKm: '', targetDurationMin: '', targetRounds: '', notes: '' }
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

export default function Routines() {
  const [state, update] = usePD()
  const [filter, setFilter] = useState('all')
  const [editing, setEditing] = useState(null)

  const save = (r) => update((d) => {
    if (!d.routines) d.routines = []
    if (r.id) {
      const i = d.routines.findIndex((x) => x.id === r.id)
      d.routines[i] = r
    } else {
      d.routines.push({ ...r, id: uid() })
    }
  })
  const del = (id) => update((d) => {
    if (!d.routines) d.routines = []
    d.routines = d.routines.filter((x) => x.id !== id)
  })

  const routines = state.routines || []
  const shown = filter === 'all' ? routines : routines.filter((r) => r.sport === filter)
  const usedSports = SPORTS.filter((s) => routines.some((r) => r.sport === s.id))

  return (
    <div className="grid" style={{ gap: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        <span className="muted" style={{ fontSize: 13 }}>{routines.length} rutinas guardadas</span>
        <Button variant="accent" icon="plus" onClick={() => setEditing(blankRoutine('gym'))}>Nueva rutina</Button>
      </div>

      {usedSports.length > 1 && (
        <Segmented
          size="sm"
          value={filter}
          onChange={setFilter}
          options={[{ value: 'all', label: 'Todas' }, ...usedSports.map((s) => ({ value: s.id, label: s.label }))]}
        />
      )}

      {shown.length === 0 ? (
        <Card><EmptyState icon="dumbbell" title="Aún no tienes rutinas" sub="Crea una plantilla por deporte y cárgala al empezar a entrenar." /></Card>
      ) : (
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))', gap: 12 }}>
          {shown.map((r) => (
            <Card key={r.id} onClick={() => setEditing(r)}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div className="hist-icon"><Icon name={SPORT_ICON[r.sport]} size={20} /></div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{r.name}</div>
                  <div className="muted" style={{ fontSize: 11.5, marginTop: 2 }}>{routineSummary(r)}</div>
                </div>
                <Pill tone="neutral">{SPORT_LABEL[r.sport]}</Pill>
              </div>
            </Card>
          ))}
        </div>
      )}

      {editing && <RoutineEditor routine={editing} onClose={() => setEditing(null)} onSave={save} onDelete={del} />}
    </div>
  )
}

function RoutineEditor({ routine, onClose, onSave, onDelete }) {
  const [f, setF] = useState(routine)
  const [newName, setNewName] = useState('')
  const mut = (fn) => setF((prev) => { const n = structuredClone(prev); fn(n); return n })
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }))

  const changeSport = (sport) => setF((prev) => {
    const wasStrength = !!prev.exercises
    const nowStrength = isStrengthSport(sport)
    if (wasStrength === nowStrength) return { ...prev, sport }
    return { ...blankRoutine(sport), id: prev.id, name: prev.name } // cambia el tipo: reinicia estructura
  })

  const addExercise = () => {
    if (!newName.trim()) return
    mut((s) => s.exercises.push({ name: newName.trim(), sets: [{ targetReps: 8, targetWeight: 0, restSec: 90 }] }))
    setNewName('')
  }
  const addSet = (ei) => mut((s) => {
    const ex = s.exercises[ei]
    const last = ex.sets[ex.sets.length - 1]
    ex.sets.push(last ? { ...last } : { targetReps: 8, targetWeight: 0, restSec: 90 })
  })
  const setField = (ei, si, k, v) => mut((s) => { s.exercises[ei].sets[si][k] = v })
  const setExName = (ei, v) => mut((s) => { s.exercises[ei].name = v })
  const delSet = (ei, si) => mut((s) => s.exercises[ei].sets.splice(si, 1))
  const delEx = (ei) => mut((s) => s.exercises.splice(ei, 1))

  const strength = !!f.exercises
  const submit = () => {
    if (!f.name.trim()) return
    let out = f
    if (!f.exercises) {
      const num = (v) => (v === '' || v == null ? null : +v)
      out = { ...f, targetDistanceKm: num(f.targetDistanceKm), targetDurationMin: num(f.targetDurationMin), targetRounds: num(f.targetRounds) }
    }
    onSave(out)
    onClose()
  }

  return (
    <Modal
      wide
      title={routine.id ? 'Editar rutina' : 'Nueva rutina'}
      onClose={onClose}
      footer={
        <>
          {routine.id && (
            <Button variant="danger" icon="trash" onClick={() => { onDelete(routine.id); onClose() }} style={{ marginRight: 'auto' }}>
              Eliminar
            </Button>
          )}
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button variant="primary" onClick={submit} disabled={!f.name.trim()}>Guardar</Button>
        </>
      }
    >
      <div className="row" style={{ gap: 12 }}>
        <Field label="Nombre" hint="Obligatorio para guardar.">
          <input value={f.name} autoFocus placeholder="p. ej. Empuje, Rodaje suave" onChange={(e) => set('name', e.target.value)} />
        </Field>
        <Field label="Deporte">
          <select value={f.sport} onChange={(e) => changeSport(e.target.value)}>
            {SPORTS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
        </Field>
      </div>

      {strength ? (
        <>
          {f.exercises.length === 0 && (
            <div className="empty" style={{ padding: '16px' }}>
              <div className="empty-sub">Añade ejercicios con sus series objetivo.</div>
            </div>
          )}
          {f.exercises.map((ex, ei) => (
            <Card key={ei} className="flat" style={{ background: 'var(--surface-2)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <input value={ex.name} onChange={(e) => setExName(ei, e.target.value)} style={{ fontWeight: 600, background: 'var(--surface)' }} />
                <IconButton name="trash" size={16} label="Eliminar ejercicio" onClick={() => delEx(ei)} />
              </div>
              <div className="set-head">
                <span>#</span>
                <span>Reps</span>
                <span>Peso (kg)</span>
                <span>Descanso</span>
                <span />
              </div>
              {ex.sets.map((st, si) => (
                <div key={si} className="set-row">
                  <span className="set-idx mono">{si + 1}</span>
                  <input type="number" value={st.targetReps} min={0} onChange={(e) => setField(ei, si, 'targetReps', +e.target.value)} />
                  <input type="number" value={st.targetWeight} min={0} step={0.5} onChange={(e) => setField(ei, si, 'targetWeight', +e.target.value)} />
                  <input type="number" value={st.restSec} min={0} step={15} onChange={(e) => setField(ei, si, 'restSec', +e.target.value)} />
                  <IconButton name="x" size={14} label="Quitar serie" onClick={() => delSet(ei, si)} />
                </div>
              ))}
              <Button variant="soft" size="sm" icon="plus" onClick={() => addSet(ei)} style={{ marginTop: 10 }}>Añadir serie</Button>
            </Card>
          ))}
          <div style={{ display: 'flex', gap: 10 }}>
            <input value={newName} placeholder="Nuevo ejercicio (p. ej. Sentadilla)" onChange={(e) => setNewName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addExercise()} />
            <Button variant="primary" icon="plus" onClick={addExercise}>Ejercicio</Button>
          </div>
        </>
      ) : (
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: 14 }}>
          {isDistSport(f.sport) && (
            <Field label="Distancia objetivo (km)">
              <input type="number" step={0.1} value={f.targetDistanceKm} placeholder="0.0" onChange={(e) => set('targetDistanceKm', e.target.value)} />
            </Field>
          )}
          {f.sport === 'boxeo' && (
            <Field label="Rounds objetivo">
              <input type="number" value={f.targetRounds} placeholder="0" onChange={(e) => set('targetRounds', e.target.value)} />
            </Field>
          )}
          <Field label="Duración objetivo (min)">
            <input type="number" value={f.targetDurationMin} placeholder="0" onChange={(e) => set('targetDurationMin', e.target.value)} />
          </Field>
          <div style={{ gridColumn: '1 / -1' }}>
            <Field label="Notas" hint="Ritmo, zona, intervalos...">
              <textarea value={f.notes} placeholder="p. ej. Zona 2, ritmo cómodo" onChange={(e) => set('notes', e.target.value)} />
            </Field>
          </div>
        </div>
      )}
    </Modal>
  )
}