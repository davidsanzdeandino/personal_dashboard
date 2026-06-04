/* Constantes de Entrenamiento (compartidas por las pestañas). */

export const SPORTS = [
  { id: 'gym', label: 'Gym', kind: 'strength' },
  { id: 'calistenia', label: 'Calistenia', kind: 'strength' },
  { id: 'running', label: 'Running', kind: 'cardio' },
  { id: 'natacion', label: 'Natación', kind: 'cardio' },
  { id: 'bici', label: 'Bici', kind: 'cardio' },
  { id: 'boxeo', label: 'Boxeo', kind: 'cardio' },
]

export const SPORT_LABEL = Object.fromEntries(SPORTS.map((s) => [s.id, s.label]))