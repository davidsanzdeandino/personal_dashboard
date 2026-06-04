/* Tarjeta "Ingresos recurrentes (MRR estimado)" — suma en €:
   Stripe (suscripciones) + cripto (Morpho/mes, ya convertido a €) + ingresos fijos.
   Stripe y cripto son opcionales y se leen en vivo de las Edge Functions solo si
   están configurados; los fijos salen del estado (ingresos marcados como recurrentes;
   se toma el importe más reciente por concepto para no duplicar entre meses). */

import { useState, useEffect, useMemo } from 'react'
import { usePD } from '../../lib/store.js'
import { fmtMoney } from '../../lib/format.js'
import { fetchStripeStats } from '../../lib/stripeStats.js'
import { fetchWalletStats } from '../../lib/walletStats.js'
import { Card, Button, SectionTitle } from '../../components/common.jsx'
import { Icon } from '../../components/icons.jsx'

const eur = (n) => fmtMoney(Number(n || 0), { dec: 2 })

export default function RecurringIncome() {
  const [state] = usePD()
  const hasStripe = useMemo(() => state.businesses.some((b) => b.stripe), [state.businesses])
  const addr = state.investments?.address || ''
  const showCrypto = !!addr

  const fixed = useMemo(() => {
    const byConcept = {}
    state.movements
      .filter((m) => m.kind === 'income' && m.recurring)
      .forEach((m) => {
        const key = (m.source || m.category || 'Fijo').trim()
        const prev = byConcept[key]
        if (!prev || m.date > prev.date) byConcept[key] = { amount: m.amount, date: m.date }
      })
    return Object.entries(byConcept).map(([name, v]) => ({ name, amount: v.amount }))
  }, [state.movements])
  const fixedTotal = fixed.reduce((s, x) => s + x.amount, 0)

  const [stripeEur, setStripeEur] = useState(hasStripe ? null : 0)
  const [cryptoEur, setCryptoEur] = useState(showCrypto ? null : 0)
  const [loading, setLoading] = useState(hasStripe || showCrypto)

  const load = async () => {
    if (!hasStripe && !addr) { setLoading(false); return }
    setLoading(true)
    const tasks = []
    if (addr) {
      tasks.push(
        fetchWalletStats(addr).then((d) => setCryptoEur(d?.morphoMonthlyEur ?? 0)).catch(() => setCryptoEur(0))
      )
    }
    if (hasStripe) {
      tasks.push(
        fetchStripeStats().then((d) => setStripeEur((d?.mrr || 0) / 100)).catch(() => setStripeEur(0))
      )
    }
    await Promise.allSettled(tasks)
    setLoading(false)
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasStripe, addr])

  const total = (stripeEur || 0) + (cryptoEur || 0) + fixedTotal
  const hasLive = hasStripe || showCrypto

  const rows = [
    ...(hasStripe ? [{ key: 'stripe', label: 'Suscripciones (Stripe)', icon: 'wallet', tone: 'tx-in', value: stripeEur }] : []),
    ...(showCrypto ? [{ key: 'crypto', label: 'Cripto (Morpho)', icon: 'target', tone: 'tx-in', value: cryptoEur }] : []),
    { key: 'fixed', label: 'Ingresos fijos', icon: 'list', tone: 'tx-out', value: fixedTotal, sub: fixed.length ? `${fixed.length} ${fixed.length === 1 ? 'concepto' : 'conceptos'}` : 'marca ingresos como recurrentes' },
  ]

  return (
    <Card>
      <SectionTitle
        icon="arrowDown"
        sub="MRR estimado · ingresos recurrentes al mes"
        right={hasLive ? <Button variant="ghost" size="sm" onClick={load} disabled={loading}>{loading ? 'Actualizando…' : 'Actualizar'}</Button> : null}
      >
        Ingresos recurrentes
      </SectionTitle>

      <div className="display" style={{ fontSize: 30, fontWeight: 600, letterSpacing: '-0.02em' }}>
        {eur(total)}<span className="muted" style={{ fontSize: 14, fontWeight: 500 }}> /mes</span>
      </div>
      <div className="muted" style={{ fontSize: 11.5, marginTop: 2 }}>
        Estimación en €: {hasLive ? 'suscripciones + rendimiento de cripto + ' : ''}tus ingresos fijos.
      </div>

      <div className="grid" style={{ gap: 8, marginTop: 14 }}>
        {rows.map((r) => (
          <div key={r.key} style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
            <div className={'tx-icon ' + r.tone} style={{ width: 30, height: 30 }}><Icon name={r.icon} size={15} /></div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: 13 }}>{r.label}</div>
              {r.sub && <div className="muted" style={{ fontSize: 11 }}>{r.sub}</div>}
            </div>
            <span className="mono" style={{ fontWeight: 600, fontSize: 13 }}>{r.value == null ? '…' : eur(r.value)}</span>
          </div>
        ))}
      </div>

      {fixed.length > 0 && (
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
          <div className="muted" style={{ fontSize: 11, marginBottom: 6 }}>Detalle de fijos</div>
          <div className="grid" style={{ gap: 5 }}>
            {fixed.map((x) => (
              <div key={x.name} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                <span className="muted">{x.name}</span>
                <span className="mono">{eur(x.amount)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  )
}
