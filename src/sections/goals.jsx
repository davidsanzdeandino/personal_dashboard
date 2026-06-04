/* Sección Objetivos / metas */

import { useState } from 'react'
import { usePD } from '../lib/store.js'
import { parse, TODAY, uid } from '../lib/format.js'
import { Card, Button, Pill, IconButton, ProgressBar, Modal, Field, Segmented, EmptyState } from '../components/common.jsx'
import { Icon } from '../components/icons.jsx'

const KINDS = {
  finance: { label: 'Finanzas', tone: 'blue', icon: 'wallet' },
  fitness: { label: 'Físico', tone: 'green', icon: 'dumbbell' },
  habit: { label: 'Hábitos', tone: 'amber', icon: 'flame' },
}

function blankGoal() {
  return { id: null, title: '', kind: 'finance', current: 0, target: 100, unit: '', deadline: '', lowerIsBetter: false, start: null }
}

function pct(g) {
  if (g.lowerIsBetter) {
    const start = g.start || g.target * 1.15
    return Math.max(0, Math.min(100, ((start - g.current) / (start - g.target)) * 100))
  }
  return Math.max(0, Math.min(100, (g.current / g.target) * 100))
}

function daysLeft(d) {
  if (!d) return null
  return Math.round((parse(d) - parse(TODAY)) / 86400000)
}

function fmtNum(n) {
  if (n >= 1000) return n.toLocaleString('es-ES')
  return n % 1 === 0 ? n : n.toFixed(1)
}

export default function GoalsView() {
  const [state, update] = usePD()
  const [editing, setEditing] = useState(null)

  const save = (g) => update((d) => {
    const goal = { ...g, current: +g.current, target: +g.target }
    if (g.id) {
      const i = d.goals.findIndex((x) => x.id === g.id)
      d.goals[i] = goal
    } else {
      d.goals.push({ ...goal, id: uid(), start: +g.current })
    }
  })

  const del = (id) => update((d) => {
    d.goals = d.goals.filter((x) => x.id !== id)
  })

  const nudge = (id, dir) => update((d) => {
    const g = d.goals.find((x) => x.id === id)
    const step = g.target > 1000 ? 100 : g.target > 100 ? 5 : 1
    g.current = Math.max(0, +(g.current + dir * step).toFixed(1))
  })

  const grouped = Object.keys(KINDS)
    .map((k) => ({ kind: k, items: state.goals.filter((g) => g.kind === k) }))
    .filter((g) => g.items.length)
  const completed = state.goals.filter((g) => pct(g) >= 100).length

  return (
    <div className="grid" style={{ gap: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <Icon name="trophy" size={20} style={{ color: 'var(--amber)' }} />
          <span className="muted" style={{ fontSize: 13 }}>{completed} de {state.goals.length} objetivos completados</span>
        </div>
        <Button variant="accent" icon="plus" onClick={() => setEditing(blankGoal())}>Nuevo objetivo</Button>
      </div>

      {grouped.map((grp) => (
        <div key={grp.kind}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '4px 2px 12px' }}>
            <Icon name={KINDS[grp.kind].icon} size={16} style={{ color: `var(--${KINDS[grp.kind].tone})` }} />
            <h3 style={{ fontSize: 13, textTransform: 'uppercase', letterSpacing: '.04em', color: 'var(--muted)' }}>{KINDS[grp.kind].label}</h3>
          </div>
          <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 14 }}>
            {grp.items.map((g) => {
              const p = pct(g)
              const dl = daysLeft(g.deadline)
              const done = p >= 100
              const tone = KINDS[g.kind].tone
              return (
                <Card key={g.id}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 14 }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 14.5 }}>{g.title}</div>
                      {g.deadline && (
                        <div className="mono" style={{ fontSize: 11, color: dl < 0 ? 'var(--red)' : 'var(--muted)', marginTop: 3 }}>
                          {dl < 0 ? 'Plazo vencido' : dl === 0 ? 'Vence hoy' : `${dl} días restantes`}
                        </div>
                      )}
                    </div>
                    {done
                      ? <Pill tone="green">✓ Logrado</Pill>
                      : <IconButton name="edit" size={15} label="Editar" onClick={() => setEditing(g)} />}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 8 }}>
                    <span className="display" style={{ fontSize: 26, fontWeight: 600 }}>{fmtNum(g.current)}</span>
                    <span className="muted" style={{ fontSize: 13 }}>/ {fmtNum(g.target)} {g.unit}</span>
                    <span className="mono" style={{ marginLeft: 'auto', fontSize: 12, color: `var(--${tone})`, fontWeight: 600 }}>{Math.round(p)}%</span>
                  </div>
                  <ProgressBar value={p} max={100} tone={tone} height={9} />
                  <div style={{ display: 'flex', gap: 7, marginTop: 13 }}>
                    <Button variant="soft" size="sm" onClick={() => nudge(g.id, -1)} style={{ flex: 1 }}>−</Button>
                    <Button variant="soft" size="sm" onClick={() => nudge(g.id, 1)} style={{ flex: 1 }}>+</Button>
                    <Button variant="ghost" size="sm" icon="edit" onClick={() => setEditing(g)} />
                  </div>
                </Card>
              )
            })}
          </div>
        </div>
      ))}

      {state.goals.length === 0 && (
        <Card>
          <EmptyState icon="target" title="Aún no tienes objetivos" sub="Crea tu primera meta financiera, física o de hábitos." />
        </Card>
      )}

      {editing && <GoalModal goal={editing} onClose={() => setEditing(null)} onSave={save} onDelete={del} />}
    </div>
  )
}

function GoalModal({ goal, onClose, onSave, onDelete }) {
  const [f, setF] = useState(goal)
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }))
  const submit = () => {
    if (!f.title.trim() || !f.target) return
    onSave(f)
    onClose()
  }
  return (
    <Modal
      title={goal.id ? 'Editar objetivo' : 'Nuevo objetivo'}
      onClose={onClose}
      footer={
        <>
          {goal.id && (
            <Button variant="danger" icon="trash" onClick={() => { onDelete(goal.id); onClose() }} style={{ marginRight: 'auto' }}>
              Eliminar
            </Button>
          )}
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button variant="primary" onClick={submit}>Guardar</Button>
        </>
      }
    >
      <Field label="Título">
        <input value={f.title} autoFocus placeholder="p. ej. Ahorrar 10.000 €" onChange={(e) => set('title', e.target.value)} />
      </Field>
      <Field label="Categoría">
        <Segmented value={f.kind} onChange={(v) => set('kind', v)} options={Object.entries(KINDS).map(([k, v]) => ({ value: k, label: v.label }))} />
      </Field>
      <div className="row" style={{ gap: 12 }}>
        <Field label="Valor actual">
          <input type="number" step={0.1} value={f.current} onChange={(e) => set('current', e.target.value)} />
        </Field>
        <Field label="Objetivo">
          <input type="number" step={0.1} value={f.target} onChange={(e) => set('target', e.target.value)} />
        </Field>
        <Field label="Unidad">
          <input value={f.unit} placeholder="€, kg, reps…" onChange={(e) => set('unit', e.target.value)} />
        </Field>
      </div>
      <Field label="Fecha límite (opcional)">
        <input type="date" value={f.deadline || ''} onChange={(e) => set('deadline', e.target.value)} />
      </Field>
      <label className="reimb-toggle">
        <input type="checkbox" checked={f.lowerIsBetter} onChange={(e) => set('lowerIsBetter', e.target.checked)} style={{ width: 'auto' }} />
        <span>Menos es mejor (bajar de peso, tiempo…)</span>
      </label>
    </Modal>
  )
}