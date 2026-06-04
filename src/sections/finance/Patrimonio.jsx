/* Pestaña Patrimonio — cuentas (liquidez / activos) + saldos en vivo (Stripe, cripto) y total.
   Stripe y cripto son opcionales: solo se consultan y se muestran si hay un negocio
   conectado a Stripe o una dirección de cartera configurada (pestaña Inversiones). */

import { useState, useEffect, useMemo } from 'react'
import { usePD } from '../../lib/store.js'
import { fmtMoney, uid } from '../../lib/format.js'
import { allBalances, netWorth, totalByKind, pendingIncome } from '../../lib/finance.js'
import { Card, Button, Stat, Modal, Field, Segmented, EmptyState, cls } from '../../components/common.jsx'
import { Icon } from '../../components/icons.jsx'
import { fetchStripeStats } from '../../lib/stripeStats.js'
import { fetchWalletStats } from '../../lib/walletStats.js'

const KIND_LABEL = { liquidez: 'Liquidez', activo: 'Activos' }

function blankAccount() {
  return { id: null, name: '', kind: 'liquidez', icon: 'wallet', opening: 0 }
}

export default function Patrimonio() {
  const [state, update] = usePD()
  const [editing, setEditing] = useState(null)

  const balances = allBalances(state)
  const baseTotal = netWorth(state, balances)
  const liquid = totalByKind(state, 'liquidez', balances)
  const assets = totalByKind(state, 'activo', balances)
  const pending = pendingIncome(state)

  // ---- Saldos en vivo (Stripe + cripto), en € ----
  const hasStripe = useMemo(() => state.businesses.some((b) => b.stripe), [state.businesses])
  const walletAddr = state.investments?.address || ''
  const hasLive = hasStripe || !!walletAddr

  const [stripeEur, setStripeEur] = useState(null)   // saldo disponible + pendiente
  const [cryptoEur, setCryptoEur] = useState(null)   // posición Morpho en €
  const [liveLoading, setLiveLoading] = useState(hasLive)

  const loadLive = async () => {
    if (!hasLive) { setLiveLoading(false); return }
    setLiveLoading(true)
    const tasks = []
    // Cripto (Morpho) → €
    if (walletAddr) {
      tasks.push(
        fetchWalletStats(walletAddr)
          .then((d) => {
            const eurUsd = d?.eurUsd
            const usd = d?.morphoTotal || 0
            setCryptoEur(eurUsd != null ? usd * eurUsd : null)
          })
          .catch(() => setCryptoEur(null))
      )
    } else {
      setCryptoEur(null)
    }
    // Stripe (disponible + pendiente) → ya en la moneda de la cuenta (€)
    if (hasStripe) {
      tasks.push(
        fetchStripeStats()
          .then((d) => {
            const pick = (obj) => (obj ? (obj.eur ?? Object.values(obj)[0] ?? 0) : 0)
            const avail = pick(d?.balanceAvailable)
            const pend = pick(d?.balancePending)
            setStripeEur((avail + pend) / 100)
          })
          .catch(() => setStripeEur(null))
      )
    } else {
      setStripeEur(null)
    }
    await Promise.allSettled(tasks)
    setLiveLoading(false)
  }

  useEffect(() => {
    loadLive()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasStripe, walletAddr])

  const liveTotal = (stripeEur || 0) + (cryptoEur || 0)
  const total = baseTotal + liveTotal

  const save = (a) => update((d) => {
    const acc = { ...a, opening: +a.opening || 0 }
    if (a.id) {
      const i = d.accounts.findIndex((x) => x.id === a.id)
      d.accounts[i] = acc
    } else {
      d.accounts.push({ ...acc, id: uid() })
    }
  })
  const del = (id) => update((d) => {
    d.accounts = d.accounts.filter((x) => x.id !== id)
  })

  const groups = ['liquidez', 'activo']
    .map((k) => ({ kind: k, items: state.accounts.filter((a) => a.kind === k) }))
    .filter((g) => g.items.length)

  return (
    <div className="grid" style={{ gap: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        <span className="muted" style={{ fontSize: 13 }}>{state.accounts.length} cuentas</span>
        <div style={{ display: 'flex', gap: 8 }}>
          {hasLive && <Button variant="ghost" size="sm" onClick={loadLive} disabled={liveLoading}>{liveLoading ? 'Actualizando…' : 'Actualizar'}</Button>}
          <Button variant="accent" icon="plus" onClick={() => setEditing(blankAccount())}>Nueva cuenta</Button>
        </div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))' }}>
        <Card className="tint-ink"><Stat label="Patrimonio total" value={fmtMoney(Math.round(total))} sub={`${fmtMoney(Math.round(liquid))} líquido · ${fmtMoney(Math.round(assets + liveTotal))} activos`} /></Card>
        <Card><Stat label="Liquidez" value={fmtMoney(Math.round(liquid))} tone="blue" /></Card>
        <Card><Stat label="Activos" value={fmtMoney(Math.round(assets + liveTotal))} tone="green" sub={liveTotal > 0 ? 'incluye saldos en vivo' : null} /></Card>
        <Card><Stat label="Por cobrar (pendiente)" value={fmtMoney(Math.round(pending))} sub="aún no cuenta" /></Card>
      </div>

      {/* Saldos en vivo (opcionales) */}
      {hasLive && (
        <div>
          <h3 style={{ fontSize: 13, textTransform: 'uppercase', letterSpacing: '.04em', color: 'var(--muted)', margin: '4px 2px 12px' }}>En vivo</h3>
          <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))', gap: 12 }}>
            {walletAddr && (
              <Card>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div className="tx-icon tx-in"><Icon name="target" size={17} /></div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 13.5 }}>Cripto (Morpho)</div>
                    <div className="display" style={{ fontSize: 19, fontWeight: 600, marginTop: 2 }}>
                      {cryptoEur == null ? (liveLoading ? '…' : '—') : fmtMoney(Math.round(cryptoEur))}
                    </div>
                    <div className="muted" style={{ fontSize: 10.5, marginTop: 1 }}>convertido a €</div>
                  </div>
                </div>
              </Card>
            )}
            {hasStripe && (
              <Card>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div className="tx-icon tx-out"><Icon name="wallet" size={17} /></div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 13.5 }}>Saldo Stripe</div>
                    <div className="display" style={{ fontSize: 19, fontWeight: 600, marginTop: 2 }}>
                      {stripeEur == null ? (liveLoading ? '…' : '—') : fmtMoney(Math.round(stripeEur))}
                    </div>
                    <div className="muted" style={{ fontSize: 10.5, marginTop: 1 }}>disponible + pendiente</div>
                  </div>
                </div>
              </Card>
            )}
          </div>
          <div className="muted" style={{ fontSize: 11, marginTop: 8 }}>
            Estos saldos se leen en vivo y ya se suman al patrimonio. No crees cuentas manuales para ellos (se contarían dos veces).
          </div>
        </div>
      )}

      {groups.map((grp) => (
        <div key={grp.kind}>
          <h3 style={{ fontSize: 13, textTransform: 'uppercase', letterSpacing: '.04em', color: 'var(--muted)', margin: '4px 2px 12px' }}>{KIND_LABEL[grp.kind]}</h3>
          <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))', gap: 12 }}>
            {grp.items.map((a) => (
              <Card key={a.id} onClick={() => setEditing(a)}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div className={cls('tx-icon', a.kind === 'liquidez' ? 'tx-out' : 'tx-in')}>
                    <Icon name={a.icon || 'wallet'} size={17} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 13.5 }}>{a.name}</div>
                    <div className="display" style={{ fontSize: 19, fontWeight: 600, marginTop: 2 }}>{fmtMoney(Math.round(balances[a.id] || 0))}</div>
                  </div>
                  <Icon name="chevR" size={16} style={{ color: 'var(--faint)' }} />
                </div>
              </Card>
            ))}
          </div>
        </div>
      ))}

      {state.accounts.length === 0 && (
        <Card><EmptyState icon="wallet" title="Sin cuentas" sub="Crea tu primera cuenta de liquidez o activo." /></Card>
      )}

      {editing && <AccountModal account={editing} onClose={() => setEditing(null)} onSave={save} onDelete={del} />}
    </div>
  )
}

function AccountModal({ account, onClose, onSave, onDelete }) {
  const [f, setF] = useState(account)
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }))
  const submit = () => {
    if (!f.name.trim()) return
    onSave(f)
    onClose()
  }
  return (
    <Modal
      title={account.id ? 'Editar cuenta' : 'Nueva cuenta'}
      onClose={onClose}
      footer={
        <>
          {account.id && (
            <Button variant="danger" icon="trash" onClick={() => { onDelete(account.id); onClose() }} style={{ marginRight: 'auto' }}>
              Eliminar
            </Button>
          )}
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button variant="primary" onClick={submit}>Guardar</Button>
        </>
      }
    >
      <Field label="Nombre">
        <input value={f.name} autoFocus placeholder="p. ej. Cuenta corriente, Indexados" onChange={(e) => set('name', e.target.value)} />
      </Field>
      <Field label="Tipo">
        <Segmented value={f.kind} onChange={(v) => set('kind', v)} options={[{ value: 'liquidez', label: 'Liquidez' }, { value: 'activo', label: 'Activo' }]} />
      </Field>
      <Field label="Saldo inicial (€)" hint="El saldo actual se calcula sumando tus movimientos a este saldo inicial.">
        <input type="number" step={0.01} value={f.opening} onChange={(e) => set('opening', e.target.value)} />
      </Field>
    </Modal>
  )
}
