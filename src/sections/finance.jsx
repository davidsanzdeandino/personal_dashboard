/* Sección Finanzas — armazón de pestañas.
   Cada pestaña se construye en su propio archivo dentro de ./finance/. */

import { useState } from 'react'
import { Segmented } from '../components/common.jsx'
import Patrimonio from './finance/Patrimonio.jsx'
import Resumen from './finance/Resumen.jsx'
import Movimientos from './finance/Movimientos.jsx'
import Negocios from './finance/Negocios.jsx'
import Inversiones from './finance/Inversiones.jsx'

const TABS = [
  { value: 'wealth', label: 'Patrimonio' },
  { value: 'summary', label: 'Resumen' },
  { value: 'movements', label: 'Movimientos' },
  { value: 'business', label: 'Negocios' },
  { value: 'investments', label: 'Inversiones' },
]

function Soon({ name }) {
  return (
    <div className="empty">
      <div className="empty-title">«{name}» en construcción</div>
      <div className="empty-sub">La montamos en el siguiente paso.</div>
    </div>
  )
}

export default function FinanceView() {
  const [tab, setTab] = useState('wealth')
  return (
    <div className="grid" style={{ gap: 18 }}>
      <Segmented value={tab} onChange={setTab} options={TABS} />
      {tab === 'wealth' && <Patrimonio />}
      {tab === 'summary' && <Resumen />}
      {tab === 'movements' && <Movimientos />}
      {tab === 'business' && <Negocios />}
      {tab === 'investments' && <Inversiones />}
    </div>
  )
}