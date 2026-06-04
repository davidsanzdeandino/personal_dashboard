/* Pestaña Cuerpo — peso corporal (tendencia) + fotos de progreso (Hoy + Historial). */

import { useState, useEffect, useCallback } from 'react'
import { usePD } from '../../lib/store.js'
import { supabase } from '../../lib/supabase.js'
import { TODAY, fmtDateLong, parse, MONTHS } from '../../lib/format.js'
import { Card, Button, SectionTitle, Field, Sparkline, Segmented, Modal, IconButton, EmptyState, cls } from '../../components/common.jsx'
import { Icon } from '../../components/icons.jsx'

const BUCKET = 'progress'

function fmtPhotoDate(date) {
  const d = parse(date)
  return `${d.getDate()} ${MONTHS[d.getMonth()].slice(0, 3)} ${d.getFullYear()}`
}

export default function Body() {
  const [state, update] = usePD()
  const [adding, setAdding] = useState(false)
  const [kg, setKg] = useState('')

  const bw = state.bodyweight
  const latest = bw[bw.length - 1]
  const monthAgo = bw[Math.max(0, bw.length - 30)]
  const delta = latest && monthAgo ? +(latest.kg - monthAgo.kg).toFixed(1) : 0
  const series = bw.slice(-60).map((b) => b.kg)

  const saveKg = () => {
    if (!kg) return
    update((d) => {
      const i = d.bodyweight.findIndex((b) => b.date === TODAY)
      if (i >= 0) d.bodyweight[i].kg = +kg
      else d.bodyweight.push({ date: TODAY, kg: +kg })
    })
    setKg('')
    setAdding(false)
  }

  return (
    <div className="grid body-cols" style={{ gridTemplateColumns: 'minmax(0,1.5fr) minmax(0,1fr)', gap: 18 }}>
      <div className="grid" style={{ gap: 18, alignContent: 'start' }}>
        <Card>
          <SectionTitle
            icon="arrowDown"
            sub="Últimos 60 días"
            right={<Button variant="accent" size="sm" icon="plus" onClick={() => setAdding(true)}>Registrar peso</Button>}
          >
            Peso corporal
          </SectionTitle>
          {bw.length === 0 ? (
            <div className="empty"><div className="empty-sub">Aún no has registrado tu peso. Pulsa «Registrar peso».</div></div>
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, marginBottom: 14 }}>
                <div className="stat-value" style={{ fontSize: 34 }}>{latest ? latest.kg + ' kg' : '—'}</div>
                <span className={cls('delta', delta <= 0 ? 'delta-up' : 'delta-down')}>
                  <Icon name={delta <= 0 ? 'arrowDown' : 'arrowUp'} size={13} />
                  {`${Math.abs(delta)} kg / 30d`}
                </span>
              </div>
              <div style={{ width: '100%' }}>
                <Sparkline data={series} width={600} height={90} tone="blue" />
              </div>
            </>
          )}
          {adding && (
            <div style={{ display: 'flex', gap: 10, marginTop: 14, alignItems: 'flex-end' }}>
              <Field label="Peso de hoy (kg)">
                <input type="number" step={0.1} autoFocus value={kg} placeholder={latest ? String(latest.kg) : '75.0'} onChange={(e) => setKg(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && saveKg()} />
              </Field>
              <Button variant="primary" onClick={saveKg}>Guardar</Button>
              <Button variant="ghost" onClick={() => setAdding(false)}>Cancelar</Button>
            </div>
          )}
        </Card>
      </div>

      <PhotosCard />
    </div>
  )
}

function PhotosCard() {
  const [mode, setMode] = useState('today')
  const [userId, setUserId] = useState(null)
  const [todayUrl, setTodayUrl] = useState(null)
  const [todayLoading, setTodayLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [photos, setPhotos] = useState(null) // [{ date, url }] | null mientras carga
  const [viewer, setViewer] = useState(null) // foto ampliada

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id || null))
  }, [])

  // Foto de hoy
  const loadToday = useCallback(async () => {
    if (!userId) return
    setTodayLoading(true)
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(`${userId}/${TODAY}`, 3600)
    setTodayUrl(error ? null : data.signedUrl)
    setTodayLoading(false)
  }, [userId])

  useEffect(() => { loadToday() }, [loadToday])

  // Historial: lista la carpeta del usuario y firma todas las URLs
  const loadHistory = useCallback(async () => {
    if (!userId) return
    setPhotos(null)
    const { data: files, error } = await supabase.storage.from(BUCKET).list(userId, { limit: 1000, sortBy: { column: 'name', order: 'desc' } })
    if (error || !files) { setPhotos([]); return }
    const dated = files.filter((f) => f.id || f.name).map((f) => f.name).sort((a, b) => b.localeCompare(a))
    const signed = await supabase.storage.from(BUCKET).createSignedUrls(dated.map((name) => `${userId}/${name}`), 3600)
    const list = (signed.data || []).map((s, i) => ({ date: dated[i], url: s.signedUrl })).filter((p) => p.url)
    setPhotos(list)
  }, [userId])

  useEffect(() => {
    if (mode === 'history' && photos === null) loadHistory()
  }, [mode, photos, loadHistory])

  const onPhoto = async (e) => {
    const file = e.target.files[0]
    if (!file || !userId) return
    setUploading(true)
    const { error } = await supabase.storage.from(BUCKET).upload(`${userId}/${TODAY}`, file, { upsert: true, contentType: file.type })
    if (!error) {
      setTodayUrl(URL.createObjectURL(file))
      setPhotos(null) // forzar recarga del historial la próxima vez
    } else {
      alert('No se pudo subir la foto. ¿Tienes conexión?')
    }
    setUploading(false)
  }

  const deletePhoto = async (date) => {
    if (!userId || !confirm('¿Eliminar esta foto?')) return
    await supabase.storage.from(BUCKET).remove([`${userId}/${date}`])
    setPhotos((prev) => (prev ? prev.filter((p) => p.date !== date) : prev))
    if (date === TODAY) setTodayUrl(null)
    setViewer(null)
  }

  return (
    <Card>
      <SectionTitle
        icon="camera"
        sub={mode === 'today' ? fmtDateLong(TODAY) : 'Todas tus fotos'}
        right={<Segmented size="sm" value={mode} onChange={setMode} options={[{ value: 'today', label: 'Hoy' }, { value: 'history', label: 'Historial' }]} />}
      >
        Fotos de progreso
      </SectionTitle>

      {mode === 'today' ? (
        <label className="photo-slot">
          <input type="file" accept="image/*" style={{ display: 'none' }} onChange={onPhoto} disabled={uploading} />
          {todayUrl ? (
            <img src={todayUrl} alt="Foto de hoy" />
          ) : (
            <div className="photo-empty">
              <Icon name="camera" size={28} style={{ color: 'var(--faint)' }} />
              <span>{uploading ? 'Subiendo…' : todayLoading ? 'Cargando…' : 'Toca para añadir foto de progreso'}</span>
              <span className="mono" style={{ fontSize: 10.5, color: 'var(--faint)' }}>se guarda en tu cuenta (privada)</span>
            </div>
          )}
        </label>
      ) : photos === null ? (
        <div className="empty"><div className="empty-sub">Cargando fotos…</div></div>
      ) : photos.length === 0 ? (
        <EmptyState icon="camera" title="Sin fotos aún" sub="Sube tu primera foto desde la pestaña «Hoy»." />
      ) : (
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(96px,1fr))', gap: 8 }}>
          {photos.map((p) => (
            <button key={p.date} onClick={() => setViewer(p)} style={{ border: 'none', padding: 0, background: 'none', cursor: 'pointer', borderRadius: 'var(--radius-sm)', overflow: 'hidden', position: 'relative', aspectRatio: '3/4' }} title={fmtPhotoDate(p.date)}>
              <img src={p.url} alt={p.date} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              <span className="mono" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, fontSize: 9.5, color: '#fff', background: 'oklch(0 0 0 / 0.45)', padding: '2px 4px', textAlign: 'center' }}>
                {fmtPhotoDate(p.date)}
              </span>
            </button>
          ))}
        </div>
      )}

      {viewer && (
        <Modal
          title={fmtPhotoDate(viewer.date)}
          onClose={() => setViewer(null)}
          footer={<Button variant="danger" icon="trash" onClick={() => deletePhoto(viewer.date)}>Eliminar foto</Button>}
        >
          <img src={viewer.url} alt={viewer.date} style={{ width: '100%', borderRadius: 'var(--radius-sm)', display: 'block' }} />
        </Modal>
      )}
    </Card>
  )
}