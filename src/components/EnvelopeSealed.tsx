import type { ReactNode } from 'react'
import { motion } from 'motion/react'
import { getEnvelope } from '../lib/letters'

export function EnvelopeSealed({
  envelopeId = 'env_1',
  onClick,
  disabled = false,
  className = '',
  label = 'Open sealed envelope',
  children,
  state = 'sealed',
}: {
  envelopeId?: string
  onClick?: () => void
  disabled?: boolean
  className?: string
  label?: string
  children?: ReactNode
  state?: 'sealed' | 'open'
}) {
  const envelope = getEnvelope(envelopeId)
  const content = <><img src={state === 'open' ? envelope.openFullUrl : envelope.closedUrl} alt="" aria-hidden />{children}</>
  const motionProps = {
    className: `envelope-sealed envelope-${state} ${className}`,
    style: { aspectRatio: state === 'open' ? envelope.openAspect : envelope.closedAspect },
    whileHover: disabled ? undefined : { y: -6, rotate: -1 },
    transition: { duration: 0.25, ease: [0.16, 1, 0.3, 1] as const },
  }

  if (onClick) return <motion.button {...motionProps} type="button" onClick={onClick} disabled={disabled} aria-label={label}>{content}</motion.button>
  return <motion.div {...motionProps}>{content}</motion.div>
}
