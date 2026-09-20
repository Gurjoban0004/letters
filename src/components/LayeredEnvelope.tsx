import { useRef, useState, type ReactNode } from 'react'
import { motion } from 'motion/react'
import { getEnvelope, getStationery } from '../lib/letters'
import { StationeryPaper } from './StationeryPaper'

function ratio(value: string) {
  const [width, height] = value.split('/').map(Number)
  return width / height
}

export function LayeredEnvelope({
  envelopeId = 'env_1',
  paperId = 'paper_1',
  initialUnfolded = false,
  fontFamily,
  children,
}: {
  envelopeId?: string
  paperId?: string
  initialUnfolded?: boolean
  fontFamily?: string
  children?: ReactNode
}) {
  const [unfolded, setUnfolded] = useState(initialUnfolded)
  const assembly = useRef<HTMLDivElement>(null)
  const envelope = getEnvelope(envelopeId)
  const paper = getStationery(paperId)
  const envelopeHeight = 1 / ratio(envelope.openAspect)
  const paperHeight = envelope.defaultScale / ratio(paper.aspect)
  const tuckedOverflow = Math.max(0, 48 / 100 * envelopeHeight + paperHeight - envelopeHeight)
  const tuckedClip = `${Math.ceil(tuckedOverflow / paperHeight * 100)}%`

  function unfold() {
    setUnfolded(true)
    requestAnimationFrame(() => assembly.current?.parentElement?.scrollIntoView({
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
      block: 'start',
    }))
  }

  return <div ref={assembly} className={`layered-envelope${unfolded ? ' unfolded' : ''}`} style={{ aspectRatio: envelope.openAspect }}>
    <img className="layer-back" src={envelope.openBackUrl} alt="" aria-hidden />
    <motion.div
      className="layer-paper"
      data-unfolded={unfolded || undefined}
      initial={false}
      animate={{ top: unfolded ? '-22%' : '48%', scale: unfolded ? 1.05 : 1, clipPath: unfolded ? 'inset(-100vh -100vw 0% -100vw)' : `inset(-100vh -100vw ${tuckedClip} -100vw)` }}
      transition={{ duration: 0.68, ease: [0.16, 1, 0.3, 1] }}
      style={{ left: '50%', width: `${envelope.defaultScale * 100}%`, aspectRatio: paper.aspect, x: '-50%' }}
    >
      <StationeryPaper paperId={paper.id} fontFamily={fontFamily} className="layer-paper-surface">
        {children}
      </StationeryPaper>
    </motion.div>
    <img className="layer-front" src={envelope.openFrontUrl} alt="" aria-hidden />
    {!unfolded && <button className="layered-envelope-trigger" type="button" onClick={unfold} aria-label="Pull the letter out of the envelope">
      <span>Pull out the letter</span>
    </button>}
  </div>
}
