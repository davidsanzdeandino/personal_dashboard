/* Sección Entrenamiento — armazón de pestañas. Cada pestaña vive en ./training/. */

import { useState } from 'react'
import { Segmented } from '../components/common.jsx'
import Session from './training/Session.jsx'
import Routines from './training/Routines.jsx'
import Metrics from './training/Metrics.jsx'
import History from './training/History.jsx'
import Body from './training/Body.jsx'

const TABS = [
  { value: 'today', label: 'Sesión' },
  { value: 'routines', label: 'Rutinas' },
  { value: 'metrics', label: 'Métricas' },
  { value: 'body', label: 'Cuerpo' },
  { value: 'history', label: 'Historial' },
]

export default function TrainingView() {
  const [tab, setTab] = useState('today')
  return (
    <div className="grid" style={{ gap: 18 }}>
      <Segmented value={tab} onChange={setTab} options={TABS} />
      {tab === 'today' && <Session />}
      {tab === 'routines' && <Routines />}
      {tab === 'metrics' && <Metrics />}
      {tab === 'body' && <Body />}
      {tab === 'history' && <History />}
    </div>
  )
}