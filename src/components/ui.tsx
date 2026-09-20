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
  fill: 'none', stroke: 'currentColor', strokeWidth: 1.4,
  strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const,
}
const Svg = (p: { children: ReactNode; size?: number }) => (
  <svg viewBox="0 0 24 24" width={p.size ?? 24} height={p.size ?? 24} aria-hidden>{p.children}</svg>
)

export const Icon = {
  Letter: () => <Svg><g {...S}><path d="M4.2 6.3h15.6c.9 0 1.7.8 1.7 1.7v9.3c0 .9-.8 1.7-1.7 1.7H4.2c-.9 0-1.7-.8-1.7-1.7V8c0-.9.8-1.7 1.7-1.7Z" /><path d="m3.2 7.2 8 6.1c.5.4 1.1.4 1.6 0l8-6.1" /></g></Svg>,
  Nib: () => <Svg><g {...S}><path d="M5 20.2c1.1-4.9 3.5-10.6 9.9-16.2 2.7 2.7 3.6 7.4.8 11.4-2.5 3.5-6.6 4.7-10.7 4.8Z" /><path d="m11.8 12.1-6.4 7.7" /><circle cx="12.6" cy="10.7" r="1.2" /></g></Svg>,
  Aperture: () => <Svg><g {...S}><circle cx="12" cy="12" r="8.5" /><path d="M12 3.5 8.2 10m7.6 0L12 3.5M3.9 9.4 11 11m-3.4 2.2L3.9 9.4m1.4 8.4L9 12m2.6 1.3L5.3 17.8m12.9.4L14 12.6M12.6 14 18.2 18.2m2-8.6L13 11m3.2 2.3 3.9-3.7" /></g></Svg>,
  Archive: () => <Svg><g {...S}><path d="M7 4.2h10c1 0 1.8.8 1.8 1.8v13.8H7c-1.1 0-2-.9-2-2V6.2c0-1.1.9-2 2-2Z" /><path d="M8.5 8.2h6.8M8.5 11.5h6.8M8.5 14.8h4.3" /><path d="M7 19.8c-1.1 0-2-.9-2-2s.9-2 2-2h11.8" /></g></Svg>,
  Heart: () => <Svg><g {...S}><path d="M12 20s-7.5-4.6-7.5-9.4A4.1 4.1 0 0 1 12 8.2a4.1 4.1 0 0 1 7.5 2.4C19.5 15.4 12 20 12 20Z" /></g></Svg>,
  Gear: () => <Svg><g {...S}><circle cx="12" cy="12" r="2.8" /><path d="M12 3.2v2.1M12 18.7v2.1M4.2 12H2.1m19.8 0h-2.1M6.5 6.5 5 5m14 14-1.5-1.5M6.5 17.5 5 19M19 5l-1.5 1.5" /><circle cx="12" cy="12" r="6.7" strokeDasharray="2.2 2.2" /></g></Svg>,
  Close: () => <Svg><g {...S}><path d="M6 6l12 12M18 6 6 18" /></g></Svg>,
  Back: () => <Svg><g {...S}><path d="M15 5l-7 7 7 7" /></g></Svg>,
  Undo: () => <Svg><g {...S}><path d="M4 9h11a4.5 4.5 0 1 1 0 9H9" /><path d="M7.5 5.5 4 9l3.5 3.5" /></g></Svg>,
  Redo: () => <Svg><g {...S}><path d="M20 9H9a4.5 4.5 0 1 0 0 9h6" /><path d="M16.5 5.5 20 9l-3.5 3.5" /></g></Svg>,
  Trash: () => <Svg><g {...S}><path d="M4.5 6.5h15M9.5 6.5V4.8A1.3 1.3 0 0 1 10.8 3.5h2.4a1.3 1.3 0 0 1 1.3 1.3v1.7" /><path d="M6.5 6.5 7.4 20h9.2l.9-13.5" /></g></Svg>,
  Camera: () => <Svg><g {...S}><path d="M4.5 7.7h3.1l1.3-2h6.2l1.3 2h3.1c1 0 1.8.8 1.8 1.8v8c0 1-.8 1.8-1.8 1.8h-15c-1 0-1.8-.8-1.8-1.8v-8c0-1 .8-1.8 1.8-1.8Z" /><circle cx="12" cy="13.2" r="3.3" /><path d="M18 10.2h.1" /></g></Svg>,
  Check: () => <Svg><g {...S}><path d="M5 12.5 10 17.5 19 7" /></g></Svg>,
  Clock: () => <Svg><g {...S}><circle cx="12" cy="12" r="8.5" /><path d="M12 7v5.3l3.4 2" /></g></Svg>,
  Bell: () => <Svg><g {...S}><path d="M6 17V11a6 6 0 0 1 12 0v6l1.6 2.2H4.4Z" /><path d="M10 20.5a2 2 0 0 0 4 0" /></g></Svg>,
  Eye: () => <Svg><g {...S}><path d="M2.5 12S6 6.5 12 6.5 21.5 12 21.5 12 18 17.5 12 17.5 2.5 12 2.5 12Z" /><circle cx="12" cy="12" r="2.8" /></g></Svg>,
  Plus: () => <Svg><g {...S}><path d="M12 5v14M5 12h14" /></g></Svg>,
  Type: () => <Svg><g {...S}><path d="M5 6.2V4.5h14v1.7M12 4.8v14.7M8.8 19.5h6.4" /></g></Svg>,
  Voice: () => <Svg><g {...S}><rect x="8.5" y="3.2" width="7" height="12" rx="3.5" /><path d="M5.8 11.6a6.2 6.2 0 0 0 12.4 0M12 17.8v3M8.8 20.8h6.4" /></g></Svg>,
  Paper: () => <Svg><g {...S}><path d="M6.3 3.2h8.4l3 3v14.6H6.3Z" /><path d="M14.7 3.2v3.1h3M9.2 10h5.6M9.2 13h5.6M9.2 16h3.5" /></g></Svg>,
  Sparkle: () => <Svg><g {...S}><path d="M12 3.5c.4 4.7 2.8 7.2 7.5 7.5-4.7.4-7.2 2.8-7.5 7.5-.4-4.7-2.8-7.2-7.5-7.5 4.7-.4 7.2-2.8 7.5-7.5Z" /><path d="M19 3v3M17.5 4.5h3" /></g></Svg>,
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
