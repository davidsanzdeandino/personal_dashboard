/* Pestaña Inversiones (OPCIONAL) — posición en Morpho (USD) + APY neto + renta/mes
   + precios BTC/ETH. Lee de la Edge Function 'wallet-stats' por dirección pública
   (solo lectura). Vacío por defecto: pega tu dirección 0x… para activarlo. */

import { useState, useEffect } from 'react'
import { usePD } from '../../lib/store.js'
import { fetchWalletStats } from '../../lib/walletStats.js'
import { Card, Button, Stat, SectionTitle, Field, EmptyState } from '../../components/common.jsx'
import { Icon } from '../../components/icons.jsx'

const isValid = (a) => /^0x[0-9a-fA-F]{40}$/.test((a || '').trim())

function fmtUsd(n, dec) {
  const v = Number(n || 0)
  const opts = dec != null
    ? { minimumFractionDigits: dec, maximumFractionDigits: dec }
    : { maximumFractionDigits: 2 }
  return '$' + v.toLocaleString('en-US', opts)
}
const fmtPct = (x) => (Number(x || 0) * 100).toFixed(2) + '%'
const chainName = (id) => (id === 8453 ? 'Base' : id === 1 ? 'Ethereum' : 'Chain ' + id)

export default function Inversiones() {
  const [state, update] = usePD()
  const saved = state.investments?.address || ''
  const effectiveAddr = saved // sin dirección por defecto: opt-in

  const [addrInput, setAddrInput] = useState(saved)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(!!saved)
  const [error, setError] = useState('')

  const load = async (addr) => {
    if (!addr) return
    setLoading(true)
    setError('')
    try {
      const d = await fetchWalletStats(addr)
      setData(d)
    } catch (e) {
      setError(e.message || 'Error al cargar la cartera')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (effectiveAddr) load(effectiveAddr)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const saveAddr = () => {
    const a = addrInput.trim().toLowerCase()
    if (!isValid(a)) return
    update((d) => {
      if (!d.investments) d.investments = {}
      d.investments.address = a
    })
    load(a)
  }

  const dirty = addrInput.trim().toLowerCase() !== effectiveAddr.toLowerCase()

  return (
    <div className="grid" style={{ gap: 18 }}>
      <Card>
        <SectionTitle
          icon="wallet"
          sub="Dirección pública · solo lectura (opcional)"
          right={<Button variant="ghost" size="sm" onClick={() => load(effectiveAddr)} disabled={loading || !effectiveAddr}>{loading ? 'Actualizando…' : 'Actualizar'}</Button>}
        >
          Cartera on-chain
        </SectionTitle>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ flex: 1, minWidth: 220 }}>
            <Field label="Dirección (0x…)">
              <input
                value={addrInput}
                spellCheck={false}
                placeholder="0x…"
                onChange={(e) => setAddrInput(e.target.value)}
                style={{ fontFamily: 'var(--mono)', fontSize: 12.5 }}
              />
            </Field>
          </div>
          <Button variant="primary" onClick={saveAddr} disabled={!isValid(addrInput) || !dirty}>Guardar</Button>
        </div>
        {addrInput && !isValid(addrInput) && (
          <div style={{ fontSize: 11.5, marginTop: 6, color: 'var(--red)' }}>No parece una dirección 0x válida (42 caracteres).</div>
        )}
        <div className="muted" style={{ fontSize: 11.5, marginTop: 8 }}>
          Solo se lee tu posición de Morpho (Base y Ethereum) y los precios de BTC/ETH. Nunca se piden claves privadas.
        </div>
      </Card>

      {!effectiveAddr ? (
        <Card>
          <EmptyState
            icon="target"
            title="Conecta tu cartera (opcional)"
            sub="Pega una dirección pública 0x… arriba para ver tu posición en Morpho y los precios de BTC/ETH. Requiere desplegar la Edge Function 'wallet-stats' (ver README)."
          />
        </Card>
      ) : loading && !data ? (
        <Card><div className="muted" style={{ fontSize: 12.5 }}>Cargando cartera…</div></Card>
      ) : error ? (
        <Card><div style={{ fontSize: 12.5, color: 'var(--red)' }}>{error}</div></Card>
      ) : data ? (
        <>
          <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))' }}>
            <Card className="tint-ink"><Stat label="Posición en Morpho" value={fmtUsd(data.morphoTotal, 2)} sub={data.morpho && data.morpho.length ? `${data.morpho.length} ${data.morpho.length === 1 ? 'vault' : 'vaults'}` : 'sin posiciones'} /></Card>
            <Card><Stat label="APY neto" value={data.morphoApy > 0 ? fmtPct(data.morphoApy) : '—'} tone="green" sub="anualizado" /></Card>
            <Card><Stat label="Renta estimada" value={data.morphoMonthly > 0 ? fmtUsd(data.morphoMonthly, 2) : '—'} tone="green" sub="al mes (ritmo actual)" /></Card>
            <Card><Stat label="Bitcoin (BTC)" value={data.btc != null ? fmtUsd(data.btc) : '—'} tone="amber" sub="precio actual" /></Card>
            <Card><Stat label="Ethereum (ETH)" value={data.eth != null ? fmtUsd(data.eth) : '—'} tone="blue" sub="precio actual" /></Card>
          </div>

          <Card style={{ padding: 0 }}>
            <div style={{ padding: 'var(--pad-card) var(--pad-card) 8px' }}>
              <SectionTitle sub="En vivo desde Morpho">Posiciones</SectionTitle>
            </div>
            {(!data.morpho || data.morpho.length === 0) ? (
              <div style={{ padding: '0 var(--pad-card) var(--pad-card)' }}>
                <EmptyState icon="target" title="Sin posiciones en Morpho" sub="Esta dirección no tiene depósitos en Morpho en Base ni Ethereum." />
              </div>
            ) : (
              data.morpho.map((p, i) => (
                <div key={i} className="tx-row" style={{ cursor: 'default' }}>
                  <div className="tx-icon tx-in"><Icon name="target" size={16} /></div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 13.5 }}>{p.name}</div>
                    <div className="muted" style={{ fontSize: 11.5, marginTop: 2 }}>
                      {chainName(p.chainId)}{p.apy > 0 ? ` · APY ${fmtPct(p.apy)}` : ''}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div className="mono" style={{ fontWeight: 600 }}>{fmtUsd(p.value, 2)}</div>
                    {p.monthly > 0 && <div className="mono muted" style={{ fontSize: 11.5, marginTop: 2 }}>+{fmtUsd(p.monthly, 2)}/mes</div>}
                  </div>
                </div>
              ))
            )}
          </Card>

          {data.updatedAt && (
            <div className="muted" style={{ fontSize: 11, textAlign: 'right' }}>
              Actualizado: {new Date(data.updatedAt).toLocaleString('es-ES')}
            </div>
          )}
        </>
      ) : null}
    </div>
  )
}
