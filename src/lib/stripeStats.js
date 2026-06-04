/* Llama a la Edge Function 'stripe-stats' y devuelve las métricas en vivo.
   La llamada va autenticada con la sesión del usuario (supabase.functions.invoke
   añade el token automáticamente). La clave de Stripe vive solo en el servidor. */

import { supabase } from './supabase.js'

export async function fetchStripeStats() {
  const { data, error } = await supabase.functions.invoke('stripe-stats')
  if (error) {
    let msg = error.message || 'No se pudo cargar Stripe'
    try {
      const body = await error.context?.json?.()
      if (body && body.error) msg = body.error
    } catch (e) { /* ignorar */ }
    throw new Error(msg)
  }
  if (data && data.error) throw new Error(data.error)
  return data
}