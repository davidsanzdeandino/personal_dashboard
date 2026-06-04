/* Datos de demostración. Genera un estado de ejemplo realista y RELATIVO a la
   fecha de hoy, para que la app se vea poblada y actual.

   Se cargan desde el "modo demo" del login o con "Cargar datos de demo" en
   Ajustes. Son borrables ("Vaciar todos los datos") y no afectan a nadie.

   Nota: las integraciones opcionales se dejan apagadas (negocios con stripe:false
   y sin dirección de cartera), para que la demo funcione sin desplegar las
   Edge Functions ni configurar claves. */

import { TODAY, iso, addDays, parse } from './format.js'

// id deterministas (únicos) para la demo
const ids = {}
const id = (p) => `demo-${p}-${ids[p] = (ids[p] || 0) + 1}`

// PRNG reproducible (mulberry32) para que la demo sea estable
function rng(seed) {
  let a = seed
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const rand = rng(20240601)
const pick = (arr) => arr[Math.floor(rand() * arr.length)]
const between = (lo, hi) => Math.round(lo + rand() * (hi - lo))

const today = parse(TODAY)
// 'YYYY-MM-DD' del día `day` del mes desplazado `k` meses respecto a hoy
const monthDay = (k, day) => iso(new Date(today.getFullYear(), today.getMonth() + k, day))

export function demoState() {
  // ----- cuentas -----
  const acc = {
    corriente: id('acc'),
    efectivo: id('acc'),
    ahorro: id('acc'),
    indexado: id('acc'),
  }
  const accounts = [
    { id: acc.corriente, name: 'Cuenta corriente', kind: 'liquidez', icon: 'wallet', opening: 1200 },
    { id: acc.efectivo, name: 'Efectivo', kind: 'liquidez', icon: 'wallet', opening: 150 },
    { id: acc.ahorro, name: 'Ahorro', kind: 'liquidez', icon: 'wallet', opening: 2500 },
    { id: acc.indexado, name: 'Fondo indexado', kind: 'activo', icon: 'target', opening: 5000 },
  ]

  // ----- negocios (sin Stripe en la demo) -----
  const biz = { web: id('biz'), tienda: id('biz') }
  const businesses = [
    { id: biz.web, name: 'Mi web', type: 'web', streams: ['subs', 'afiliacion'], stripe: false },
    { id: biz.tienda, name: 'Tienda online', type: 'web', streams: ['ventas'], stripe: false },
  ]

  // ----- movimientos: nómina, negocios, gastos, transfers (4 meses) -----
  const movements = []
  const mov = (m) => { movements.push({
    id: id('mov'), status: 'realized', accrualDate: null, toAccountId: null,
    businessId: null, stream: null, note: '', reimbursable: false, reimbursed: false,
    reimbursementId: null, recurring: false, ...m,
  }) }

  for (let k = -3; k <= 0; k++) {
    const isCurrent = k === 0
    const maxDay = isCurrent ? Math.min(today.getDate(), 28) : 28

    // Nómina (ingreso fijo recurrente)
    if (1 <= maxDay) mov({ kind: 'income', amount: 1850, date: monthDay(k, 1), accountId: acc.corriente, category: 'Nómina/Fijo', source: 'Nómina', recurring: true })

    // Negocio: web (suscripciones recurrentes + afiliación)
    if (3 <= maxDay) mov({ kind: 'income', amount: between(90, 160), date: monthDay(k, 3), accountId: acc.corriente, category: 'Negocio', source: 'Suscripciones web', businessId: biz.web, stream: 'subs', recurring: true })
    if (12 <= maxDay) mov({ kind: 'income', amount: between(40, 110), date: monthDay(k, 12), accountId: acc.corriente, category: 'Afiliados', source: 'Comisión afiliación', businessId: biz.web, stream: 'afiliacion' })

    // Negocio: tienda (ventas)
    if (8 <= maxDay) mov({ kind: 'income', amount: between(120, 320), date: monthDay(k, 8), accountId: acc.corriente, category: 'Negocio', source: 'Ventas tienda', businessId: biz.tienda, stream: 'ventas' })
    if (20 <= maxDay) mov({ kind: 'income', amount: between(80, 260), date: monthDay(k, 20), accountId: acc.corriente, category: 'Negocio', source: 'Ventas tienda', businessId: biz.tienda, stream: 'ventas' })

    // Gastos fijos
    if (2 <= maxDay) mov({ kind: 'expense', amount: 700, date: monthDay(k, 2), accountId: acc.corriente, category: 'Vivienda', source: 'Alquiler' })
    if (5 <= maxDay) mov({ kind: 'expense', amount: 13, date: monthDay(k, 5), accountId: acc.corriente, category: 'Suscripciones', source: 'Netflix' })
    if (5 <= maxDay) mov({ kind: 'expense', amount: 11, date: monthDay(k, 5), accountId: acc.corriente, category: 'Suscripciones', source: 'Spotify' })
    if (6 <= maxDay) mov({ kind: 'expense', amount: 22, date: monthDay(k, 6), accountId: acc.corriente, category: 'Software', source: 'Hosting + dominio' })
    if (10 <= maxDay) mov({ kind: 'expense', amount: 45, date: monthDay(k, 10), accountId: acc.corriente, category: 'Transporte', source: 'Abono transporte' })

    // Gastos variables (compra, restaurantes, ocio)
    for (const d of [7, 14, 21, 26]) {
      if (d <= maxDay) mov({ kind: 'expense', amount: between(28, 65), date: monthDay(k, d), accountId: acc.corriente, category: 'Comida', source: 'Supermercado' })
    }
    if (15 <= maxDay) mov({ kind: 'expense', amount: between(18, 42), date: monthDay(k, 15), accountId: acc.corriente, category: 'Restaurantes', source: pick(['Restaurante', 'Comida fuera', 'Brunch']) })
    if (18 <= maxDay) mov({ kind: 'expense', amount: between(10, 30), date: monthDay(k, 18), accountId: acc.efectivo, category: 'Ocio', source: pick(['Cine', 'Libro', 'Café']) })

    // Transferencia a ahorro
    if (4 <= maxDay) mov({ kind: 'transfer', amount: 300, date: monthDay(k, 4), accountId: acc.corriente, toAccountId: acc.ahorro, source: 'Ahorro mensual' })
  }

  // Ajuste de revalorización del fondo (este mes)
  if (today.getDate() >= 16) mov({ kind: 'adjust', amount: 124, date: monthDay(0, 16), accountId: acc.indexado, source: 'Revalorización fondo' })

  // Un ingreso pendiente (por cobrar) reciente
  mov({ kind: 'income', status: 'pending', amount: 180, date: addDays(TODAY, 6), accrualDate: TODAY, accountId: acc.corriente, category: 'Afiliados', source: 'Comisión pendiente', businessId: biz.web, stream: 'afiliacion' })

  // Un gasto reembolsable ya reembolsado (crea el ingreso enlazado)
  const reimbId = id('mov')
  const expId = id('mov')
  movements.push({
    id: expId, kind: 'expense', status: 'realized', amount: 60, date: addDays(TODAY, -9),
    accrualDate: null, accountId: acc.corriente, toAccountId: null, category: 'Transporte',
    source: 'Tren (viaje trabajo)', businessId: null, stream: null, note: '',
    reimbursable: true, reimbursed: true, reimbursementId: reimbId, recurring: false,
  })
  movements.push({
    id: reimbId, kind: 'income', status: 'realized', amount: 60, date: addDays(TODAY, -4),
    accrualDate: null, accountId: acc.corriente, toAccountId: null, category: 'Reembolso',
    source: 'Reembolso: Tren (viaje trabajo)', businessId: null, stream: null, note: '',
    reimbursable: false, reimbursed: false, reimbursementId: null, recurring: false,
  })

  // ----- objetivos -----
  const goals = [
    { id: id('goal'), title: 'Fondo de emergencia', kind: 'finance', current: 6000, target: 10000, unit: '€', deadline: addDays(TODAY, 120), lowerIsBetter: false, start: 3000 },
    { id: id('goal'), title: 'Press banca', kind: 'fitness', current: 72, target: 90, unit: 'kg', deadline: '', lowerIsBetter: false, start: 60 },
    { id: id('goal'), title: 'Peso objetivo', kind: 'fitness', current: 76, target: 72, unit: 'kg', deadline: addDays(TODAY, 90), lowerIsBetter: true, start: 80 },
    { id: id('goal'), title: 'Leer 30 días seguidos', kind: 'habit', current: 12, target: 30, unit: 'días', deadline: '', lowerIsBetter: false, start: 0 },
  ]

  // ----- hábitos (con registro de los últimos ~24 días) -----
  const habitDefs = [
    { name: 'Beber 2L de agua', icon: 'drop' },
    { name: 'Leer 20 min', icon: 'book' },
    { name: 'Meditar', icon: 'leaf' },
    { name: 'Dormir 8h', icon: 'moon' },
  ]
  const habits = habitDefs.map((h, hi) => {
    const log = {}
    for (let i = 0; i <= 24; i++) {
      // adherencia alta y algo variable por hábito
      if (rand() < 0.85 - hi * 0.07) log[addDays(TODAY, -i)] = true
    }
    log[TODAY] = hi < 2 // un par marcados hoy
    return { id: id('habit'), name: h.name, icon: h.icon, color: 'green', log }
  })

  // ----- rutinas -----
  const routines = [
    { id: id('rt'), sport: 'gym', name: 'Empuje', exercises: [
      { name: 'Press banca', sets: [{ targetReps: 8, targetWeight: 60, restSec: 120 }, { targetReps: 8, targetWeight: 60, restSec: 120 }, { targetReps: 6, targetWeight: 65, restSec: 150 }] },
      { name: 'Press militar', sets: [{ targetReps: 10, targetWeight: 30, restSec: 90 }, { targetReps: 10, targetWeight: 30, restSec: 90 }] },
      { name: 'Fondos', sets: [{ targetReps: 12, targetWeight: 0, restSec: 90 }, { targetReps: 12, targetWeight: 0, restSec: 90 }] },
    ] },
    { id: id('rt'), sport: 'gym', name: 'Tirón', exercises: [
      { name: 'Dominadas', sets: [{ targetReps: 8, targetWeight: 0, restSec: 120 }, { targetReps: 7, targetWeight: 0, restSec: 120 }] },
      { name: 'Remo con barra', sets: [{ targetReps: 10, targetWeight: 40, restSec: 90 }, { targetReps: 10, targetWeight: 40, restSec: 90 }] },
    ] },
    { id: id('rt'), sport: 'running', name: 'Rodaje suave', exercises: null, targetDistanceKm: 5, targetDurationMin: 30, targetRounds: null, notes: 'Zona 2, ritmo cómodo' },
  ]

  // ----- entrenos (últimas ~5 semanas) -----
  const workouts = []
  const strengthDay = (date, name, exDefs) => {
    const exercises = exDefs.map((e) => ({
      name: e.name,
      sets: e.sets.map((s) => {
        const reps = Math.max(1, s.targetReps - (rand() < 0.3 ? between(0, 2) : 0))
        const weight = s.targetWeight
        return { targetReps: s.targetReps, targetWeight: s.targetWeight, reps, weight, restSec: s.restSec }
      }),
    }))
    const volume = exercises.reduce((a, e) => a + e.sets.reduce((b, st) => b + st.reps * st.weight, 0), 0)
    workouts.push({ id: id('w'), date, sport: 'gym', name, durationSec: between(2700, 4200), notes: '', exercises, volume })
  }
  const runDay = (date) => workouts.push({ id: id('w'), date, sport: 'running', name: 'Rodaje suave', durationSec: between(1500, 2400), distanceKm: +(4 + rand() * 4).toFixed(1), notes: '' })
  const swimDay = (date) => workouts.push({ id: id('w'), date, sport: 'natacion', name: 'Natación', durationSec: between(1800, 2700), distanceKm: +(1 + rand()).toFixed(1), notes: '' })

  const push = [
    { name: 'Press banca', sets: [{ targetReps: 8, targetWeight: 60, restSec: 120 }, { targetReps: 8, targetWeight: 60, restSec: 120 }, { targetReps: 6, targetWeight: 65, restSec: 150 }] },
    { name: 'Press militar', sets: [{ targetReps: 10, targetWeight: 30, restSec: 90 }, { targetReps: 10, targetWeight: 30, restSec: 90 }] },
  ]
  const pull = [
    { name: 'Dominadas', sets: [{ targetReps: 8, targetWeight: 0, restSec: 120 }, { targetReps: 7, targetWeight: 0, restSec: 120 }] },
    { name: 'Remo con barra', sets: [{ targetReps: 10, targetWeight: 40, restSec: 90 }, { targetReps: 10, targetWeight: 40, restSec: 90 }] },
  ]
  // ~3-4 sesiones por semana, durante 5 semanas
  for (let w = 0; w < 5; w++) {
    const base = w * 7
    strengthDay(addDays(TODAY, -(base + 6)), 'Empuje', push)
    runDay(addDays(TODAY, -(base + 4)))
    strengthDay(addDays(TODAY, -(base + 2)), 'Tirón', pull)
    if (rand() < 0.6) swimDay(addDays(TODAY, -(base + 1)))
  }

  // ----- peso corporal (~60 días, tendencia ligera a la baja) -----
  const bodyweight = []
  for (let i = 59; i >= 0; i--) {
    const t = (59 - i) / 59
    const kg = +(80 - t * 3.5 + (rand() - 0.5) * 0.6).toFixed(1)
    bodyweight.push({ date: addDays(TODAY, -i), kg })
  }

  // ----- eventos (alrededor de hoy) -----
  const events = [
    { id: id('ev'), date: addDays(TODAY, -1), time: '09:00', title: 'Rodaje suave', type: 'training', durationMin: 40 },
    { id: id('ev'), date: TODAY, time: '08:00', title: 'Entreno de empuje', type: 'training', durationMin: 75 },
    { id: id('ev'), date: TODAY, time: '17:30', title: 'Reunión de proyecto', type: 'work', durationMin: 60 },
    { id: id('ev'), date: addDays(TODAY, 1), time: '10:00', title: 'Llamada con cliente', type: 'work', durationMin: 30 },
    { id: id('ev'), date: addDays(TODAY, 2), time: '19:00', title: 'Cena con amigos', type: 'personal', durationMin: 120 },
    { id: id('ev'), date: addDays(TODAY, 3), time: '18:00', title: 'Fisioterapia', type: 'personal', durationMin: 45 },
  ]

  return {
    profile: { name: 'Alex', currency: 'EUR' },
    events,
    habits,
    bodyweight,
    photos: {},
    workouts,
    routines,
    accounts,
    businesses,
    movements,
    goals,
    investments: {},
  }
}
