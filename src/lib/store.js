/* Store del Panel — estado + persistencia local + sincronización.

   API pública:
     usePD()                 -> [state, update]   (hook de React)
     store.getState/setState/update/subscribe/reset

   Modelo de finanzas:
   - accounts: cuentas. kind 'liquidez' (banco, efectivo, saldo de pasarelas)
     o 'activo' (cripto, indexados). Campo `opening` = saldo inicial.
   - movements: ingresos/gastos/transferencias/ajustes. El saldo de cada cuenta
     se CALCULA: opening + movimientos realizados que la afectan.
       · income   -> +amount a accountId            (si status 'realized')
       · expense  -> -amount de accountId           (si status 'realized')
       · transfer -> -amount de accountId, +amount a toAccountId (siempre realizado)
       · adjust   -> +amount (con signo) a accountId  (revalorización: APY, corrección)
     `status` 'realized' | 'pending'. Lo pendiente (unrealized) NO cuenta en el
     patrimonio hasta realizarse. Solo income/expense pueden ser 'pending'.
   - businesses: negocios; cada movimiento se asigna a uno (o a personal con null).

   Local-first: el estado vive en localStorage y se sincroniza con Supabase
   (ver sync.js). Las integraciones opcionales (Stripe / cartera on-chain) leen
   en vivo desde Edge Functions; sus claves viven solo en el servidor. */

import { useSyncExternalStore } from 'react'

const KEY = 'pd_state_v8'

// ---------- estado inicial ----------
// Arranca vacío: el usuario rellena sus datos desde la app. Para ver la app
// con contenido de ejemplo, usa "Cargar datos de demo" en Ajustes (o el modo
// demo del login). El nombre se edita en Ajustes y aparece en el saludo.
export function seed() {
  return {
    profile: { name: '', currency: 'EUR' },
    events: [],
    habits: [],
    bodyweight: [],
    photos: {},
    workouts: [],
    routines: [],
    accounts: [],
    businesses: [],
    movements: [],
    goals: [],
    investments: {},
  }
}

// ---------- estado + persistencia ----------
let state = load()
const listeners = new Set()

function load() {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return JSON.parse(raw)
  } catch (e) { /* ignorar */ }
  const s = seed()
  save(s)
  return s
}

function save(s) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s))
  } catch (e) { /* ignorar */ }
}

function emit() {
  listeners.forEach((fn) => fn())
}

function getState() {
  return state
}

function setState(next) {
  state = typeof next === 'function' ? next(state) : next
  save(state)
  emit()
}

function update(mutator) {
  const draft = structuredClone(state)
  mutator(draft)
  setState(draft)
}

function subscribe(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function reset() {
  try {
    localStorage.removeItem(KEY)
  } catch (e) { /* ignorar */ }
  state = seed()
  save(state)
  emit()
}

// ---------- binding de React ----------
export function usePD() {
  const snapshot = useSyncExternalStore(subscribe, getState)
  return [snapshot, update]
}

export const store = { getState, setState, update, subscribe, reset }
