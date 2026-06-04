/* Pestaña Negocios — panel por negocio (ingresos, líneas, evolución).
   Si el negocio está conectado a Stripe, muestra métricas en vivo. */

import { useState, useMemo, useEffect } from 'react'
import { usePD } from '../../lib/store.js'
import { uid, fmtMoney, MONTHS, parse, TODAY } from '../../lib/format.js'
import { monthOffset, monthLabel, monthKey } from '../../lib/finance.js'
import { Card, Button, Segmented, Stat, Bars, SectionTitle, Pill, Modal, Field, EmptyState, IconButton } from '../../components/common.jsx'
import { fetchStripeStats } from '../../lib/stripeStats.js'

const STREAM_LABEL = { subs: 'Suscripciones', afiliacion: 'Afiliación', ventas: 'Ventas' }
const STREAM_TONE = { subs: 'blue', afiliacion: 'green', ventas: 'amber' }
const ALL_STREAMS = ['subs', 'afiliacion', 'ventas']
const PAYOUT_STATUS = { paid: 'Pagado', pending: 'Pendiente', in_transit: 'En tránsito', canceled: 'Cancelado', failed: 'Fallido' }

function blankBusiness() {
  return { id: null, name: '', type: 'web', streams: ['subs'], stripe: false }
}

function fmtDay(date) {
  const diff = Math.round((parse(TODAY) - parse(date)) / 86400000)
  if (diff === 0) return 'Hoy'
  if (diff === 1) return 'Ayer'
  const d = parse(date)
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`
}

function fmtTs(ts) {
  if (!ts) return ''
  const d = new Date(ts * 1000)
  return `${d.getDate()} ${MONTHS[d.getMonth()].slice(0, 3)}`
}

export default function Negocios() {
  const [state, update] = usePD()
  const [sel, setSel] = useState(state.businesses[0]?.id || null)
  const [editing, setEditing] = useState(null)

  const save = (b) => update((d) => {
    const biz = { ...b, streams: b.streams.length ? b.streams : ['subs'] }
    if (b.id) {
      const i = d.businesses.findIndex((x) => x.id === b.id)
      d.businesses[i] = biz
    } else {
      d.businesses.push({ ...biz, id: uid() })
    }
  })
  const del = (id) => update((d) => {
    d.businesses = d.businesses.filter((x) => x.id !== id)
    d.movements.forEach((m) => { if (m.businessId === id) { m.businessId = null; m.stream = null } })
  })

  const current = state.businesses.find((b) => b.id === sel) || state.businesses[0] || null

  return (
    <div className="grid" style={{ gap: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        {state.businesses.length > 0
          ? <Segmented value={current?.id} onChange={setSel} options={state.businesses.map((b) => ({ value: b.id, label: b.name }))} />
          : <span className="muted" style={{ fontSize: 13 }}>Sin negocios</span>}
        <Button variant="accent" icon="plus" onClick={() => setEditing(blankBusiness())}>Nuevo negocio</Button>
      </div>

      {current
        ? <BusinessPanel key={current.id} state={state} business={current} onEdit={() => setEditing(current)} />
        : <Card><EmptyState icon="wallet" title="Sin negocios" sub="Crea tu primer negocio para ver sus métricas." /></Card>}

      {editing && <BusinessModal business={editing} onClose={() => setEditing(null)} onSave={save} onDelete={del} />}
    </div>
  )
}

function BusinessPanel({ state, business, onEdit }) {
  const thisM = monthOffset(0)
  const prevM = monthOffset(-1)
  const movs = useMemo(() => state.movements.filter((m) => m.businessId === business.id), [state, business.id])

  const incomeIn = (mKey, opts = {}) =>
    movs
      .filter((m) => m.kind === 'income' && monthKey(m.date) === mKey && (opts.includePending ? true : m.status !== 'pending'))
      .filter((m) => (opts.stream ? m.stream === opts.stream : true))
      .reduce((a, m) => a + m.amount, 0)

  const totalM = incomeIn(thisM)
  const totalPrev = incomeIn(prevM)
  const growth = totalPrev ? Math.round(((totalM - totalPrev) / totalPrev) * 100) : 0
  const pending = movs.filter((m) => m.kind === 'income' && m.status === 'pending').reduce((a, m) => a + m.amount, 0)

  const evolution = useMemo(() => {
    const out = []
    for (let i = 5; i >= 0; i--) {
      const mk = monthOffset(-i)
      out.push({ label: monthLabel(mk), value: Math.round(incomeIn(mk)), tone: i === 0 ? 'blue' : 'ink' })
    }
    return out
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, business.id])

  const recent = useMemo(() => [...movs].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 8), [movs])

  return (
    <div className="grid" style={{ gap: 18 }}>
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))' }}>
        <Card className="tint-blue"><Stat label="Ingresos del negocio (mes)" value={fmtMoney(totalM)} delta={growth !== 0 ? Math.abs(growth) + '%' : null} deltaTone={growth >= 0 ? 'up' : 'down'} sub="vs mes ant." /></Card>
        {business.streams.map((s) => (
          <Card key={s}><Stat label={(STREAM_LABEL[s] || s) + ' (mes)'} value={fmtMoney(incomeIn(thisM, { stream: s }))} tone={STREAM_TONE[s]} /></Card>
        ))}
        {pending > 0 && <Card><Stat label="Por cobrar (pendiente)" value={fmtMoney(pending)} sub="aún no cuenta" /></Card>}
      </div>

      {business.stripe && <StripePanel />}

      <div className="grid fin-cols" style={{ gridTemplateColumns: 'minmax(0,1.5fr) minmax(0,1fr)', gap: 18 }}>
        <Card>
          <SectionTitle icon="wallet" sub="Ingresos del negocio · 6 meses" right={<IconButton name="edit" size={15} label="Editar negocio" onClick={onEdit} />}>
            {business.name}
          </SectionTitle>
          <Bars data={evolution} height={150} showVals fmt={(v) => (v >= 1000 ? (v / 1000).toFixed(1) + 'k' : v)} />
          {business.streams.includes('subs') && !business.stripe && (
            <div className="muted" style={{ fontSize: 11.5, marginTop: 10 }}>
              Conecta Stripe (botón «Editar negocio») para ver MRR y suscripciones en vivo.
            </div>
          )}
        </Card>

        <Card style={{ padding: 0 }}>
          <div style={{ padding: 'var(--pad-card) var(--pad-card) 8px' }}>
            <SectionTitle sub="Últimos del negocio">Movimientos</SectionTitle>
          </div>
          {recent.length === 0 ? (
            <div style={{ padding: '0 var(--pad-card) var(--pad-card)' }}>
              <EmptyState icon="wallet" title="Sin movimientos" sub="Asígnale movimientos desde la pestaña Movimientos." />
            </div>
          ) : (
            recent.map((m) => (
              <div key={m.id} className="tx-row" style={{ cursor: 'default' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{m.source || m.category || '—'}</div>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 2, flexWrap: 'wrap' }}>
                    <span className="muted" style={{ fontSize: 11.5 }}>{fmtDay(m.date)}</span>
                    {m.stream && <Pill tone={STREAM_TONE[m.stream] || 'neutral'}>{STREAM_LABEL[m.stream] || m.stream}</Pill>}
                    {m.status === 'pending' && <Pill tone="amber">Pendiente</Pill>}
                  </div>
                </div>
                <span className="mono" style={{ fontWeight: 600, fontSize: 13, color: m.kind === 'income' ? (m.status === 'pending' ? 'var(--amber)' : 'var(--green)') : 'var(--ink)' }}>
                  {(m.kind === 'income' ? '+' : '−') + fmtMoney(m.amount)}
                </span>
              </div>
            ))
          )}
        </Card>
      </div>
    </div>
  )
}

function StripePanel() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const d = await fetchStripeStats()
      setData(d)
    } catch (e) {
      setError(e.message || 'No se pudo cargar Stripe')
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [])

  const cur = (data && data.currency) || 'eur'
  const eur = (cents) => fmtMoney((cents || 0) / 100, { dec: 2 })
  const pick = (obj) => (obj ? (obj[cur] ?? Object.values(obj)[0] ?? 0) : 0)

  return (
    <Card>
      <SectionTitle icon="wallet" sub="Datos en vivo de tu cuenta" right={<Button variant="ghost" size="sm" onClick={load} disabled={loading}>{loading ? 'Actualizando…' : 'Actualizar'}</Button>}>
        Stripe
      </SectionTitle>

      {loading && !data ? (
        <div className="muted" style={{ fontSize: 12.5 }}>Cargando datos de Stripe…</div>
      ) : error ? (
        <div style={{ fontSize: 12.5, color: 'var(--red)' }}>{error}</div>
      ) : data ? (
        <>
          <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(120px,1fr))', gap: 10 }}>
            <Stat label="MRR" value={eur(data.mrr)} tone="green" sub="recurrente/mes" />
            <Stat label="Suscripciones activas" value={data.activeSubscriptions} tone="blue" />
            <Stat label="Saldo disponible" value={eur(pick(data.balanceAvailable))} />
            <Stat label="Saldo pendiente" value={eur(pick(data.balancePending))} sub="aún no disponible" />
          </div>
          <div style={{ marginTop: 14 }}>
            <div className="field-label" style={{ marginBottom: 6 }}>Últimos payouts</div>
            {(!data.recentPayouts || data.recentPayouts.length === 0) ? (
              <div className="muted" style={{ fontSize: 12 }}>Sin payouts todavía.</div>
            ) : (
              <div className="grid" style={{ gap: 6 }}>
                {data.recentPayouts.map((p, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12.5 }}>
                    <span className="muted">{fmtTs(p.arrivalDate)} · {PAYOUT_STATUS[p.status] || p.status}</span>
                    <span className="mono" style={{ fontWeight: 600 }}>{eur(p.amount)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      ) : null}
    </Card>
  )
}

function BusinessModal({ business, onClose, onSave, onDelete }) {
  const [f, setF] = useState(business)
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }))
  const toggleStream = (s) => setF((p) => ({
    ...p,
    streams: p.streams.includes(s) ? p.streams.filter((x) => x !== s) : [...p.streams, s],
  }))
  const submit = () => {
    if (!f.name.trim() || f.streams.length === 0) return
    onSave(f)
    onClose()
  }
  return (
    <Modal
      title={business.id ? 'Editar negocio' : 'Nuevo negocio'}
      onClose={onClose}
      footer={
        <>
          {business.id && (
            <Button variant="danger" icon="trash" onClick={() => { onDelete(business.id); onClose() }} style={{ marginRight: 'auto' }}>
              Eliminar
            </Button>
          )}
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button variant="primary" onClick={submit}>Guardar</Button>
        </>
      }
    >
      <Field label="Nombre">
        <input value={f.name} autoFocus placeholder="p. ej. Mi web, Mi tienda" onChange={(e) => set('name', e.target.value)} />
      </Field>
      <Field label="Líneas de ingreso" hint="Marca las que apliquen a este negocio.">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {ALL_STREAMS.map((s) => (
            <label key={s} className="reimb-toggle">
              <input type="checkbox" checked={f.streams.includes(s)} onChange={() => toggleStream(s)} style={{ width: 'auto' }} />
              <span>{STREAM_LABEL[s]}</span>
            </label>
          ))}
        </div>
      </Field>
      <Field label="Integración" hint="Lee MRR, suscripciones, saldo y payouts en vivo desde Stripe.">
        <label className="reimb-toggle">
          <input type="checkbox" checked={!!f.stripe} onChange={(e) => set('stripe', e.target.checked)} style={{ width: 'auto' }} />
          <span>Conectar con Stripe</span>
        </label>
      </Field>
    </Modal>
  )
}