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

/* ---------- Icons: monoline, 24px, drawn not imported ---------- */
const S = {
  fill: 'none', stroke: 'currentColor', strokeWidth: 1.7,
  strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const,
}
const Svg = (p: { children: ReactNode; size?: number }) => (
  <svg className="app-icon" viewBox="0 0 24 24" width={p.size ?? 24} height={p.size ?? 24} fill="none" aria-hidden focusable="false">{p.children}</svg>
)

export const Icon = {
  Letter: () => <Svg><g {...S}><rect x="3" y="5.25" width="18" height="13.5" rx="3" /><path d="m4.35 7.2 6.28 4.68a2.3 2.3 0 0 0 2.74 0l6.28-4.68" /><path d="m4.15 17 5.05-4.2M19.85 17l-5.05-4.2" /></g></Svg>,
  Nib: () => <Svg><g {...S}><path d="m13.35 3.4 7.25 7.25-7.7 9.15-8.7.05.05-8.7 9.1-7.75Z" /><path d="m4.65 19.35 5.18-5.18" /><circle cx="11.15" cy="12.85" r="1.55" /><path d="m15.9 5.95-3.45 3.45" /></g></Svg>,
  Aperture: () => <Svg><g {...S}><circle cx="12" cy="12" r="8.75" /><circle cx="12" cy="12" r="3.1" /><path d="m12 3.25 3.1 5.4M20.1 8.7l-6.2.05M17.15 19.1l-3.15-5.35M3.9 15.3l6.2-.05M6.85 4.9 10 10.25" /></g></Svg>,
  Archive: () => <Svg><g {...S}><rect x="5.2" y="6.1" width="13.6" height="14.1" rx="2.2" /><path d="M7.6 6.1V4.9c0-.65.52-1.18 1.18-1.18h6.44c.66 0 1.18.53 1.18 1.18v1.2M8.6 10.25h6.8M8.6 13.55h6.8M8.6 16.85h4.25" /></g></Svg>,
  Heart: () => <Svg><g {...S}><path d="M20.15 8.65c0 5.05-8.15 10.15-8.15 10.15S3.85 13.7 3.85 8.65A4.3 4.3 0 0 1 12 6.7a4.3 4.3 0 0 1 8.15 1.95Z" /></g></Svg>,
  Gear: () => <Svg><g {...S}><path d="M4 6h5M15 6h5M4 12h9M18 12h2M4 18h2M11 18h9" /><circle cx="12" cy="6" r="2.2" /><circle cx="15.5" cy="12" r="2.2" /><circle cx="8.5" cy="18" r="2.2" /></g></Svg>,
  Close: () => <Svg><g {...S}><path d="m6.4 6.4 11.2 11.2M17.6 6.4 6.4 17.6" /></g></Svg>,
  Back: () => <Svg><g {...S}><path d="m14.75 5-7 7 7 7" /></g></Svg>,
  Undo: () => <Svg><g {...S}><path d="M4 9.2h10.7a4.8 4.8 0 1 1 0 9.6H9.3" /><path d="M7.6 5.6 4 9.2l3.6 3.6" /></g></Svg>,
  Redo: () => <Svg><g {...S}><path d="M20 9.2H9.3a4.8 4.8 0 1 0 0 9.6h5.4" /><path d="m16.4 5.6 3.6 3.6-3.6 3.6" /></g></Svg>,
  Trash: () => <Svg><g {...S}><path d="M4.5 6.75h15M9 6.75V4.8c0-.66.54-1.2 1.2-1.2h3.6c.66 0 1.2.54 1.2 1.2v1.95M6.8 6.75l.8 13.05h8.8l.8-13.05M10 10.2v5.9M14 10.2v5.9" /></g></Svg>,
  Camera: () => <Svg><g {...S}><path d="M4.3 7.6h3.05l1.35-2h6.6l1.35 2h3.05c.94 0 1.7.76 1.7 1.7v8.2c0 .94-.76 1.7-1.7 1.7H4.3c-.94 0-1.7-.76-1.7-1.7V9.3c0-.94.76-1.7 1.7-1.7Z" /><circle cx="12" cy="13.25" r="3.45" /><circle cx="18.2" cy="10.2" r=".45" fill="currentColor" stroke="none" /></g></Svg>,
  Check: () => <Svg><g {...S}><path d="m4.8 12.45 4.65 4.65L19.35 7.2" /></g></Svg>,
  Clock: () => <Svg><g {...S}><circle cx="12" cy="12" r="8.75" /><path d="M12 7.2v5.1l3.5 2.05" /></g></Svg>,
  Bell: () => <Svg><g {...S}><path d="M5.2 17.2h13.6l-1.35-2.05V10a5.45 5.45 0 0 0-10.9 0v5.15L5.2 17.2Z" /><path d="M9.7 19.2a2.45 2.45 0 0 0 4.6 0" /></g></Svg>,
  Eye: () => <Svg><g {...S}><path d="M2.75 12s3.45-5.5 9.25-5.5 9.25 5.5 9.25 5.5-3.45 5.5-9.25 5.5S2.75 12 2.75 12Z" /><circle cx="12" cy="12" r="2.75" /></g></Svg>,
  Plus: () => <Svg><g {...S}><path d="M12 5v14M5 12h14" /></g></Svg>,
  Type: () => <Svg><g {...S}><path d="M5 7V4.5h14V7M12 4.8v14.7M8.6 19.5h6.8" /></g></Svg>,
  Voice: () => <Svg><g {...S}><rect x="8.6" y="3.2" width="6.8" height="11.8" rx="3.4" /><path d="M5.8 11.5a6.2 6.2 0 0 0 12.4 0M12 17.7v3.1M8.7 20.8h6.6" /></g></Svg>,
  Paper: () => <Svg><g {...S}><path d="M6.1 3.2h8.55l3.25 3.25V20.8H6.1Z" /><path d="M14.65 3.2v3.25h3.25M9.1 10.2h5.8M9.1 13.45h5.8M9.1 16.7h3.8" /></g></Svg>,
  Sparkle: () => <Svg><g {...S}><path d="M11.1 3.5c.38 4.3 2.72 6.65 7.05 7.05-4.33.38-6.67 2.73-7.05 7.05-.4-4.32-2.75-6.67-7.05-7.05 4.3-.4 6.65-2.75 7.05-7.05Z" /><path d="M18.5 3.25v3.5M16.75 5h3.5" /></g></Svg>,
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
            borderLeft: '3px solid var(--accent)',
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
