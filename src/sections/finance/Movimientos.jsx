/* Pestaña Movimientos — listado + alta/edición de movimientos.
   Tipos: income, expense, transfer, adjust. Estado realized/pending.
   Reembolso: marcar un gasto reembolsable crea un ingreso «Reembolso» enlazado. */

import { useState, useMemo } from 'react'
import { usePD } from '../../lib/store.js'
import { TODAY, MONTHS, parse, uid, fmtMoney } from '../../lib/format.js'
import { Card, Button, Segmented, Pill, Modal, Field, EmptyState, cls } from '../../components/common.jsx'
import { Icon } from '../../components/icons.jsx'

const CATS = ['Negocio', 'Afiliados', 'Rendimientos', 'Nómina/Fijo', 'Extra', 'Reembolso', 'Vivienda', 'Comida', 'Restaurantes', 'Transporte', 'Suscripciones', 'Software', 'Servicios', 'Ocio', 'Salud', 'Otros']
const CAT_TONE = { Negocio: 'blue', Afiliados: 'green', Rendimientos: 'green', 'Nómina/Fijo': 'ink', Extra: 'amber', Reembolso: 'green' }
const STREAM_LABEL = { subs: 'Suscripciones', afiliacion: 'Afiliación', ventas: 'Ventas' }
const KIND_OPTS = [
  { value: 'expense', label: 'Gasto' },
  { value: 'income', label: 'Ingreso' },
  { value: 'transfer', label: 'Transfer.' },
  { value: 'adjust', label: 'Ajuste' },
]

function blankMov() {
  return {
    id: null, kind: 'expense', status: 'realized', amount: '', date: TODAY,
    accrualDate: null, accountId: null, toAccountId: null,
    category: 'Comida', source: '', businessId: null, stream: null, note: '',
    reimbursable: false, reimbursed: false, reimbursementId: null, reimbursementDate: TODAY, recurring: false,
  }
}

function fmtDay(date) {
  const diff = Math.round((parse(TODAY) - parse(date)) / 86400000)
  if (diff === 0) return 'Hoy'
  if (diff === 1) return 'Ayer'
  if (diff === -1) return 'Mañana'
  const d = parse(date)
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`
}

export default function Movimientos() {
  const [state, update] = usePD()
  const [editing, setEditing] = useState(null)
  const [fType, setFType] = useState('all')
  const [fAccount, setFAccount] = useState('all')
  const [fBiz, setFBiz] = useState('all')

  const accName = useMemo(() => Object.fromEntries(state.accounts.map((a) => [a.id, a.name])), [state.accounts])
  const bizName = useMemo(() => Object.fromEntries(state.businesses.map((b) => [b.id, b.name])), [state.businesses])

  const list = useMemo(() => {
    let xs = [...state.movements]
    if (fType === 'income') xs = xs.filter((m) => m.kind === 'income')
    else if (fType === 'expense') xs = xs.filter((m) => m.kind === 'expense')
    else if (fType === 'internal') xs = xs.filter((m) => m.kind === 'transfer' || m.kind === 'adjust')
    if (fAccount !== 'all') xs = xs.filter((m) => m.accountId === fAccount || m.toAccountId === fAccount)
    if (fBiz !== 'all') xs = xs.filter((m) => (m.businessId || 'personal') === fBiz)
    return xs.sort((a, b) => b.date.localeCompare(a.date))
  }, [state, fType, fAccount, fBiz])

  const groups = useMemo(() => {
    const m = {}
    list.forEach((t) => {
      (m[t.date] = m[t.date] || []).push(t)
    })
    return Object.entries(m)
  }, [list])

  const openNew = () => setEditing({
    ...blankMov(),
    accountId: state.accounts[0]?.id || null,
    toAccountId: state.accounts[1]?.id || state.accounts[0]?.id || null,
  })

  const save = (f) => update((d) => {
    const isAdjust = f.kind === 'adjust'
    const amt = isAdjust ? +f.amount : Math.abs(+f.amount)
    const base = {
      kind: f.kind,
      status: (f.kind === 'transfer' || f.kind === 'adjust') ? 'realized' : f.status,
      amount: amt,
      date: f.date,
      accrualDate: f.status === 'pending' ? (f.accrualDate || null) : null,
      accountId: f.accountId,
      toAccountId: f.kind === 'transfer' ? f.toAccountId : null,
      category: (f.kind === 'income' || f.kind === 'expense') ? f.category : '',
      source: f.source || '',
      businessId: (f.kind === 'income' || f.kind === 'expense') ? (f.businessId || null) : null,
      stream: (f.kind === 'income' || f.kind === 'expense') ? (f.stream || null) : null,
      note: f.note || '',
      reimbursable: f.kind === 'expense' ? !!f.reimbursable : false,
      reimbursed: f.kind === 'expense' ? !!f.reimbursed : false,
      reimbursementId: f.reimbursementId || null,
      recurring: f.kind === 'income' ? !!f.recurring : false,
    }

    let target
    if (f.id) {
      const i = d.movements.findIndex((x) => x.id === f.id)
      d.movements[i] = { ...d.movements[i], ...base, id: f.id }
      target = d.movements[i]
    } else {
      target = { ...base, id: uid() }
      d.movements.push(target)
    }

    // Reembolso: crear / quitar el ingreso enlazado
    if (target.kind === 'expense' && target.reimbursable && target.reimbursed && !target.reimbursementId) {
      const inc = {
        id: uid(), kind: 'income', status: 'realized', amount: target.amount,
        date: f.reimbursementDate || TODAY, accrualDate: null,
        accountId: target.accountId, toAccountId: null,
        category: 'Reembolso', source: 'Reembolso: ' + (target.source || target.category),
        businessId: target.businessId || null, stream: null, note: '',
        reimbursable: false, reimbursed: false, reimbursementId: null,
      }
      d.movements.push(inc)
      target.reimbursementId = inc.id
    } else if (target.reimbursementId && !(target.kind === 'expense' && target.reimbursable && target.reimbursed)) {
      d.movements = d.movements.filter((x) => x.id !== target.reimbursementId)
      target.reimbursementId = null
    }
  })

  const del = (id) => update((d) => {
    const m = d.movements.find((x) => x.id === id)
    const linked = m && m.reimbursementId
    d.movements = d.movements.filter((x) => x.id !== id && (!linked || x.id !== linked))
    d.movements.forEach((x) => {
      if (x.reimbursementId === id) {
        x.reimbursementId = null
        x.reimbursed = false
      }
    })
  })

  const markCollected = (id) => update((d) => {
    const m = d.movements.find((x) => x.id === id)
    if (m) {
      m.status = 'realized'
      m.date = TODAY
    }
  })

  const markReimbursed = (id) => update((d) => {
    const m = d.movements.find((x) => x.id === id)
    if (!m || m.reimbursementId) return
    m.reimbursed = true
    const inc = {
      id: uid(), kind: 'income', status: 'realized', amount: m.amount,
      date: TODAY, accrualDate: null, accountId: m.accountId, toAccountId: null,
      category: 'Reembolso', source: 'Reembolso: ' + (m.source || m.category),
      businessId: m.businessId || null, stream: null, note: '',
      reimbursable: false, reimbursed: false, reimbursementId: null,
    }
    d.movements.push(inc)
    m.reimbursementId = inc.id
  })

  return (
    <div className="grid" style={{ gap: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        <span className="muted" style={{ fontSize: 13 }}>{list.length} movimientos</span>
        <Button variant="accent" icon="plus" onClick={openNew}>Nuevo movimiento</Button>
      </div>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <Segmented
          size="sm"
          value={fType}
          onChange={setFType}
          options={[
            { value: 'all', label: 'Todos' },
            { value: 'income', label: 'Ingresos' },
            { value: 'expense', label: 'Gastos' },
            { value: 'internal', label: 'Internos' },
          ]}
        />
        <select value={fAccount} onChange={(e) => setFAccount(e.target.value)} style={{ width: 'auto', padding: '7px 10px' }}>
          <option value="all">Todas las cuentas</option>
          {state.accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
        <select value={fBiz} onChange={(e) => setFBiz(e.target.value)} style={{ width: 'auto', padding: '7px 10px' }}>
          <option value="all">Todos los negocios</option>
          <option value="personal">Personal</option>
          {state.businesses.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
      </div>

      {groups.length === 0 ? (
        <Card><EmptyState icon="wallet" title="Sin movimientos" /></Card>
      ) : (
        groups.map(([date, items]) => (
          <Card key={date} style={{ padding: 0 }}>
            <div className="tx-date">{fmtDay(date)}</div>
            {items.map((m) => (
              <MovRow key={m.id} m={m} accName={accName} bizName={bizName} onEdit={setEditing} onCollect={markCollected} onReimburse={markReimbursed} />
            ))}
          </Card>
        ))
      )}

      {editing && <MovModal mov={editing} accounts={state.accounts} businesses={state.businesses} onClose={() => setEditing(null)} onSave={save} onDelete={del} />}
    </div>
  )
}

function MovRow({ m, accName, bizName, onEdit, onCollect, onReimburse }) {
  const pending = m.status === 'pending'
  let icon = 'arrowUp', tint = 'tx-out', amountColor = 'var(--ink)', sign = '−'
  if (m.kind === 'income') {
    icon = 'arrowDown'; tint = 'tx-in'; amountColor = pending ? 'var(--amber)' : 'var(--green)'; sign = '+'
  } else if (m.kind === 'transfer') {
    icon = 'skip'; tint = 'tx-out'; amountColor = 'var(--muted)'; sign = ''
  } else if (m.kind === 'adjust') {
    const up = m.amount >= 0
    icon = up ? 'arrowUp' : 'arrowDown'; tint = up ? 'tx-in' : 'tx-out'; amountColor = 'var(--muted)'; sign = up ? '+' : '−'
  }

  const title = m.kind === 'transfer'
    ? (m.source || 'Transferencia')
    : (m.source || m.category || (m.kind === 'adjust' ? 'Ajuste' : '—'))

  return (
    <div className="tx-row" style={{ cursor: 'default' }}>
      <div className={cls('tx-icon', tint)}><Icon name={icon} size={16} /></div>
      <div style={{ flex: 1, minWidth: 0, textAlign: 'left', cursor: 'pointer' }} onClick={() => onEdit(m)}>
        <div style={{ fontWeight: 600, fontSize: 13.5 }}>{title}</div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 3, flexWrap: 'wrap' }}>
          {m.kind === 'transfer' && <span className="muted" style={{ fontSize: 11.5 }}>{accName[m.accountId]} → {accName[m.toAccountId]}</span>}
          {(m.kind === 'income' || m.kind === 'expense') && m.category && <Pill tone={CAT_TONE[m.category] || 'neutral'}>{m.category}</Pill>}
          {m.businessId && <Pill tone="neutral">{bizName[m.businessId]}</Pill>}
          {pending && <Pill tone="amber">Pendiente</Pill>}
          {m.kind === 'income' && m.recurring && <Pill tone="blue">Recurrente</Pill>}
          {m.kind === 'expense' && m.reimbursable && <Pill tone={m.reimbursed ? 'green' : 'amber'}>{m.reimbursed ? 'Reembolsado' : 'Reembolso pdte.'}</Pill>}
        </div>
      </div>
      {pending && m.kind === 'income' && (
        <button className="rest-btn" title="Marcar cobrado" onClick={() => onCollect(m.id)} style={{ borderColor: 'var(--green)', background: 'var(--green-soft)', color: 'var(--green)' }}>
          <Icon name="check" size={15} stroke={3} />
        </button>
      )}
      {m.kind === 'expense' && m.reimbursable && !m.reimbursed && (
        <button className="rest-btn" title="Marcar reembolsado" onClick={() => onReimburse(m.id)}>
          <Icon name="check" size={15} stroke={3} />
        </button>
      )}
      <span className={cls('tx-amt', 'mono')} style={{ color: amountColor }}>{sign + fmtMoney(Math.abs(m.amount))}</span>
    </div>
  )
}

function MovModal({ mov, accounts, businesses, onClose, onSave, onDelete }) {
  const [f, setF] = useState(mov)
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }))
  const isIE = f.kind === 'income' || f.kind === 'expense'
  const biz = businesses.find((b) => b.id === f.businessId)

  const changeKind = (v) => setF((p) => {
    const next = { ...p, kind: v }
    if (!next.accountId && accounts[0]) next.accountId = accounts[0].id
    if (v === 'transfer' && (!next.toAccountId || next.toAccountId === next.accountId)) {
      next.toAccountId = (accounts.find((a) => a.id !== next.accountId) || accounts[0] || {}).id || null
    }
    return next
  })

  const submit = () => {
    if (f.kind === 'adjust') {
      if (f.amount === '' || isNaN(+f.amount)) return
    } else if (!f.amount || +f.amount <= 0) {
      return
    }
    if (f.kind === 'transfer' && f.accountId === f.toAccountId) return
    onSave(f)
    onClose()
  }

  return (
    <Modal
      title={mov.id ? 'Editar movimiento' : 'Nuevo movimiento'}
      onClose={onClose}
      footer={
        <>
          {mov.id && (
            <Button variant="danger" icon="trash" onClick={() => { onDelete(mov.id); onClose() }} style={{ marginRight: 'auto' }}>
              Eliminar
            </Button>
          )}
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button variant="primary" onClick={submit}>Guardar</Button>
        </>
      }
    >
      <Field label="Tipo">
        <Segmented size="sm" value={f.kind} onChange={changeKind} options={KIND_OPTS} />
      </Field>

      <div className="row" style={{ gap: 12 }}>
        <Field label={f.kind === 'adjust' ? 'Importe (€, usa − para pérdidas)' : 'Importe (€)'}>
          <input type="number" step={0.01} autoFocus value={f.amount} placeholder="0,00" onChange={(e) => set('amount', e.target.value)} />
        </Field>
        <Field label={f.kind === 'income' && f.status === 'pending' ? 'Fecha de cobro' : 'Fecha'}>
          <input type="date" value={f.date} onChange={(e) => set('date', e.target.value)} />
        </Field>
      </div>

      {f.kind === 'transfer' ? (
        <div className="row" style={{ gap: 12 }}>
          <Field label="Desde">
            <select value={f.accountId || ''} onChange={(e) => set('accountId', e.target.value)}>
              {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </Field>
          <Field label="Hacia">
            <select value={f.toAccountId || ''} onChange={(e) => set('toAccountId', e.target.value)}>
              {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </Field>
        </div>
      ) : (
        <Field label="Cuenta">
          <select value={f.accountId || ''} onChange={(e) => set('accountId', e.target.value)}>
            {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </Field>
      )}

      {isIE ? (
        <div className="row" style={{ gap: 12 }}>
          <Field label="Categoría">
            <select value={f.category} onChange={(e) => set('category', e.target.value)}>
              {CATS.map((c) => <option key={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="Origen / concepto">
            <input value={f.source} placeholder="p. ej. Nómina, Supermercado" onChange={(e) => set('source', e.target.value)} />
          </Field>
        </div>
      ) : (
        <Field label="Concepto">
          <input value={f.source} placeholder={f.kind === 'transfer' ? 'p. ej. Payout Stripe' : 'p. ej. Rendimiento APY'} onChange={(e) => set('source', e.target.value)} />
        </Field>
      )}

      {isIE && (
        <div className="row" style={{ gap: 12 }}>
          <Field label="Negocio">
            <select value={f.businessId || ''} onChange={(e) => { set('businessId', e.target.value || null); set('stream', null) }}>
              <option value="">Personal</option>
              {businesses.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </Field>
          {biz && biz.streams && biz.streams.length > 0 && (
            <Field label="Línea">
              <select value={f.stream || ''} onChange={(e) => set('stream', e.target.value || null)}>
                <option value="">—</option>
                {biz.streams.map((s) => <option key={s} value={s}>{STREAM_LABEL[s] || s}</option>)}
              </select>
            </Field>
          )}
        </div>
      )}

      {isIE && (
        <Field label="Estado">
          <Segmented size="sm" value={f.status} onChange={(v) => set('status', v)} options={[{ value: 'realized', label: 'Realizado' }, { value: 'pending', label: 'Pendiente' }]} />
        </Field>
      )}
      {isIE && f.status === 'pending' && (
        <Field label="Fecha de devengo (cuándo se generó)">
          <input type="date" value={f.accrualDate || ''} onChange={(e) => set('accrualDate', e.target.value)} />
        </Field>
      )}

      {f.kind === 'income' && (
        <label className="reimb-toggle">
          <input type="checkbox" checked={f.recurring} onChange={(e) => set('recurring', e.target.checked)} style={{ width: 'auto' }} />
          <span>Ingreso recurrente (mensual) · cuenta para el MRR</span>
        </label>
      )}
      {f.kind === 'expense' && (
        <label className="reimb-toggle">
          <input type="checkbox" checked={f.reimbursable} onChange={(e) => set('reimbursable', e.target.checked)} style={{ width: 'auto' }} />
          <span>Reembolsable</span>
        </label>
      )}
      {f.kind === 'expense' && f.reimbursable && (
        <label className="reimb-toggle">
          <input type="checkbox" checked={f.reimbursed} onChange={(e) => set('reimbursed', e.target.checked)} style={{ width: 'auto' }} />
          <span>Ya reembolsado (crea un ingreso «Reembolso»)</span>
        </label>
      )}
      {f.kind === 'expense' && f.reimbursable && f.reimbursed && (
        <Field label="Fecha del reembolso">
          <input type="date" value={f.reimbursementDate || TODAY} onChange={(e) => set('reimbursementDate', e.target.value)} />
        </Field>
      )}
    </Modal>
  )
}