import type { CSSProperties } from 'react'
import { formatDuration } from '../../utils/format'

interface Props {
  time: number
  duration: number
  onSeek: (seconds: number) => void
  showTimes?: boolean
  disabled?: boolean
}

/** Barra de progresso acessível (input range) com preenchimento via variável CSS. */
export function ProgressBar({ time, duration, onSeek, showTimes = true, disabled }: Props) {
  const max = duration > 0 ? duration : 1
  const pct = Math.min(100, (time / max) * 100)
  return (
    <div className="progress">
      {showTimes && <span className="progress__time">{formatDuration(time)}</span>}
      <input
        type="range"
        className="range"
        min={0}
        max={max}
        step={0.1}
        value={Math.min(time, max)}
        disabled={disabled || duration <= 0}
        aria-label="Posição da música"
        aria-valuetext={`${formatDuration(time)} de ${formatDuration(duration)}`}
        style={{ '--fill': `${pct}%` } as CSSProperties}
        onChange={(e) => onSeek(Number(e.target.value))}
      />
      {showTimes && <span className="progress__time">{formatDuration(duration)}</span>}
    </div>
  )
}
