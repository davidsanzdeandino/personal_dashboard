/* Llama a la Edge Function 'wallet-stats' y devuelve posiciones Morpho + precios.
   La dirección (pública) se pasa en el body; la función la consulta en Morpho. */

import { supabase } from './supabase.js'

export async function fetchWalletStats(address) {
  const { data, error } = await supabase.functions.invoke('wallet-stats', {
    body: address ? { address } : {},
  })
  if (error) {
    let msg = error.message || 'No se pudo cargar la cartera'
    try {
      const body = await error.context?.json?.()
      if (body && body.error) msg = body.error
    } catch (e) { /* ignorar */ }
    throw new Error(msg)
  }
  if (data && data.error) throw new Error(data.error)
  return data
}