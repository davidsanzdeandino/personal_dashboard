/* Sección Calendario — vista mensual + agenda + añadir/editar evento */

import { useState, useMemo } from 'react'
import { usePD } from '../lib/store.js'
import { TODAY, MONTHS, DOW_SHORT, DOW_LONG, iso, parse, dow, fmtDateLong, uid } from '../lib/format.js'
import { Card, Button, IconButton, SectionTitle, EmptyState, Modal, Field, Segmented, cls } from '../components/common.jsx'
import { EVENT_LABEL } from '../lib/constants.js'

function blankEvent(date) {
  return { id: null, date: date || TODAY, time: '09:00', title: '', type: 'personal', durationMin: 60 }
}

export default function CalendarView() {
  const [state, update] = usePD()
  const [cursor, setCursor] = useState(TODAY.slice(0, 7) + '-01')
  const [selected, setSelected] = useState(TODAY)
  const [editing, setEditing] = useState(null)

  const cd = parse(cursor)
  const year = cd.getFullYear()
  const month = cd.getMonth()
  const monthName = MONTHS[month]

  const cells = useMemo(() => {
    const first = new Date(year, month, 1)
    const startDow = (first.getDay() + 6) % 7
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const out = []
    for (let i = 0; i < startDow; i++) out.push(null)
    for (let d = 1; d <= daysInMonth; d++) out.push(iso(new Date(year, month, d)))
    while (out.length % 7 !== 0) out.push(null)
    return out
  }, [cursor])

  const eventsByDay = useMemo(() => {
    const m = {}
    state.events.forEach((e) => {
      (m[e.date] = m[e.date] || []).push(e)
    })
    Object.values(m).forEach((arr) => arr.sort((a, b) => a.time.localeCompare(b.time)))
    return m
  }, [state])

  const move = (n) => {
    const d = new Date(year, month + n, 1)
    setCursor(iso(d))
  }
  const selEvents = eventsByDay[selected] || []

  const save = (ev) => update((d) => {
    if (ev.id) {
      const i = d.events.findIndex((x) => x.id === ev.id)
      d.events[i] = ev
    } else {
      d.events.push({ ...ev, id: uid() })
    }
  })
  const del = (id) => update((d) => {
    d.events = d.events.filter((x) => x.id !== id)
  })

  const upcoming = useMemo(
    () =>
      state.events
        .filter((e) => e.date >= TODAY)
        .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))
        .slice(0, 6),
    [state]
  )

  return (
    <div className="grid" style={{ gap: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <IconButton name="chevL" label="Mes anterior" onClick={() => move(-1)} />
          <h2 style={{ fontFamily: 'var(--display)', fontSize: 21, minWidth: 180, textAlign: 'center', textTransform: 'capitalize' }}>{monthName} {year}</h2>
          <IconButton name="chevR" label="Mes siguiente" onClick={() => move(1)} />
          <Button variant="soft" size="sm" onClick={() => { setCursor(TODAY.slice(0, 7) + '-01'); setSelected(TODAY) }}>Hoy</Button>
        </div>
        <Button variant="accent" icon="plus" onClick={() => setEditing(blankEvent(selected))}>Nuevo evento</Button>
      </div>

      <div className="grid cal-cols" style={{ gridTemplateColumns: 'minmax(0,2fr) minmax(0,1fr)' }}>
        {/* rejilla del mes */}
        <Card pad={false}>
          <div className="cal-head">
            {DOW_SHORT.map((d, i) => <div key={i} className="cal-dow">{d}</div>)}
          </div>
          <div className="cal-grid">
            {cells.map((c, i) => {
              if (!c) return <div key={i} className="cal-cell empty-cell" />
              const evs = eventsByDay[c] || []
              const isToday = c === TODAY
              const isSel = c === selected
              return (
                <button key={i} className={cls('cal-cell', isSel && 'cell-sel', isToday && 'cell-today')} onClick={() => setSelected(c)}>
                  <span className="cell-num">{parse(c).getDate()}</span>
                  <div className="cell-dots">
                    {evs.slice(0, 4).map((e) => <span key={e.id} className={cls('ev-dot', `dot-${e.type}`)} />)}
                  </div>
                </button>
              )
            })}
          </div>
        </Card>

        {/* detalle del día + próximos */}
        <div className="grid" style={{ gap: 18, alignContent: 'start' }}>
          <Card>
            <SectionTitle sub={fmtDateLong(selected)}>
              {selected === TODAY ? 'Hoy' : DOW_LONG[dow(selected)].replace(/^\w/, (c) => c.toUpperCase())}
            </SectionTitle>
            {selEvents.length === 0 ? (
              <EmptyState
                icon="calendar"
                title="Sin eventos"
                sub="Pulsa para añadir uno."
                action={<Button variant="soft" size="sm" icon="plus" onClick={() => setEditing(blankEvent(selected))}>Añadir</Button>}
              />
            ) : (
              <div className="grid" style={{ gap: 8 }}>
                {selEvents.map((e) => (
                  <div key={e.id} className="ev-row" onClick={() => setEditing(e)}>
                    <div className={cls('ev-bar', `bar-${e.type}`)} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                        <span className="mono" style={{ fontSize: 12, color: 'var(--muted)' }}>{e.time}</span>
                        <span className="mono" style={{ fontSize: 11, color: 'var(--faint)' }}>{e.durationMin}m</span>
                      </div>
                      <div style={{ fontWeight: 600, fontSize: 13.5, marginTop: 2 }}>{e.title}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card>
            <SectionTitle icon="list">Próximos</SectionTitle>
            <div className="grid" style={{ gap: 10 }}>
              {upcoming.map((e) => (
                <div key={e.id} className="up-row" onClick={() => { setSelected(e.date); setCursor(e.date.slice(0, 7) + '-01') }}>
                  <div className={cls('up-date', `bg-${e.type}`)}>
                    <strong>{parse(e.date).getDate()}</strong>
                    <span>{MONTHS[parse(e.date).getMonth()].slice(0, 3)}</span>
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{e.title}</div>
                    <div className="muted" style={{ fontSize: 11.5 }}>{e.time} · {EVENT_LABEL[e.type]}</div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {editing && <EventModal ev={editing} onClose={() => setEditing(null)} onSave={save} onDelete={del} />}
    </div>
  )
}

function EventModal({ ev, onClose, onSave, onDelete }) {
  const [f, setF] = useState(ev)
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }))
  const submit = () => {
    if (!f.title.trim()) return
    onSave(f)
    onClose()
  }
  return (
    <Modal
      title={ev.id ? 'Editar evento' : 'Nuevo evento'}
      onClose={onClose}
      footer={
        <>
          {ev.id && (
            <Button variant="danger" icon="trash" onClick={() => { onDelete(ev.id); onClose() }} style={{ marginRight: 'auto' }}>
              Eliminar
            </Button>
          )}
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button variant="primary" onClick={submit}>Guardar</Button>
        </>
      }
    >
      <Field label="Título">
        <input value={f.title} autoFocus placeholder="p. ej. Entreno de pierna" onChange={(e) => set('title', e.target.value)} />
      </Field>
      <div className="row" style={{ gap: 12 }}>
        <Field label="Fecha">
          <input type="date" value={f.date} onChange={(e) => set('date', e.target.value)} />
        </Field>
        <Field label="Hora">
          <input type="time" value={f.time} onChange={(e) => set('time', e.target.value)} />
        </Field>
      </div>
      <div className="row" style={{ gap: 12 }}>
        <Field label="Tipo">
          <div style={{ display: 'flex' }}>
            <Segmented
              value={f.type}
              onChange={(v) => set('type', v)}
              size="sm"
              options={[{ value: 'training', label: 'Entreno' }, { value: 'work', label: 'Trabajo' }, { value: 'personal', label: 'Personal' }]}
            />
          </div>
        </Field>
        <Field label="Duración (min)">
          <input type="number" value={f.durationMin} min={5} step={5} onChange={(e) => set('durationMin', +e.target.value)} />
        </Field>
      </div>
    </Modal>
  )
}