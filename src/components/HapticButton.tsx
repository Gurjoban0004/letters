import type { ReactNode } from 'react'
import { buzz } from '../lib/sound'

export function HapticButton({ children, className = '', disabled = false, label, onPress }: {
  children: ReactNode
  className?: string
  disabled?: boolean
  label: string
  onPress: () => void
}) {
  function press() { if (!disabled) { buzz(10); onPress() } }
  return <button type="button" className={`haptic-tap ${className}`} disabled={disabled} aria-label={label} onClick={press}>{children}</button>
}
