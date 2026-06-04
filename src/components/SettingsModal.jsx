/* Modal de Ajustes — perfil, apariencia, datos y cuenta. */

import { useState } from 'react'
import { usePD, store } from '../lib/store.js'
import { demoState } from '../lib/demoData.js'
import { Modal, Button, Segmented, Field } from './common.jsx'
import { ACCENTS, FONTS, DENSITY } from '../lib/theme.js'

const sectionStyle = { fontSize: 11, fontWeight: 600, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--muted)' }

export default function SettingsModal({ t, setTweak, onReset, onLogout, onClose }) {
  const [state, update] = usePD()
  const [name, setName] = useState(state.profile?.name || '')

  const saveName = () => {
    const v = name.trim()
    if (!v) return
    update((d) => { d.profile.name = v })
  }
  const nameDirty = name.trim() !== (state.profile?.name || '')

  const loadDemo = () => {
    if (confirm('¿Cargar datos de demostración? Reemplazará los datos actuales.')) {
      store.setState(demoState())
      onClose()
    }
  }

  return (
    <Modal title="Ajustes" onClose={onClose} footer={<Button variant="primary" onClick={onClose}>Cerrar</Button>}>
      <div style={sectionStyle}>Perfil</div>
      <Field label="Nombre" hint="Aparece en el saludo del inicio. Se sincroniza en todos tus dispositivos.">
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            value={name}
            placeholder="Tu nombre"
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && saveName()}
            onBlur={saveName}
          />
          <Button variant="primary" onClick={saveName} disabled={!nameDirty || !name.trim()}>Guardar</Button>
        </div>
      </Field>

      <div className="hr" style={{ margin: '6px 0' }} />
      <div style={sectionStyle}>Apariencia</div>

      <Field label="Acentos">
        <select value={t.accent} onChange={(e) => setTweak('accent', e.target.value)}>
          {Object.keys(ACCENTS).map((k) => <option key={k} value={k}>{k}</option>)}
        </select>
      </Field>

      <label className="reimb-toggle">
        <input type="checkbox" checked={t.dark} onChange={(e) => setTweak('dark', e.target.checked)} style={{ width: 'auto' }} />
        <span>Modo oscuro</span>
      </label>

      <Field label="Fuente">
        <Segmented size="sm" value={t.font} onChange={(v) => setTweak('font', v)} options={Object.keys(FONTS)} />
      </Field>

      <Field label="Densidad">
        <Segmented size="sm" value={t.density} onChange={(v) => setTweak('density', v)} options={Object.keys(DENSITY)} />
      </Field>

      <label className="reimb-toggle">
        <input type="checkbox" checked={t.rounded} onChange={(e) => setTweak('rounded', e.target.checked)} style={{ width: 'auto' }} />
        <span>Esquinas redondeadas</span>
      </label>

      <div className="hr" style={{ margin: '6px 0' }} />
      <div style={sectionStyle}>Datos</div>
      <Button variant="soft" icon="plus" onClick={loadDemo}>Cargar datos de demo</Button>
      <Button variant="danger" icon="trash" onClick={onReset}>Vaciar todos los datos</Button>

      <div className="hr" style={{ margin: '6px 0' }} />
      <div style={sectionStyle}>Cuenta</div>
      <Button variant="ghost" onClick={onLogout}>Cerrar sesión</Button>
    </Modal>
  )
}
