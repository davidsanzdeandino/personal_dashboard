/* Utilidades puras: fechas, dinero, duración, ids. Sin estado.
   TODAY es la fecha de referencia del prototipo (formato YYYY-MM-DD).
   Cuando conectemos datos reales pasará a ser la fecha del sistema. */

export const TODAY = (() => {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
})()

export const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
export const DOW_SHORT = ['L', 'M', 'X', 'J', 'V', 'S', 'D']
export const DOW_LONG = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo']

export function iso(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function parse(s) {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function addDays(s, n) {
  const d = parse(s)
  d.setDate(d.getDate() + n)
  return iso(d)
}

// 0 = lunes ... 6 = domingo
export function dow(s) {
  return (parse(s).getDay() + 6) % 7
}

export function weekStart(s) {
  return addDays(s, -dow(s))
}

export function fmtDateLong(s) {
  const d = parse(s)
  return `${DOW_LONG[dow(s)]}, ${d.getDate()} de ${MONTHS[d.getMonth()]}`
}

export function fmtMoney(n, opts = {}) {
  const sign = n < 0 ? '-' : ''
  const v = Math.abs(n)
  const str = v.toLocaleString('es-ES', {
    minimumFractionDigits: opts.dec ?? 0,
    maximumFractionDigits: opts.dec ?? 0,
  })
  return `${sign}${str}\u00a0€`
}

export function fmtDuration(sec) {
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = Math.floor(sec % 60)
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m`
  return `${m}:${String(s).padStart(2, '0')}`
}

export function uid() {
  return Math.random().toString(36).slice(2, 9)
}