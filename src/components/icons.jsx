/* Iconos — SVG geométricos simples, stroke currentColor.
   Uso: <Icon name="calendar" size={18} /> */

const PATHS = {
  home: "M3 11.5 12 4l9 7.5M5 10v10h5v-6h4v6h5V10",
  calendar: "M4 6h16v15H4zM4 10h16M8 3v4M16 3v4",
  dumbbell: "M3 9v6M6 7v10M18 7v10M21 9v6M6 12h12",
  wallet: "M3 7h15a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM3 7l1.5-3 12 3M16 13h2",
  target: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18ZM12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8ZM12 11.5a.5.5 0 1 0 0 1 .5.5 0 0 0 0-1Z",
  plus: "M12 5v14M5 12h14",
  check: "M5 12.5 10 17.5 19 7",
  play: "M7 4.5 19 12 7 19.5z",
  pause: "M8 5v14M16 5v14",
  skip: "M6 5v14M18 5v14M6 12h12",
  flame: "M12 3c1 3-2 4-2 7a4 4 0 0 0 8 0c0-2-1-3-1-3 .5 4-3 4-3 1 0-3 1-4-2-5Z",
  clock: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18ZM12 7v5l3 2",
  chevL: "M15 5 8 12l7 7",
  chevR: "M9 5l7 7-7 7",
  chevD: "M5 9l7 7 7-7",
  trophy: "M7 4h10v4a5 5 0 0 1-10 0zM7 6H4v1a3 3 0 0 0 3 3M17 6h3v1a3 3 0 0 1-3 3M9 13h6l-1 4h-4zM8 21h8M12 17v4",
  drop: "M12 3c3 5 5 7 5 10a5 5 0 0 1-10 0c0-3 2-5 5-10Z",
  book: "M4 5a2 2 0 0 1 2-2h6v16H6a2 2 0 0 0-2 2zM20 5a2 2 0 0 0-2-2h-6v16h6a2 2 0 0 1 2 2z",
  leaf: "M5 19c0-8 6-13 14-14 1 9-4 15-14 14ZM5 19c3-4 6-6 9-7",
  moon: "M20 14a8 8 0 0 1-10-10 8 8 0 1 0 10 10Z",
  stretch: "M12 4a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3ZM12 8v6M12 14l-4 6M12 14l4 6M8 11h8",
  edit: "M4 20h4L18 10l-4-4L4 16zM14 6l4 4",
  trash: "M5 7h14M9 7V5h6v2M6 7l1 13h10l1-13",
  x: "M6 6l12 12M18 6 6 18",
  run: "M13 4a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3ZM12 8l-3 4 3 2 1 6M9 12 5 11M13 14l4 1 2 4",
  swim: "M3 17c1.5-1.2 3-1.2 4.5 0s3 1.2 4.5 0 3-1.2 4.5 0 3 1.2 4.5 0M8 9a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3ZM8 7l5 1 3 3M13 8l-4 4",
  bike: "M6 18a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM18 18a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM6 15l4-6h5M14 6h3l1 9M9 9h6",
  box: "M7 4h7l1 4-2 2v3l2 2v3H7M14 8H9",
  camera: "M4 8h3l1.5-2h7L17 8h3v11H4zM12 16a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z",
  bell: "M6 16V10a6 6 0 0 1 12 0v6l2 2H4zM10 20a2 2 0 0 0 4 0",
  arrowUp: "M12 19V6M6 12l6-6 6 6",
  arrowDown: "M12 5v13M6 12l6 6 6-6",
  list: "M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01",
  settings: "M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6ZM4 12c0-.7.1-1.3.3-2l-1.6-1.3 1.7-3 2 .8c.9-.7 2-1.2 3.1-1.4L12 2l1.5 1.8c1.1.2 2.2.7 3.1 1.4l2-.8 1.7 3L18.7 10c.4 1.3.4 2.7 0 4l1.6 1.3-1.7 3-2-.8c-.9.7-2 1.2-3.1 1.4L12 22l-1.5-1.8c-1.1-.2-2.2-.7-3.1-1.4l-2 .8-1.7-3L5.3 14c-.2-.7-.3-1.3-.3-2Z",
  sun: "M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10ZM12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5 19 19M19 5l-1.5 1.5M6.5 17.5 5 19",
}

export function Icon({ name, size = 18, stroke = 2, style, className }) {
  const filled = name === 'play'
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke={filled ? 'none' : 'currentColor'}
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={style}
      className={className}
      aria-hidden="true"
    >
      <path d={PATHS[name] || ''} />
    </svg>
  )
}

export const SPORT_ICON = {
  gym: 'dumbbell',
  calistenia: 'dumbbell',
  running: 'run',
  natacion: 'swim',
  bici: 'bike',
  boxeo: 'box',
}