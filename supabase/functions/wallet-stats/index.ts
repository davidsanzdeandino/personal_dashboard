// Supabase Edge Function: wallet-stats
// Devuelve, para una dirección pública (solo lectura):
//   - posiciones en Morpho (Ethereum + Base), valor en USD y APY
//   - precios actuales de BTC y ETH (USD)
//   - eurUsd: factor para convertir USD -> EUR (EUR por 1 USD)
//
// La dirección llega en el body { address }. No se piden NUNCA claves privadas.
//
// Despliegue:
//   supabase functions deploy wallet-stats
//
// El cliente calcula el patrimonio cripto en € como morphoTotal * eurUsd, por eso
// eurUsd se expresa como EUR por USD (~0.92), no al revés.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } })

const isAddress = (a: string) => /^0x[0-9a-fA-F]{40}$/.test((a || "").trim())
const CHAINS = [1, 8453] // Ethereum, Base

// --- Precios (BTC/ETH en USD y EUR) vía CoinGecko ---
async function fetchPrices() {
  try {
    const res = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd,eur",
    )
    if (!res.ok) throw new Error("coingecko " + res.status)
    const p = await res.json()
    const btc = p.bitcoin?.usd ?? null
    const eth = p.ethereum?.usd ?? null
    // EUR por 1 USD, derivado del precio de BTC en ambas monedas
    const eurUsd = (p.bitcoin?.eur && p.bitcoin?.usd) ? p.bitcoin.eur / p.bitcoin.usd : 0.92
    return { btc, eth, eurUsd }
  } catch (_e) {
    return { btc: null, eth: null, eurUsd: 0.92 }
  }
}

// --- Posiciones en Morpho (API GraphQL pública) ---
// ⚠️ El esquema de la API de Morpho evoluciona. Verifica los campos contra
// https://docs.morpho.org y el playground en https://blue-api.morpho.org/graphql.
// Si la consulta falla, se devuelve [] y el resto de la respuesta sigue siendo válido.
async function fetchMorpho(address: string) {
  const query = `
    query($address: String!, $chainId: Int!) {
      userByAddress(address: $address, chainId: $chainId) {
        vaultPositions {
          assetsUsd
          vault {
            name
            address
            state { netApy }
          }
        }
      }
    }`
  const positions: Array<{ name: string; chainId: number; value: number; apy: number; monthly: number }> = []

  for (const chainId of CHAINS) {
    try {
      const res = await fetch("https://blue-api.morpho.org/graphql", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, variables: { address: address.toLowerCase(), chainId } }),
      })
      if (!res.ok) continue
      const body = await res.json()
      const vps = body?.data?.userByAddress?.vaultPositions || []
      for (const vp of vps) {
        const value = Number(vp.assetsUsd || 0)
        if (value <= 0) continue
        const apy = Number(vp.vault?.state?.netApy || 0)
        positions.push({
          name: vp.vault?.name || "Vault",
          chainId,
          value,
          apy,
          monthly: (value * apy) / 12,
        })
      }
    } catch (_e) {
      // ignora este chain y sigue
    }
  }
  return positions
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

    const { address } = await req.json().catch(() => ({ address: "" }))
    if (!isAddress(address)) return json({ error: "Dirección 0x… no válida" }, 400)

    const [prices, morpho] = await Promise.all([fetchPrices(), fetchMorpho(address)])

    const morphoTotal = morpho.reduce((a, p) => a + p.value, 0)
    const morphoMonthly = morpho.reduce((a, p) => a + p.monthly, 0)
    const morphoApy = morphoTotal > 0 ? (morphoMonthly * 12) / morphoTotal : 0

    return json({
      morpho,
      morphoTotal,
      morphoApy,
      morphoMonthly,
      morphoMonthlyEur: morphoMonthly * prices.eurUsd,
      btc: prices.btc,
      eth: prices.eth,
      eurUsd: prices.eurUsd,
      updatedAt: new Date().toISOString(),
    })
  } catch (e) {
    return json({ error: (e as Error).message || "Error en wallet-stats" }, 500)
  }
})
