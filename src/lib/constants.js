/* Constantes de Calendario / eventos (compartidas por Inicio y Calendario).

   Tipos de evento disponibles. Si añades uno nuevo, recuerda añadir también
   sus clases en styles.css: .dot-<tipo>, .bar-<tipo> y .bg-<tipo>. */

export const EVENT_TYPES = ['training', 'work', 'personal']

export const EVENT_LABEL = {
  training: 'Entreno',
  work: 'Trabajo',
  personal: 'Personal',
}

export const EVENT_TONE = {
  training: 'green',
  work: 'blue',
  personal: 'amber',
}
