import { useRef, useState, type ReactNode } from 'react'
import { motion } from 'motion/react'
import { getEnvelope, getStationery } from '../lib/letters'
import { StationeryPaper } from './StationeryPaper'

function ratio(value: string) {
  const [w, h] = value.split('/').map(Number)
  return w / h
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

  // Swipe-to-pull state
  const dragStart = useRef<number | null>(null)
  const dragDistance = useRef(0)
  const suppressClick = useRef(false)
  const [dragDelta, setDragDelta] = useState(0)
  const [envelopeGone, setEnvelopeGone] = useState(false)

  function unfold() {
    setUnfolded(true)
    setDragDelta(0)
    requestAnimationFrame(() =>
      assembly.current?.parentElement?.scrollIntoView({
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
        block: 'start',
      })
    )
  }

  // Pull gesture on the paper while still tucked
  function onPaperPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (unfolded) return
    dragStart.current = e.clientY
    dragDistance.current = 0
    suppressClick.current = false
    ;(e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId)
  }

  function onPaperPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!dragStart.current || unfolded) return
    const delta = Math.max(0, dragStart.current - e.clientY)
    dragDistance.current = delta
    setDragDelta(delta)
  }

  function onPaperPointerUp() {
    if (!dragStart.current) return
    dragStart.current = null
    suppressClick.current = dragDistance.current > 5
    if (dragDistance.current > 80) {
      // Threshold met — pull the letter out
      unfold()
      // After the paper unfolds, slide the envelope off screen
      setTimeout(() => setEnvelopeGone(true), 620)
    } else {
      // Spring back
      setDragDelta(0)
    }
    dragDistance.current = 0
  }

  // Convert dragDelta pixels → approximate % of paper height for animation
  const assemblyHeight = assembly.current?.getBoundingClientRect().height ?? 400
  const pullPct = dragDelta / assemblyHeight * 100

  // Tucked top position shifts upward as user drags
  const currentTop = unfolded ? '-22%' : `${Math.max(10, 48 - pullPct)}%`

  return (
    <div className={`layered-envelope-wrapper${envelopeGone ? ' envelope-gone' : ''}`}>
      <div ref={assembly} className={`layered-envelope${unfolded ? ' unfolded' : ''}`} style={{ aspectRatio: envelope.openAspect }}>
        {/* Envelope back */}
        <motion.img
          className="layer-back"
          src={envelope.openBackUrl}
          alt=""
          aria-hidden
          animate={envelopeGone ? { y: '120%', opacity: 0 } : { y: 0, opacity: 1 }}
          transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
        />

        {/* Paper sliding out */}
        <motion.div
          className="layer-paper"
          data-unfolded={unfolded || undefined}
          initial={false}
          animate={{
            top: currentTop,
            scale: unfolded ? 1.05 : dragDelta > 0 ? 1 + dragDelta / 2000 : 1,
            clipPath: unfolded
              ? 'inset(-10000px -10000px 0% -10000px)'
              : `inset(-10000px -10000px ${tuckedClip} -10000px)`,
          }}
          transition={dragDelta > 0 ? { duration: 0 } : { duration: 0.68, ease: [0.16, 1, 0.3, 1] }}
          style={{ left: '50%', width: `${envelope.defaultScale * 100}%`, aspectRatio: paper.aspect, x: '-50%', touchAction: 'none' }}
          onPointerDown={onPaperPointerDown}
          onPointerMove={onPaperPointerMove}
          onPointerUp={onPaperPointerUp}
          onPointerCancel={onPaperPointerUp}
          onClick={() => { if (suppressClick.current) { suppressClick.current = false; return } if (!unfolded) unfold() }}
          onKeyDown={e => { if (!unfolded && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); unfold() } }}
          role="button"
          tabIndex={unfolded ? -1 : 0}
          aria-label="Slide up or press Enter to open the letter"
        >
          <StationeryPaper paperId={paper.id} fontFamily={fontFamily} className="layer-paper-surface">
            {children}
          </StationeryPaper>

          {/* Drag handle — visible only when tucked */}
          {!unfolded && (
            <div className="pull-handle" aria-hidden>
              <span />
            </div>
          )}
        </motion.div>

        {/* Envelope front */}
        <motion.img
          className="layer-front"
          src={envelope.openFrontUrl}
          alt=""
          aria-hidden
          animate={envelopeGone ? { y: '120%', opacity: 0 } : { y: 0, opacity: 1 }}
          transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
        />
      </div>

      {/* Subtle hint text — only while tucked and not actively dragging */}
      {!unfolded && dragDelta === 0 && (
        <motion.p
          className="pull-hint handwritten"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ delay: 0.6 }}
        >
          slide up to open ♡
        </motion.p>
      )}
    </div>
  )
}
