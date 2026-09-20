import { useCallback, useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import getStroke from 'perfect-freehand'
import { sendMedia } from '../lib/db'
import { useSession } from '../lib/session'
import { play, buzz } from '../lib/sound'
import { useShake } from '../lib/eggs'
import { Icon, Sheet } from '../components/ui'

type Tool = 'pen' | 'neon' | 'chalk' | 'marker' | 'eraser' | 'stamp'

type Stroke = {
  kind: 'stroke'; tool: Tool; color: string; size: number
  points: [number, number, number][]
}
type Stamp = { kind: 'stamp'; glyph: string; x: number; y: number; rot: number; size: number; color: string }
type Mark = Stroke | Stamp

const SURFACES = {
  newsprint: { label: 'Newsprint', fill: '#f2ebdc', ink: '#241f1a' },
  blackboard: { label: 'Blackboard', fill: '#20302b', ink: '#f0ede3' },
  graph: { label: 'Graph', fill: '#fbfaf6', ink: '#262319' },
  blank: { label: 'Blank', fill: '#ffffff', ink: '#1a1a1a' },
} as const
type SurfaceId = keyof typeof SURFACES

const INKS = ['#241f1a', '#8e2f42', '#2f3a45', '#1d6b5f', '#b5651d', '#f6f2e8']
const NEONS = ['#ff2d78', '#14f1d9', '#ffe600', '#8b5cff', '#39ff6a']
const GLYPHS = ['❤', '✶', '❦', '⁂', '❖', '☞', '✻', '★', '✿', '✧']

const BRUSH_OPTS: Record<Tool, Parameters<typeof getStroke>[1]> = {
  pen: { size: 1, thinning: 0.62, smoothing: 0.52, streamline: 0.48, simulatePressure: true },
  neon: { size: 1, thinning: 0.18, smoothing: 0.6, streamline: 0.55, simulatePressure: false },
  chalk: { size: 1, thinning: 0.4, smoothing: 0.35, streamline: 0.32, simulatePressure: true },
  marker: { size: 1, thinning: 0.02, smoothing: 0.6, streamline: 0.5, simulatePressure: false },
  eraser: { size: 1, thinning: 0, smoothing: 0.5, streamline: 0.4, simulatePressure: false },
  stamp: { size: 1 },
}

function pathFrom(points: [number, number, number][], tool: Tool, size: number) {
  const outline = getStroke(points, { ...BRUSH_OPTS[tool], size })
  const p = new Path2D()
  if (!outline.length) return p
  p.moveTo(outline[0][0], outline[0][1])
  for (let i = 1; i < outline.length; i++) p.lineTo(outline[i][0], outline[i][1])
  p.closePath()
  return p
}

function drawMark(ctx: CanvasRenderingContext2D, m: Mark) {
  ctx.save()
  if (m.kind === 'stamp') {
    ctx.translate(m.x, m.y)
    ctx.rotate(m.rot)
    ctx.globalAlpha = 0.82
    ctx.fillStyle = m.color
    ctx.font = `${m.size}px "Instrument Serif", Georgia, serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(m.glyph, 0, 0)
    ctx.restore()
    return
  }

  const path = pathFrom(m.points, m.tool, m.size)
  switch (m.tool) {
    case 'eraser':
      ctx.globalCompositeOperation = 'destination-out'
      ctx.fillStyle = '#000'
      ctx.fill(path)
      break
    case 'neon':
      ctx.globalCompositeOperation = 'lighter'
      ctx.shadowBlur = m.size * 2.2
      ctx.shadowColor = m.color
      ctx.fillStyle = m.color
      ctx.fill(path); ctx.fill(path)       // twice: bloom
      ctx.shadowBlur = 0
      ctx.globalAlpha = 0.95
      ctx.fillStyle = '#fff'
      ctx.fill(pathFrom(m.points, m.tool, m.size * 0.4))  // hot core
      break
    case 'marker':
      ctx.globalCompositeOperation = 'multiply'
      ctx.globalAlpha = 0.34
      ctx.fillStyle = m.color
      ctx.fill(path)
      break
    case 'chalk': {
      ctx.globalAlpha = 0.9
      ctx.fillStyle = m.color
      ctx.fill(path)
      // dusting: the thing that makes chalk read as chalk
      ctx.globalAlpha = 0.28
      for (const [x, y] of m.points) {
        const n = Math.round(m.size / 3)
        for (let i = 0; i < n; i++) {
          const a = Math.random() * Math.PI * 2
          const r = Math.random() * m.size * 0.85
          ctx.fillRect(x + Math.cos(a) * r, y + Math.sin(a) * r, 1.1, 1.1)
        }
      }
      break
    }
    default:
      ctx.fillStyle = m.color
      ctx.fill(path)
  }
  ctx.restore()
}

export default function DoodleStudio({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user, pairing } = useSession()
  const baseRef = useRef<HTMLCanvasElement>(null)
  const liveRef = useRef<HTMLCanvasElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)

  const [tool, setTool] = useState<Tool>('pen')
  const [color, setColor] = useState(INKS[0])
  const [size, setSize] = useState(9)
  const [glyph, setGlyph] = useState(GLYPHS[0])
  const [surface, setSurface] = useState<SurfaceId>('newsprint')
  const [marks, setMarks] = useState<Mark[]>([])
  const [redoStack, setRedo] = useState<Mark[]>([])
  const [photo, setPhoto] = useState<HTMLImageElement | null>(null)
  const [caption, setCaption] = useState('')
  const [sending, setSending] = useState(false)
  const [crumpling, setCrumpling] = useState(false)

  const drawing = useRef<[number, number, number][] | null>(null)

  /* ----- sizing: back the canvas at device resolution ----- */
  const fit = useCallback(() => {
    const wrap = wrapRef.current, base = baseRef.current, live = liveRef.current
    if (!wrap || !base || !live) return
    const dpr = Math.min(window.devicePixelRatio || 1, 2.5)
    const { width, height } = wrap.getBoundingClientRect()
    for (const c of [base, live]) {
      c.width = Math.round(width * dpr)
      c.height = Math.round(height * dpr)
      c.style.width = `${width}px`
      c.style.height = `${height}px`
      c.getContext('2d')!.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    repaint()
  }, [])

  const repaint = useCallback(() => {
    const base = baseRef.current
    if (!base) return
    const ctx = base.getContext('2d')!
    const dpr = Math.min(window.devicePixelRatio || 1, 2.5)
    const w = base.width / dpr, h = base.height / dpr
    ctx.clearRect(0, 0, w, h)

    ctx.fillStyle = SURFACES[surface].fill
    ctx.fillRect(0, 0, w, h)

    if (photo) {
      const scale = Math.max(w / photo.width, h / photo.height)
      const pw = photo.width * scale, ph = photo.height * scale
      ctx.drawImage(photo, (w - pw) / 2, (h - ph) / 2, pw, ph)
    } else if (surface === 'graph') {
      ctx.strokeStyle = 'rgba(80,90,110,.16)'
      ctx.lineWidth = 1
      for (let x = 0; x < w; x += 22) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke() }
      for (let y = 0; y < h; y += 22) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke() }
    } else if (surface === 'blackboard') {
      ctx.fillStyle = 'rgba(255,255,255,.028)'
      for (let i = 0; i < 700; i++) ctx.fillRect(Math.random() * w, Math.random() * h, 1, 1)
    }

    for (const m of marks) drawMark(ctx, m)
  }, [marks, surface, photo])

  useEffect(() => { if (open) requestAnimationFrame(fit) }, [open, fit])
  useEffect(() => { repaint() }, [repaint])
  useEffect(() => {
    if (!open) return
    window.addEventListener('resize', fit)
    return () => window.removeEventListener('resize', fit)
  }, [open, fit])

  useEffect(() => {
    if (!open) { setMarks([]); setRedo([]); setPhoto(null); setCaption(''); setCrumpling(false) }
  }, [open])

  /* ----- shake to crumple ----- */
  const crumple = useCallback(() => {
    if (!marks.length) return
    setCrumpling(true); play('crumple'); buzz([14, 30, 14, 30, 22])
    setTimeout(() => { setMarks([]); setRedo([]); setCrumpling(false) }, 620)
  }, [marks.length])
  useShake(open, crumple)

  /* ----- pointer ----- */
  function localPoint(e: React.PointerEvent): [number, number, number] {
    const r = liveRef.current!.getBoundingClientRect()
    const pressure = e.pressure > 0 && e.pressure !== 0.5 ? e.pressure : 0.5
    return [e.clientX - r.left, e.clientY - r.top, pressure]
  }

  function onDown(e: React.PointerEvent) {
    if (crumpling) return
    e.currentTarget.setPointerCapture(e.pointerId)
    const p = localPoint(e)
    if (tool === 'stamp') {
      const stamp: Stamp = {
        kind: 'stamp', glyph, x: p[0], y: p[1],
        rot: (Math.random() - 0.5) * 0.5, size: size * 4.5, color,
      }
      setMarks((m) => [...m, stamp]); setRedo([])
      play('stamp'); buzz(9)
      return
    }
    drawing.current = [p]
  }

  function onMove(e: React.PointerEvent) {
    if (!drawing.current) return
    // coalesced events keep fast strokes smooth on 120Hz displays
    const events = (e.nativeEvent as PointerEvent).getCoalescedEvents?.() ?? [e.nativeEvent as PointerEvent]
    const r = liveRef.current!.getBoundingClientRect()
    for (const ev of events) {
      const pressure = ev.pressure > 0 && ev.pressure !== 0.5 ? ev.pressure : 0.5
      drawing.current.push([ev.clientX - r.left, ev.clientY - r.top, pressure])
    }
    const live = liveRef.current!
    const ctx = live.getContext('2d')!
    const dpr = Math.min(window.devicePixelRatio || 1, 2.5)
    ctx.clearRect(0, 0, live.width / dpr, live.height / dpr)
    if (tool !== 'eraser') {
      drawMark(ctx, { kind: 'stroke', tool, color, size, points: drawing.current })
    }
  }

  function onUp() {
    const pts = drawing.current
    drawing.current = null
    const live = liveRef.current
    if (live) {
      const dpr = Math.min(window.devicePixelRatio || 1, 2.5)
      live.getContext('2d')!.clearRect(0, 0, live.width / dpr, live.height / dpr)
    }
    if (!pts || pts.length < 2) return
    setMarks((m) => [...m, { kind: 'stroke', tool, color, size, points: pts }])
    setRedo([])
    play('pen')
  }

  /* ----- actions ----- */
  function undo() {
    setMarks((m) => { if (!m.length) return m; setRedo((r) => [m[m.length - 1], ...r]); return m.slice(0, -1) })
    play('key')
  }
  function redo() {
    setRedo((r) => { if (!r.length) return r; setMarks((m) => [...m, r[0]]); return r.slice(1) })
    play('key')
  }

  function loadPhoto(file: File) {
    const img = new Image()
    img.onload = () => { setPhoto(img); play('shutter') }
    img.src = URL.createObjectURL(file)
  }

  async function send() {
    if (!user || !pairing || !baseRef.current) return
    setSending(true)
    try {
      const blob = await new Promise<Blob | null>((res) =>
        baseRef.current!.toBlob((b) => res(b), 'image/webp', 0.92))
      if (!blob) return
      await sendMedia({ senderId: user.uid, type: 'doodle', blob, caption, ext: 'webp' })
      play('stamp'); buzz([10, 50, 18])
      onClose()
    } finally { setSending(false) }
  }

  const palette = tool === 'neon' ? NEONS : INKS

  return (
    <Sheet open={open} onClose={onClose} title="Doodle studio"
      actions={
        <button className="btn-ghost kicker" style={{ padding: '0.4rem 0.2rem' }}
          disabled={sending || !marks.length} onClick={send}>
          {sending ? 'Printing…' : 'Send'}
        </button>
      }>
      <div className="col grow" style={{ minHeight: 0 }}>
        {/* toolbar */}
        <div className="row between" style={{ padding: '0.55rem 1rem', borderBottom: '1px solid var(--rule-hair)' }}>
          <div className="row gap-sm">
            <button className="btn-ghost" onClick={undo} disabled={!marks.length} style={{ padding: '0.35rem' }} aria-label="Undo"><Icon.Undo /></button>
            <button className="btn-ghost" onClick={redo} disabled={!redoStack.length} style={{ padding: '0.35rem' }} aria-label="Redo"><Icon.Redo /></button>
            <button className="btn-ghost" onClick={crumple} disabled={!marks.length} style={{ padding: '0.35rem' }} aria-label="Clear"><Icon.Trash /></button>
          </div>
          <div className="row gap-sm">
            <label className="btn-ghost row" style={{ padding: '0.35rem', cursor: 'pointer' }} aria-label="Add photo">
              <Icon.Camera />
              <input type="file" accept="image/*" hidden
                onChange={(e) => e.target.files?.[0] && loadPhoto(e.target.files[0])} />
            </label>
            {!photo && (
              <select value={surface} onChange={(e) => { setSurface(e.target.value as SurfaceId); play('rustle') }}
                className="byline" style={{ border: '1px solid var(--rule)', padding: '0.3rem 0.4rem', fontSize: '0.62rem' }}>
                {Object.entries(SURFACES).map(([id, s]) => <option key={id} value={id}>{s.label}</option>)}
              </select>
            )}
          </div>
        </div>

        {/* canvas */}
        <div className="grow" style={{ padding: '0.9rem 1rem', minHeight: 0, display: 'flex' }}>
          <motion.div ref={wrapRef}
            animate={crumpling ? { scale: 0, rotate: -40, opacity: 0 } : { scale: 1, rotate: 0, opacity: 1 }}
            transition={{ duration: 0.6, ease: [0.5, 0, 0.75, 0] }}
            style={{
              position: 'relative', flex: 1, minHeight: 0,
              boxShadow: 'var(--shadow-deep)', overflow: 'hidden', touchAction: 'none',
            }}>
            <canvas ref={baseRef} style={{ position: 'absolute', inset: 0 }} />
            <canvas ref={liveRef} style={{ position: 'absolute', inset: 0, touchAction: 'none' }}
              onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} />
            {!marks.length && !photo && (
              <div className="hand" style={{
                position: 'absolute', inset: 0, display: 'grid', placeItems: 'center',
                color: SURFACES[surface].ink, opacity: 0.22, pointerEvents: 'none', fontSize: '1.8rem',
              }}>
                draw something silly
              </div>
            )}
          </motion.div>
        </div>

        {/* controls */}
        <div className="col gap-sm" style={{ padding: '0.7rem 1rem calc(1rem + var(--safe-bottom))', borderTop: '1px solid var(--rule-hair)' }}>
          <div className="row gap-xs" style={{ overflowX: 'auto' }}>
            {(['pen', 'neon', 'chalk', 'marker', 'eraser', 'stamp'] as Tool[]).map((t) => (
              <button key={t} onClick={() => { setTool(t); play('key') }}
                className="byline"
                style={{
                  flex: 'none', padding: '0.42rem 0.72rem', textTransform: 'uppercase',
                  fontSize: '0.6rem', letterSpacing: '0.12em',
                  border: `1px solid ${tool === t ? 'var(--accent)' : 'var(--rule)'}`,
                  color: tool === t ? 'var(--accent)' : 'var(--ink-soft)',
                  background: tool === t ? 'var(--accent-wash)' : 'transparent',
                }}>{t}</button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            {tool === 'stamp' ? (
              <motion.div key="glyphs" className="row gap-xs" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                style={{ overflowX: 'auto' }}>
                {GLYPHS.map((g) => (
                  <button key={g} onClick={() => { setGlyph(g); play('key') }}
                    style={{
                      flex: 'none', width: 38, height: 38, fontSize: '1.2rem', fontFamily: 'var(--display)',
                      border: `1px solid ${glyph === g ? 'var(--accent)' : 'var(--rule)'}`,
                      color: glyph === g ? 'var(--accent)' : 'var(--ink-soft)',
                    }}>{g}</button>
                ))}
              </motion.div>
            ) : (
              <motion.div key="colors" className="row gap-xs" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                {palette.map((c) => (
                  <button key={c} onClick={() => { setColor(c); play('key') }}
                    aria-label={`Ink ${c}`}
                    style={{
                      flex: 'none', width: 30, height: 30, borderRadius: '50%', background: c,
                      boxShadow: color === c ? '0 0 0 2px var(--paper), 0 0 0 3.5px var(--accent)' : 'inset 0 0 0 1px rgba(0,0,0,.18)',
                      transition: 'box-shadow 200ms var(--ease-out)',
                    }} />
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="row gap-sm" style={{ alignItems: 'center' }}>
            <span className="folio" style={{ minWidth: 22 }}>{size}</span>
            <input type="range" min={2} max={46} value={size} aria-label="Brush size"
              onChange={(e) => setSize(Number(e.target.value))}
              style={{ flex: 1, accentColor: 'var(--accent)' }} />
          </div>

          <input className="field" value={caption} maxLength={90}
            onChange={(e) => setCaption(e.target.value)} placeholder="caption, optional" />
        </div>
      </div>
    </Sheet>
  )
}
