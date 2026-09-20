import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { useMemories, isSealed, react, heartPulse, type Memory } from '../lib/db'
import { useSession } from '../lib/session'
import { play, buzz } from '../lib/sound'
import { Icon, EmptyPage, PressLoader } from '../components/ui'

const MARKS = ['❤', '✶', '❦', '☺', '✿']

export default function Feed({ onOpen }: { onOpen: (m: Memory) => void }) {
  const { user, pairing, me, partner } = useSession()
  const memories = useMemories(user?.uid ?? null)
  const [pulsing, setPulsing] = useState(false)

  const items = useMemo(
    () => (memories ?? []).filter((m) => m.type !== 'classified'),
    [memories],
  )

  async function pulse() {
    if (!user || !pairing || !me) return
    setPulsing(true)
    play('chime'); buzz([8, 40, 8, 40, 20])
    try { await heartPulse(user.uid, me.name) } catch { /* offline */ }
    setTimeout(() => setPulsing(false), 900)
  }

  if (memories === null) return <PressLoader label="Fetching the wire" />

  const [lead, ...rest] = items

  return (
    <div className="stage-inner">
      {/* Thinking-of-you: one tap, no words needed */}
      <div className="row between" style={{ padding: '0.9rem 0 1.1rem', alignItems: 'center' }}>
        <div className="col">
          <span className="kicker">Circulation</span>
          <span className="byline">
            {me?.name ?? 'you'}{partner ? ` & ${partner.name}` : ' — awaiting your friend'}
          </span>
        </div>
        <motion.button onClick={pulse} whileTap={{ scale: 0.88 }}
          animate={pulsing ? { scale: [1, 1.24, 1] } : {}}
          transition={{ duration: 0.6 }}
          className="row gap-xs"
          style={{
            color: pulsing ? 'var(--accent)' : 'var(--ink-soft)',
            border: '1px solid var(--rule)', padding: '0.45rem 0.7rem',
            transition: 'color 300ms var(--ease-out)',
          }}>
          <Icon.Heart />
          <span className="byline" style={{ fontSize: '0.62rem', letterSpacing: '0.14em', textTransform: 'uppercase' }}>
            {pulsing ? 'Sent' : 'Thinking of you'}
          </span>
        </motion.button>
      </div>

      <hr className="rule-double" style={{ marginBottom: '1.4rem' }} />

      {!items.length ? (
        <EmptyPage
          title="nothing set yet"
          hint="An empty page is still a page. Write a letter, draw something, or send a picture that disappears."
        />
      ) : (
        <>
          <LeadStory memory={lead} onOpen={onOpen} />
          {rest.length > 0 && <hr className="rule" style={{ margin: '1.8rem 0 1.4rem' }} />}
          <div className="feed-columns col gap-md">
            <AnimatePresence initial={false}>
              {rest.map((m, i) => (
                <MemoryCard key={m.id} memory={m} index={i} onOpen={onOpen} />
              ))}
            </AnimatePresence>
          </div>
        </>
      )}

      <div className="tac folio" style={{ marginTop: '3rem' }}>
        {items.length} {items.length === 1 ? 'item' : 'items'} in this issue
      </div>
    </div>
  )
}

/* ---------------- lead ---------------- */

function LeadStory({ memory, onOpen }: { memory: Memory; onOpen: (m: Memory) => void }) {
  const { pairing } = useSession()
  const sender = pairing?.profiles?.[memory.senderId]?.name ?? '—'
  const sealed = isSealed(memory)

  return (
    <motion.button
      initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1] }}
      onClick={() => { onOpen(memory); play('rustle') }}
      style={{ display: 'block', width: '100%', textAlign: 'left' }}>
      <div className="kicker">{kickerFor(memory, sealed)}</div>
      <h2 className="headline misreg" style={{ margin: '0.35rem 0 0.5rem', fontSize: 'clamp(1.9rem, 6.5vw, 2.8rem)' }}>
        {headlineFor(memory)}
      </h2>
      <div className="byline">By {sender} · {when(memory)}</div>

      {(memory.type === 'doodle' || memory.type === 'scrapbook') && memory.mediaUrl && (
        <div style={{ position: 'relative', marginTop: '0.9rem' }}>
          <img src={memory.mediaUrl} alt="" className="deckle"
            style={{ width: '100%', boxShadow: 'var(--shadow-lift)' }} />
          <div className="tape" style={{ top: -11, left: '50%', transform: 'translateX(-50%) rotate(-2deg)' }} />
        </div>
      )}
      {memory.type === 'snap' && <SnapPlate memory={memory} />}
      {memory.caption && <p className="serif-body italic muted" style={{ marginTop: '0.6rem' }}>{memory.caption}</p>}
    </motion.button>
  )
}

/* ---------------- card ---------------- */

function MemoryCard({ memory, index, onOpen }: { memory: Memory; index: number; onOpen: (m: Memory) => void }) {
  const { user, pairing } = useSession()
  const sender = pairing?.profiles?.[memory.senderId]?.name ?? '—'
  const sealed = isSealed(memory)
  const [showMarks, setShowMarks] = useState(false)
  const myMark = user ? memory.reactions?.[user.uid] : undefined

  async function mark(m: string) {
    if (!user) return
    setShowMarks(false)
    play('stamp'); buzz(8)
    try { await react(memory.id, user.uid, m) } catch { /* offline */ }
  }

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
      transition={{ duration: 0.55, delay: Math.min(index * 0.04, 0.3), ease: [0.16, 1, 0.3, 1] }}
      className="clipping"
      style={{ padding: '1rem 1.05rem 1.1rem', marginBottom: '1rem' }}>
      <button onClick={() => { onOpen(memory); play('rustle') }} style={{ display: 'block', width: '100%', textAlign: 'left' }}>
        <div className="row between" style={{ alignItems: 'baseline' }}>
          <span className="kicker">{kickerFor(memory, sealed)}</span>
          <span className="folio">{when(memory)}</span>
        </div>

        <div className="row gap-sm" style={{ marginTop: '0.5rem', alignItems: 'flex-start' }}>
          <span style={{ color: 'var(--accent)', flex: 'none', marginTop: 2 }}>
            {memory.type === 'letter' ? <Icon.Letter />
              : memory.type === 'doodle' ? <Icon.Nib />
              : memory.type === 'snap' ? <Icon.Eye /> : <Icon.Archive />}
          </span>
          <div className="grow" style={{ minWidth: 0 }}>
            <div className="serif-body" style={{ fontSize: '1.14rem', lineHeight: 1.25 }}>{headlineFor(memory)}</div>
            <div className="byline faint">By {sender}</div>
          </div>
        </div>

        {(memory.type === 'doodle' || memory.type === 'scrapbook') && memory.mediaUrl && (
          <img src={memory.mediaUrl} alt="" loading="lazy"
            style={{ width: '100%', marginTop: '0.75rem', boxShadow: '0 1px 3px rgba(60,48,30,.18)' }} />
        )}
        {memory.type === 'snap' && <SnapPlate memory={memory} small />}
        {memory.caption && memory.type !== 'classified' && (
          <p className="serif-body italic muted" style={{ marginTop: '0.55rem', fontSize: '0.95rem' }}>{memory.caption}</p>
        )}
      </button>

      <div className="row between" style={{ marginTop: '0.7rem', alignItems: 'center' }}>
        <div className="row gap-xs">
          {Object.entries(memory.reactions ?? {}).map(([uid, m]) => (
            <span key={uid} title={pairing?.profiles?.[uid]?.name}
              style={{ fontSize: '0.95rem', color: 'var(--accent)' }}>{m}</span>
          ))}
        </div>
        <div style={{ position: 'relative' }}>
          <button className="btn-ghost byline" style={{ padding: '0.25rem 0.4rem', fontSize: '0.6rem', letterSpacing: '0.12em', textTransform: 'uppercase' }}
            onClick={() => { setShowMarks((v) => !v); play('key') }}>
            {myMark ? 'Change mark' : 'Leave a mark'}
          </button>
          <AnimatePresence>
            {showMarks && (
              <motion.div
                initial={{ opacity: 0, y: 6, scale: 0.94 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.94 }}
                transition={{ type: 'spring', stiffness: 400, damping: 26 }}
                className="row gap-xs"
                style={{
                  position: 'absolute', right: 0, bottom: '110%', background: 'var(--paper-card)',
                  boxShadow: 'var(--shadow-deep)', padding: '0.4rem 0.5rem', zIndex: 10,
                }}>
                {MARKS.map((m) => (
                  <button key={m} onClick={() => mark(m)}
                    style={{ fontSize: '1.1rem', padding: '0.1rem 0.25rem', color: myMark === m ? 'var(--accent)' : 'var(--ink-soft)' }}>
                    {m}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.article>
  )
}

/* ---------------- snap plate ---------------- */

function SnapPlate({ memory, small }: { memory: Memory; small?: boolean }) {
  const burned = memory.isBurned
  return (
    <div style={{
      marginTop: '0.75rem', position: 'relative', aspectRatio: small ? '16 / 9' : '4 / 3',
      background: burned
        ? 'repeating-linear-gradient(45deg, #2a2521 0 8px, #201c19 8px 16px)'
        : 'linear-gradient(140deg, #4a423a, #2c2723)',
      display: 'grid', placeItems: 'center', overflow: 'hidden',
    }}>
      <div className="col center gap-xs" style={{ color: burned ? '#6b6258' : '#e6ded0' }}>
        {burned ? <Icon.Trash /> : <Icon.Eye />}
        <span className="kicker" style={{ color: 'inherit' }}>{burned ? 'Burned' : 'View once'}</span>
      </div>
    </div>
  )
}

/* ---------------- copy helpers ---------------- */

function kickerFor(m: Memory, sealed: boolean) {
  if (sealed) return 'Sealed · open when'
  switch (m.type) {
    case 'letter': return m.viewedAt ? 'Correspondence · read' : 'Correspondence'
    case 'doodle': return 'Illustration'
    case 'snap': return m.isBurned ? 'Ephemera · burned' : 'Ephemera'
    case 'scrapbook': return 'Photograph'
    default: return 'Notice'
  }
}

function headlineFor(m: Memory) {
  if (m.type === 'letter') return m.title || 'Untitled'
  if (m.type === 'doodle') return m.caption || 'A drawing, unlabelled'
  if (m.type === 'snap') return m.isBurned ? 'Already gone' : 'Something brief'
  return m.caption || 'A picture worth keeping'
}

function when(m: Memory) {
  const d = m.createdAt?.toDate()
  if (!d) return '—'
  const mins = Math.floor((Date.now() - d.getTime()) / 6e4)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  if (mins < 1440) return `${Math.floor(mins / 60)}h ago`
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
}
