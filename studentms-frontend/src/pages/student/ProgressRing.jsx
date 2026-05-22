import { useTheme } from '../../context/ThemeContext'

export default function ProgressRing({ value, color }) {
  const { theme } = useTheme()
  const r = 18
  const c = 2 * Math.PI * r
  const p = Math.max(0, Math.min(100, value)) / 100

  // Light mode: darker background ring, dark text
  // Dark mode: lighter background ring, white text
  const bgRingColor = theme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.12)'
  const textColor = theme === 'dark' ? '#ffffff' : '#1e293b'

  return (
    <svg width="44" height="44" viewBox="0 0 44 44" className="shrink-0">
      <circle
        cx="22"
        cy="22"
        r={r}
        stroke={bgRingColor}
        strokeWidth="5"
        fill="none"
      />
      <circle
        cx="22"
        cy="22"
        r={r}
        stroke={color}
        strokeWidth="5"
        fill="none"
        strokeDasharray={`${c * p} ${c}`}
        strokeLinecap="round"
        transform="rotate(-90 22 22)"
      />
      <text
        x="22"
        y="24"
        textAnchor="middle"
        fill={textColor}
        style={{ fontSize: '9px', fontWeight: 700 }}
      >
        {Math.round(value)}%
      </text>
    </svg>
  )
}