/* Pestaña Resumen — patrimonio, realizado vs pendiente, flujo y categorías. */

import { useMemo } from 'react'
import { usePD } from '../../lib/store.js'
import { fmtMoney } from '../../lib/format.js'
import { netWorth, calcMonth, monthOffset, monthLabel, monthKey, pendingIncome } from '../../lib/finance.js'
import { Card, Stat, Ring, SectionTitle, EmptyState, cls } from '../../components/common.jsx'
import RecurringIncome from './RecurringIncome.jsx'

function Legend({ tone, label }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11.5, color: 'var(--muted)', fontWeight: 600 }}>
      <span className={cls('legend-dot', 'fill-' + tone)} />
      {label}
    </span>
  )
}

export default function Resumen() {
  const [state] = usePD()

  const thisM = monthOffset(0)
  const prevM = monthOffset(-1)
  const cur = useMemo(() => calcMonth(state, thisM), [state, thisM])
  const prev = useMemo(() => calcMonth(state, prevM), [state, prevM])
  const total = useMemo(() => netWorth(state), [state])
  const pending = useMemo(() => pendingIncome(state), [state])
  const savingsRate = cur.inc > 0 ? Math.round((cur.balance / cur.inc) * 100) : 0
  const incDelta = prev.inc ? Math.round(((cur.inc - prev.inc) / prev.inc) * 100) : 0

  // Objetivo de patrimonio: de tus objetivos de finanzas (si hay).
  const financeGoal = state.goals.find((g) => g.kind === 'finance' && !g.lowerIsBetter)

  const months = useMemo(() => {
    const out = []
    for (let i = 5; i >= 0; i--) {
      const mk = monthOffset(-i)
      const m = calcMonth(state, mk)
      out.push({ label: monthLabel(mk), inc: m.inc, exp: m.exp })
    }
    return out
  }, [state])
  const maxBar = Math.max(...months.flatMap((m) => [m.inc, m.exp]), 1)

  const cats = useMemo(() => {
    const m = {}
    state.movements
      .filter((x) => x.kind === 'expense' && x.status !== 'pending' && monthKey(x.date) === thisM)
      .forEach((x) => {
        const c = x.category || 'Otros'
        m[c] = (m[c] || 0) + x.amount
      })
    return Object.entries(m).sort((a, b) => b[1] - a[1])
  }, [state, thisM])
  const catTotal = cats.reduce((a, c) => a + c[1], 0)
  const catColors = ['blue', 'green', 'amber', 'red', 'ink']

  return (
    <div className="grid" style={{ gap: 18 }}>
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))' }}>
        <Card className="tint-ink"><Stat label="Patrimonio total" value={fmtMoney(Math.round(total))} sub={pending > 0 ? `+ ${fmtMoney(Math.round(pending))} por cobrar` : (financeGoal ? `objetivo ${fmtMoney(financeGoal.target)}` : null)} /></Card>
        <Card><Stat label="Ingresos del mes" value={fmtMoney(cur.inc)} tone="green" delta={incDelta !== 0 ? Math.abs(incDelta) + '%' : null} deltaTone={incDelta >= 0 ? 'up' : 'down'} sub="realizado · vs mes ant." /></Card>
        <Card><Stat label="Gastos del mes" value={fmtMoney(cur.exp)} tone="red" /></Card>
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <Ring value={Math.max(0, savingsRate)} max={100} tone="blue" label={savingsRate + '%'} size={58} stroke={7} />
            <div>
              <div className="stat-label">Tasa de ahorro</div>
              <div className="stat-value" style={{ fontSize: 19 }}>{fmtMoney(cur.balance)}</div>
              <div className="stat-sub">ahorrado este mes</div>
            </div>
          </div>
        </Card>
      </div>
      <RecurringIncome />
      <div className="grid fin-cols" style={{ gridTemplateColumns: 'minmax(0,1.5fr) minmax(0,1fr)', gap: 18 }}>
        <Card>
          <SectionTitle
            icon="wallet"
            sub="Ingresos vs gastos · 6 meses (realizado)"
            right={
              <div style={{ display: 'flex', gap: 12 }}>
                <Legend tone="green" label="Ingresos" />
                <Legend tone="red" label="Gastos" />
              </div>
            }
          >
            Flujo mensual
          </SectionTitle>
          <div className="ie-bars">
            {months.map((m, i) => (
              <div key={i} className="ie-group">
                <div className="ie-pair">
                  <div className="ie-bar fill-green" style={{ height: (m.inc / maxBar) * 100 + '%' }} title={fmtMoney(m.inc)} />
                  <div className="ie-bar fill-red" style={{ height: (m.exp / maxBar) * 100 + '%' }} title={fmtMoney(m.exp)} />
                </div>
                <span className="bar-label">{m.label}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <SectionTitle sub="Gastos de este mes">Por categoría</SectionTitle>
          {cats.length === 0 ? (
            <EmptyState icon="wallet" title="Sin gastos este mes" />
          ) : (
            <>
              <div className="cat-bar">
                {cats.map(([c, v], i) => (
                  <div key={c} className={cls('fill-' + catColors[i % catColors.length])} style={{ width: (v / catTotal * 100) + '%' }} title={`${c}: ${fmtMoney(v)}`} />
                ))}
              </div>
              <div className="grid" style={{ gap: 8, marginTop: 14 }}>
                {cats.slice(0, 6).map(([c, v], i) => (
                  <div key={c} style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: 12.5 }}>
                    <span className={cls('legend-dot', 'fill-' + catColors[i % catColors.length])} />
                    <span style={{ flex: 1 }}>{c}</span>
                    <span className="mono" style={{ color: 'var(--muted)' }}>{fmtMoney(v)}</span>
                    <span className="mono" style={{ width: 36, textAlign: 'right', color: 'var(--faint)' }}>{Math.round(v / catTotal * 100)}%</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  )
}
