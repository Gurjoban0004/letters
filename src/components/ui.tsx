import { AnimatePresence, motion } from 'motion/react'
import type { ReactNode } from 'react'

/* ---------- SVG press defs: torn edges, used app-wide ---------- */
export function PressDefs() {
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden>
      <defs>
        <filter id="deckle-edge">
          <feTurbulence type="fractalNoise" baseFrequency="0.028" numOctaves="4" seed="7" result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale="5" xChannelSelector="R" yChannelSelector="G" />
        </filter>
        <filter id="ink-bleed">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale="1.4" />
        </filter>
      </defs>
    </svg>
  )
}

/* ---------- Icons: one quiet, rounded monoline family ---------- */
const S = {
  fill: 'none', stroke: 'currentColor', strokeWidth: 1.8,
  strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const,
}
const Svg = (p: { children: ReactNode; size?: number }) => (
  <svg className="app-icon" viewBox="0 0 24 24" width={p.size ?? 24} height={p.size ?? 24} fill="none" aria-hidden focusable="false">{p.children}</svg>
)

export const Icon = {
  Letter: () => <Svg><g {...S}><rect x="3" y="5" width="18" height="14" rx="2.5" /><path d="m4 7 8 6 8-6" /></g></Svg>,
  Nib: () => <Svg><g {...S}><path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16v4Z" /><path d="m13.5 6.5 4 4" /></g></Svg>,
  Aperture: () => <Svg><g {...S}><circle cx="12" cy="12" r="9" /><path d="m14.8 3.5-4.7 8.1M20.5 9.2l-9.4-.1M17.1 19l-4.7-8.1M6.9 19l4.7-8.1M3.5 9.2l9.4-.1" /></g></Svg>,
  Archive: () => <Svg><g {...S}><path d="M4 8h16v11H4z" /><path d="M3 5h18v3H3zM9.5 12h5" /></g></Svg>,
  Heart: () => <Svg><path {...S} d="M20.8 8.8c0 5-8.8 10.2-8.8 10.2S3.2 13.8 3.2 8.8A4.6 4.6 0 0 1 12 6.9a4.6 4.6 0 0 1 8.8 1.9Z" /></Svg>,
  Gear: () => <Svg><g {...S}><path d="M4 6h5M15 6h5M4 12h9M17 12h3M4 18h2M12 18h8" /><circle cx="12" cy="6" r="2" /><circle cx="15" cy="12" r="2" /><circle cx="9" cy="18" r="2" /></g></Svg>,
  Close: () => <Svg><path {...S} d="m6 6 12 12M18 6 6 18" /></Svg>,
  Back: () => <Svg><path {...S} d="m15 5-7 7 7 7" /></Svg>,
  Undo: () => <Svg><g {...S}><path d="M9 7 4 12l5 5" /><path d="M5 12h8.5a5.5 5.5 0 0 1 5.5 5.5" /></g></Svg>,
  Redo: () => <Svg><g {...S}><path d="m15 7 5 5-5 5" /><path d="M19 12h-8.5A5.5 5.5 0 0 0 5 17.5" /></g></Svg>,
  Trash: () => <Svg><g {...S}><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v5M14 11v5" /></g></Svg>,
  Camera: () => <Svg><g {...S}><path d="M4 7h3l1.5-2h7L17 7h3a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2Z" /><circle cx="12" cy="13" r="4" /></g></Svg>,
  Check: () => <Svg><path {...S} d="m5 12.5 4.5 4.5L19 7.5" /></Svg>,
  Clock: () => <Svg><g {...S}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3.5 2" /></g></Svg>,
  Bell: () => <Svg><g {...S}><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 7h18s-3 0-3-7" /><path d="M10 20h4" /></g></Svg>,
  Eye: () => <Svg><g {...S}><path d="M2.5 12s3.5-5.5 9.5-5.5 9.5 5.5 9.5 5.5-3.5 5.5-9.5 5.5S2.5 12 2.5 12Z" /><circle cx="12" cy="12" r="2.75" /></g></Svg>,
  Plus: () => <Svg><path {...S} d="M12 5v14M5 12h14" /></Svg>,
  Type: () => <Svg><g {...S}><path d="M5 8V5h14v3M12 5v14M8.5 19h7" /></g></Svg>,
  Voice: () => <Svg><g {...S}><rect x="8" y="3" width="8" height="12" rx="4" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3M9 21h6" /></g></Svg>,
  Paper: () => <Svg><g {...S}><path d="M6 3h8l4 4v14H6z" /><path d="M14 3v4h4M9 12h6M9 16h6" /></g></Svg>,
  Sparkle: () => <Svg><g {...S}><path d="M12 3c.5 4.9 3.1 7.5 8 8-4.9.5-7.5 3.1-8 8-.5-4.9-3.1-7.5-8-8 4.9-.5 7.5-3.1 8-8Z" /><path d="M19 3v4M17 5h4" /></g></Svg>,
}

/* ---------- Toast: a slip of paper, not a snackbar ---------- */
export function Toast({ note, onDone }: { note: { title: string; body?: string } | null; onDone: () => void }) {
  return (
    <AnimatePresence>
      {note && (
        <motion.div
          key={note.title + (note.body ?? '')}
          initial={{ y: -70, opacity: 0, rotate: -1.5 }}
          animate={{ y: 0, opacity: 1, rotate: -0.6 }}
          exit={{ y: -70, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 380, damping: 30 }}
          onClick={onDone}
          style={{
            position: 'fixed', top: 'calc(var(--safe-top) + 0.7rem)', left: '50%', x: '-50%',
            zIndex: 200, width: 'min(92vw, 420px)', background: 'var(--paper-card)',
            boxShadow: 'var(--shadow-deep)', padding: '0.85rem 1.1rem', cursor: 'pointer',
            border: '1px solid color-mix(in srgb, var(--accent) 22%, transparent)',
            borderRadius: '16px',
          }}
        >
          <div className="kicker">Wire dispatch</div>
          <div className="serif-body" style={{ fontSize: '1.02rem', marginTop: 3 }}>{note.title}</div>
          {note.body && <div className="muted" style={{ fontSize: '0.88rem' }}>{note.body}</div>}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/* ---------- Full-bleed sheet ---------- */
export function Sheet({
  open, onClose, title, children, actions,
}: {
  open: boolean; onClose: () => void; title: string
  children: ReactNode; actions?: ReactNode
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="sheet"
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', stiffness: 300, damping: 34 }}
        >
          <div className="sheet-head">
            <button className="btn-ghost row" onClick={onClose} style={{ padding: '0.4rem', margin: '-0.4rem' }} aria-label="Close">
              <Icon.Close />
            </button>
            <div className="kicker">{title}</div>
            <div style={{ minWidth: 32, display: 'flex', justifyContent: 'flex-end' }}>{actions}</div>
          </div>
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/* ---------- The press: our loading state ---------- */
export function PressLoader({ label = 'Setting type' }: { label?: string }) {
  return (
    <div className="col center gap-md" style={{ padding: '4rem 1rem' }}>
      <div style={{ position: 'relative', width: 86, height: 108, overflow: 'hidden', background: 'var(--paper-card)', boxShadow: 'var(--shadow-lift)' }}>
        <div style={{ position: 'absolute', inset: '12px 14px', display: 'flex', flexDirection: 'column', gap: 6 }}>
          {[100, 82, 92, 64, 88, 48].map((w, i) => (
            <div key={i} style={{ height: 4, width: `${w}%`, background: 'var(--rule-hair)' }} />
          ))}
        </div>
        <div style={{
          position: 'absolute', left: 0, right: 0, height: '38%',
          background: 'linear-gradient(180deg, transparent, var(--accent-wash) 40%, var(--accent-wash) 60%, transparent)',
          animation: 'pressRoll 1.5s var(--ease-out) infinite',
        }} />
      </div>
      <div className="kicker">{label}…</div>
    </div>
  )
}

/* ---------- Small furniture ---------- */
export const Kicker = ({ children }: { children: ReactNode }) => <div className="kicker">{children}</div>

export function Stamped({ children, rotate = -4 }: { children: ReactNode; rotate?: number }) {
  return <span className="stamp" style={{ transform: `rotate(${rotate}deg)`, display: 'inline-block' }}>{children}</span>
}

export function EmptyPage({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="col center gap-sm tac" style={{ padding: '4.5rem 1.5rem' }}>
      <div style={{ fontFamily: 'var(--hand)', fontSize: '2.1rem', color: 'var(--ink-faint)', transform: 'rotate(-2deg)' }}>{title}</div>
      <div className="muted italic" style={{ maxWidth: 330, fontSize: '0.96rem' }}>{hint}</div>
      <div className="rule" style={{ width: 60, marginTop: '0.8rem' }} />
    </div>
  )
}
