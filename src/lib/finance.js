/* Helpers de finanzas (puros) sobre el modelo nuevo.
   El saldo de cada cuenta = opening + efecto de sus movimientos realizados.
   Lo pendiente (unrealized) NO cuenta hasta realizarse. */

import { parse, TODAY, iso, MONTHS } from './format.js'

export const monthKey = (d) => d.slice(0, 7)

// ¿El movimiento ya cuenta en el patrimonio? transfer/adjust siempre; income/expense solo si 'realized'.
function counts(m) {
  if (m.kind === 'transfer' || m.kind === 'adjust') return true
  return m.status !== 'pending'
}

// Saldos de todas las cuentas en una pasada: { accountId: saldo }.
export function allBalances(state) {
  const out = {}
  for (const a of state.accounts) out[a.id] = a.opening || 0
  for (const m of state.movements) {
    if (!counts(m)) continue
    if (m.kind === 'income' && m.accountId in out) out[m.accountId] += m.amount
    else if (m.kind === 'expense' && m.accountId in out) out[m.accountId] -= m.amount
    else if (m.kind === 'adjust' && m.accountId in out) out[m.accountId] += m.amount
    else if (m.kind === 'transfer') {
      if (m.accountId in out) out[m.accountId] -= m.amount
      if (m.toAccountId in out) out[m.toAccountId] += m.amount
    }
  }
  return out
}

export function accountBalance(state, accountId) {
  return allBalances(state)[accountId] || 0
}

export function netWorth(state, balances) {
  const b = balances || allBalances(state)
  return state.accounts.reduce((a, acc) => a + (b[acc.id] || 0), 0)
}

export function totalByKind(state, kind, balances) {
  const b = balances || allBalances(state)
  return state.accounts.filter((a) => a.kind === kind).reduce((a, acc) => a + (b[acc.id] || 0), 0)
}

// Ingresos pendientes (por cobrar): aún no cuentan en el patrimonio.
export function pendingIncome(state) {
  return state.movements
    .filter((m) => m.kind === 'income' && m.status === 'pending')
    .reduce((a, m) => a + m.amount, 0)
}

// Cálculo de un mes 'YYYY-MM': solo realizados, sin transferencias ni ajustes.
export function calcMonth(state, mKey) {
  const ms = state.movements.filter((m) => monthKey(m.date) === mKey && m.status !== 'pending')
  const inc = ms.filter((m) => m.kind === 'income').reduce((a, m) => a + m.amount, 0)
  const exp = ms.filter((m) => m.kind === 'expense').reduce((a, m) => a + m.amount, 0)
  return { inc, exp, balance: inc - exp }
}

// 'YYYY-MM' desplazado n meses respecto a una base (por defecto HOY).
export function monthOffset(n, base = TODAY) {
  const d = parse(base)
  d.setMonth(d.getMonth() + n)
  return iso(d).slice(0, 7)
}

export const monthLabel = (mKey) => MONTHS[parseInt(mKey.slice(5, 7), 10) - 1].slice(0, 3)