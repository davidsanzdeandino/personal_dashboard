/* UI compartida: Card, SectionTitle, Pill, Button, IconButton, ProgressBar,
   Ring, Sparkline, Bars, Stat, Modal, Field, Segmented, EmptyState.
   Nota: usePD vive en lib/store.js; las secciones lo importan de allí. */

import { useEffect } from 'react'
import { Icon } from './icons.jsx'

export function cls(...a) {
  return a.filter(Boolean).join(' ')
}

export function Card({ children, className, style, pad = true, onClick }) {
  return (
    <div
      className={cls('card', className)}
      onClick={onClick}
      style={{ padding: pad ? 'var(--pad-card)' : 0, cursor: onClick ? 'pointer' : undefined, ...style }}
    >
      {children}
    </div>
  )
}

export function SectionTitle({ icon, children, right, sub }) {
  return (
    <div className="sec-title">
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, minWidth: 0 }}>
        {icon && <Icon name={icon} size={17} style={{ color: 'var(--muted)', flexShrink: 0 }} />}
        <div style={{ minWidth: 0 }}>
          <h3>{children}</h3>
          {sub && <div className="sec-sub">{sub}</div>}
        </div>
      </div>
      {right}
    </div>
  )
}

export function Pill({ children, tone = 'neutral', style }) {
  return <span className={cls('pill', `pill-${tone}`)} style={style}>{children}</span>
}

export function Button({ children, onClick, variant = 'ghost', size = 'md', icon, type = 'button', disabled, style }) {
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={cls('btn', `btn-${variant}`, `btn-${size}`)} style={style}>
      {icon && <Icon name={icon} size={size === 'sm' ? 15 : 17} />}
      {children && <span>{children}</span>}
    </button>
  )
}

export function IconButton({ name, onClick, label, size = 18, active, style }) {
  return (
    <button onClick={onClick} aria-label={label} title={label} className={cls('icon-btn', active && 'icon-btn-active')} style={style}>
      <Icon name={name} size={size} />
    </button>
  )
}

export function ProgressBar({ value, max = 100, tone = 'blue', height = 8 }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100))
  return (
    <div className="prog" style={{ height }}>
      <div className={cls('prog-fill', `fill-${tone}`)} style={{ width: pct + '%' }} />
    </div>
  )
}

export function Ring({ value, max = 100, size = 64, stroke = 7, tone = 'blue', label, sublabel }) {
  const pct = Math.max(0, Math.min(1, value / max))
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  return (
    <div className="ring-wrap">
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--track)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeLinecap="round"
          stroke={`var(--${tone})`}
          strokeWidth={stroke}
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
          style={{ transition: 'stroke-dashoffset .6s cubic-bezier(.4,0,.2,1)' }}
        />
      </svg>
      {label != null && (
        <div className="ring-label">
          <strong>{label}</strong>
          {sublabel && <span>{sublabel}</span>}
        </div>
      )}
    </div>
  )
}

export function Sparkline({ data, width = 120, height = 36, tone = 'blue', fill = true }) {
  if (!data || data.length < 2) return null
  const min = Math.min(...data)
  const max = Math.max(...data)
  const span = max - min || 1
  const pts = data.map((v, i) => [
    (i / (data.length - 1)) * width,
    height - ((v - min) / span) * (height - 4) - 2,
  ])
  const d = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ')
  const area = d + ` L${width} ${height} L0 ${height} Z`
  const gid = 'sg' + tone
  return (
    <svg width={width} height={height} className="spark" preserveAspectRatio="none" viewBox={`0 0 ${width} ${height}`}>
      {fill && (
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={`var(--${tone})`} stopOpacity={0.18} />
            <stop offset="100%" stopColor={`var(--${tone})`} stopOpacity={0} />
          </linearGradient>
        </defs>
      )}
      {fill && <path d={area} fill={`url(#${gid})`} stroke="none" />}
      <path d={d} fill="none" stroke={`var(--${tone})`} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function Bars({ data, height = 120, tone = 'blue', showVals, fmt }) {
  const max = Math.max(...data.map((d) => d.value), 1)
  return (
    <div className="bars" style={{ height }}>
      {data.map((d, i) => (
        <div key={i} className="bar-col">
          <div className="bar-track">
            {showVals && d.value > 0 && <span className="bar-val">{fmt ? fmt(d.value) : d.value}</span>}
            <div
              className={cls('bar-fill', `fill-${d.tone || tone}`)}
              style={{ height: (d.value / max) * 100 + '%' }}
              title={(fmt ? fmt(d.value) : d.value) + ''}
            />
          </div>
          <span className="bar-label">{d.label}</span>
        </div>
      ))}
    </div>
  )
}

export function Stat({ label, value, delta, deltaTone, sub, tone }) {
  return (
    <div className="stat">
      <div className="stat-label">{label}</div>
      <div className="stat-value" style={tone ? { color: `var(--${tone})` } : undefined}>{value}</div>
      {(delta || sub) && (
        <div className="stat-foot">
          {delta && (
            <span className={cls('delta', `delta-${deltaTone || 'up'}`)}>
              <Icon name={deltaTone === 'down' ? 'arrowDown' : 'arrowUp'} size={12} />
              {delta}
            </span>
          )}
          {sub && <span className="stat-sub">{sub}</span>}
        </div>
      )}
    </div>
  )
}

export function Modal({ title, children, onClose, footer, wide }) {
  useEffect(() => {
    const h = (e) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', h)
    return () => document.removeEventListener('keydown', h)
  }, [onClose])
  return (
    <div className="modal-overlay" onMouseDown={onClose}>
      <div className={cls('modal', wide && 'modal-wide')} onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3>{title}</h3>
          <IconButton name="x" onClick={onClose} label="Cerrar" />
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  )
}

export function Field({ label, children, hint }) {
  return (
    <label className="field">
      {label && <span className="field-label">{label}</span>}
      {children}
      {hint && <span className="field-hint">{hint}</span>}
    </label>
  )
}

export function Segmented({ options, value, onChange, size = 'md' }) {
  return (
    <div className={cls('segmented', `seg-${size}`)}>
      {options.map((o) => {
        const v = typeof o === 'string' ? o : o.value
        const l = typeof o === 'string' ? o : o.label
        return (
          <button key={v} onClick={() => onChange(v)} className={cls('seg-btn', v === value && 'seg-active')}>
            {l}
          </button>
        )
      })}
    </div>
  )
}

export function EmptyState({ icon, title, sub, action }) {
  return (
    <div className="empty">
      {icon && <Icon name={icon} size={26} style={{ color: 'var(--faint)' }} />}
      <div className="empty-title">{title}</div>
      {sub && <div className="empty-sub">{sub}</div>}
      {action}
    </div>
  )
}