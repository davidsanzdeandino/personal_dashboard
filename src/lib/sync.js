/* Capa de sincronización local-first con Supabase.
   - Sube el estado (sin fotos) al cambiar, con retardo (debounce).
   - Lo baja al iniciar y al volver a la pestaña / recuperar conexión.
   - "La última edición gana" comparando marcas de tiempo.
   Las fotos se excluyen (irán a Storage en un paso posterior). */

import { useState, useEffect } from 'react'
import { supabase } from './supabase.js'
import { store } from './store.js'

const META_KEY = 'pd_sync_meta' // { localUpdatedAt, lastSyncedAt }

let applyingRemote = false
let pushTimer = null
let unsub = null
let started = false

// ---- estado de sync para la UI ----
let status = 'idle' // idle | syncing | synced | offline | error
const statusListeners = new Set()
function setStatus(s) {
  status = s
  statusListeners.forEach((fn) => fn(s))
}

function readMeta() {
  try { return JSON.parse(localStorage.getItem(META_KEY)) || {} } catch (e) { return {} }
}
function writeMeta(m) {
  try { localStorage.setItem(META_KEY, JSON.stringify(m)) } catch (e) { /* ignorar */ }
}
function markLocalChanged() {
  const m = readMeta()
  m.localUpdatedAt = Date.now()
  writeMeta(m)
}

function isEmptyState(s) {
  if (!s) return true
  return (
    (s.accounts || []).length === 0 &&
    (s.movements || []).length === 0 &&
    (s.goals || []).length === 0 &&
    (s.events || []).length === 0 &&
    (s.habits || []).length === 0 &&
    (s.workouts || []).length === 0 &&
    (s.businesses || []).length === 0
  )
}

// Estado sin fotos (las fotos van a Storage más adelante).
function stateForSync(s) {
  const { photos, ...rest } = s
  return rest
}

async function getUserId() {
  const { data } = await supabase.auth.getUser()
  return data.user ? data.user.id : null
}

async function push() {
  const userId = await getUserId()
  if (!userId) return
  setStatus('syncing')
  const now = new Date().toISOString()
  const payload = { user_id: userId, data: stateForSync(store.getState()), updated_at: now }
  const { error } = await supabase.from('app_state').upsert(payload, { onConflict: 'user_id' })
  if (error) {
    setStatus(navigator.onLine ? 'error' : 'offline')
    return
  }
  const ms = Date.parse(now)
  writeMeta({ localUpdatedAt: ms, lastSyncedAt: ms })
  setStatus('synced')
}

async function pull() {
  const userId = await getUserId()
  if (!userId) return
  setStatus('syncing')
  const { data, error } = await supabase
    .from('app_state')
    .select('data, updated_at')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) {
    setStatus(navigator.onLine ? 'error' : 'offline')
    return
  }

  const meta = readMeta()
  const localAt = meta.localUpdatedAt || 0
  const syncedAt = meta.lastSyncedAt || 0
  const localEmpty = isEmptyState(store.getState())
  // Hay cambios locales sin subir, o datos locales que nunca se sincronizaron.
  const localDirty = localAt > syncedAt || (syncedAt === 0 && !localEmpty)

  if (!data) {
    // Aún no hay nada en el servidor: subimos lo local.
    await push()
    return
  }

  const remoteAt = Date.parse(data.updated_at) || 0

  if (remoteAt > syncedAt && !localDirty) {
    // El servidor es más nuevo y no tenemos cambios locales → aplicamos remoto.
    const localPhotos = store.getState().photos || {}
    applyingRemote = true
    store.setState({ ...data.data, photos: localPhotos })
    applyingRemote = false
    writeMeta({ localUpdatedAt: remoteAt, lastSyncedAt: remoteAt })
    setStatus('synced')
  } else if (localDirty) {
    // Tenemos cambios locales → los subimos (ganan).
    await push()
  } else {
    setStatus('synced')
  }
}

function onChange() {
  if (applyingRemote) return
  markLocalChanged()
  clearTimeout(pushTimer)
  setStatus('syncing')
  pushTimer = setTimeout(() => { push() }, 1500)
}

function onFocus() { pull() }
function onVisibility() { if (document.visibilityState === 'visible') pull() }

export function startSync() {
  if (started) return
  started = true
  unsub = store.subscribe(onChange)
  window.addEventListener('focus', onFocus)
  document.addEventListener('visibilitychange', onVisibility)
  window.addEventListener('online', onFocus)
  pull()
}

export function stopSync() {
  if (!started) return
  started = false
  if (unsub) unsub()
  unsub = null
  clearTimeout(pushTimer)
  window.removeEventListener('focus', onFocus)
  document.removeEventListener('visibilitychange', onVisibility)
  window.removeEventListener('online', onFocus)
  setStatus('idle')
}

export function useSyncStatus() {
  const [s, setS] = useState(status)
  useEffect(() => {
    statusListeners.add(setS)
    setS(status)
    return () => statusListeners.delete(setS)
  }, [])
  return s
}