// Supabase Edge Function: stripe-stats
// Devuelve métricas en vivo de Stripe para el panel: MRR, suscripciones activas,
// saldo (disponible/pendiente) y últimos payouts.
//
// La clave SECRETA de Stripe vive SOLO aquí (como secreto del proyecto):
//   supabase secrets set STRIPE_SECRET_KEY=sk_live_...
//
// Despliegue:
//   supabase functions deploy stripe-stats
//
// Nota: es un patrón de propietario único (la clave es la de TU cuenta de
// Stripe). Pensado para self-host de un solo usuario; no expongas esta función
// en una instancia multiusuario sin añadir lógica de autorización por cuenta.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } })

const STRIPE = "https://api.stripe.com/v1"

async function stripeGet(path: string, key: string, params: Record<string, string> = {}) {
  const qs = new URLSearchParams(params).toString()
  const res = await fetch(`${STRIPE}${path}${qs ? "?" + qs : ""}`, {
    headers: { Authorization: `Bearer ${key}` },
  })
  if (!res.ok) throw new Error(`Stripe ${path} -> ${res.status}`)
  return res.json()
}

// Normaliza el importe de un precio recurrente a importe MENSUAL (en céntimos).
function toMonthly(unitAmount: number, qty: number, interval: string, count: number) {
  const amt = (unitAmount || 0) * (qty || 1)
  const perInterval = amt / (count || 1)
  switch (interval) {
    case "month": return perInterval
    case "year": return perInterval / 12
    case "week": return (perInterval * 52) / 12
    case "day": return (perInterval * 365) / 12
    default: return perInterval
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors })

  try {
    // --- Autenticación: exige un usuario válido de Supabase ---
    const authHeader = req.headers.get("Authorization") || ""
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    )
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return json({ error: "No autenticado" }, 401)

    const key = Deno.env.get("STRIPE_SECRET_KEY")
    if (!key) return json({ error: "Falta STRIPE_SECRET_KEY en los secretos de la función" }, 500)

    // --- Llamadas a Stripe en paralelo ---
    const [subs, balance, payouts] = await Promise.all([
      stripeGet("/subscriptions", key, { status: "active", limit: "100" }),
      stripeGet("/balance", key),
      stripeGet("/payouts", key, { limit: "5" }),
    ])

    // MRR a partir de las suscripciones activas
    let mrr = 0
    let activeSubscriptions = 0
    for (const sub of subs.data || []) {
      activeSubscriptions++
      for (const item of sub.items?.data || []) {
        const price = item.price || {}
        const rec = price.recurring || {}
        mrr += toMonthly(price.unit_amount || 0, item.quantity || 1, rec.interval || "month", rec.interval_count || 1)
      }
    }

    // Saldo: arrays [{amount, currency}] -> objeto { moneda: céntimos }
    const toMap = (arr: any[]) => {
      const out: Record<string, number> = {}
      for (const b of arr || []) out[b.currency] = (out[b.currency] || 0) + b.amount
      return out
    }
    const balanceAvailable = toMap(balance.available)
    const balancePending = toMap(balance.pending)
    const currency = (balance.available?.[0]?.currency) || (balance.pending?.[0]?.currency) || "eur"

    const recentPayouts = (payouts.data || []).map((p: any) => ({
      arrivalDate: p.arrival_date, // unix (segundos)
      status: p.status,
      amount: p.amount,            // céntimos
    }))

    return json({
      currency,
      mrr: Math.round(mrr),
      activeSubscriptions,
      balanceAvailable,
      balancePending,
      recentPayouts,
    })
  } catch (e) {
    return json({ error: (e as Error).message || "Error en stripe-stats" }, 500)
  }
})
