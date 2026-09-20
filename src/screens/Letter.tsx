import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { sendLetter, readLetterBody, isSealed, markViewed, type Memory } from '../lib/db'
import { useSession } from '../lib/session'
import { play, buzz } from '../lib/sound'
import { findSecretPhrase } from '../lib/eggs'
import { Icon, Sheet, PressLoader } from '../components/ui'

/* ---------------- stationery ---------------- */

export type PaperId = 'parchment' | 'ruled' | 'grid' | 'onion'

export const PAPERS: Record<PaperId, { label: string; style: React.CSSProperties }> = {
  parchment: {
    label: 'Parchment',
    style: {
      background: 'radial-gradient(120% 90% at 20% 10%, #fdf8ec 0%, #f6edd9 55%, #efe3c9 100%)',
      color: '#2d251a',
    },
  },
  ruled: {
    label: 'Ruled',
    style: {
      background:
        'repeating-linear-gradient(180deg, #fdfbf4 0px, #fdfbf4 27px, #cfd8e3 27px, #cfd8e3 28px)',
      color: '#1f2933',
    },
  },
  grid: {
    label: 'Graph',
    style: {
      background:
        'repeating-linear-gradient(0deg,#fbfaf6 0 19px,#e2ded0 19px 20px), repeating-linear-gradient(90deg,transparent 0 19px,#e2ded0 19px 20px)',
      color: '#262319',
    },
  },
  onion: {
    label: 'Onionskin',
    style: { background: 'linear-gradient(170deg, #26282c, #1b1d20)', color: '#e9e5dc' },
  },
}

/* ---------------- writer ---------------- */

export function LetterWriter({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user, pairing, me } = useSession()
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [paper, setPaper] = useState<PaperId>('parchment')
  const [unlockAt, setUnlockAt] = useState('')
  const [sending, setSending] = useState(false)
  const [secret, setSecret] = useState<{ mark: string; note: string } | null>(null)
  const lastLen = useRef(0)

  useEffect(() => {
    if (!open) { setTitle(''); setBody(''); setUnlockAt(''); setSecret(null) }
  }, [open])

  // Typewriter feedback, but only on growth — deleting shouldn't clack.
  function onBody(v: string) {
    if (v.length > lastLen.current) play(v.endsWith(' ') ? 'pen' : 'key')
    lastLen.current = v.length
    setBody(v)
    const hit = findSecretPhrase(v)
    if (hit && hit.mark !== secret?.mark) { setSecret(hit); play('chime'); buzz([6, 40, 6]) }
    if (!hit) setSecret(null)
  }

  async function send() {
    if (!user || !pairing || !body.trim()) return
    setSending(true)
    try {
      await sendLetter({
        senderId: user.uid,
        title: title.trim() || 'Untitled',
        body,
        paper,
        unlockAt: unlockAt ? new Date(unlockAt) : null,
      })
      play('seal'); buzz([10, 60, 18])
      onClose()
    } finally { setSending(false) }
  }

  const sheet = PAPERS[paper]

  return (
    <Sheet open={open} onClose={onClose} title="Compose a letter"
      actions={
        <button className="btn-ghost kicker" style={{ padding: '0.4rem 0.2rem' }}
          disabled={sending || !body.trim()} onClick={send}>
          {sending ? 'Sealing…' : 'Seal'}
        </button>
      }>
      <div className="sheet-body">
        <div className="row gap-xs" style={{ flexWrap: 'wrap', marginBottom: '1.1rem' }}>
          {(Object.keys(PAPERS) as PaperId[]).map((id) => (
            <button key={id} onClick={() => { setPaper(id); play('rustle') }}
              className="byline"
              style={{
                padding: '0.4rem 0.7rem', border: `1px solid ${paper === id ? 'var(--accent)' : 'var(--rule)'}`,
                color: paper === id ? 'var(--accent)' : 'var(--ink-soft)',
                letterSpacing: '0.1em', textTransform: 'uppercase', fontSize: '0.62rem',
              }}>
              {PAPERS[id].label}
            </button>
          ))}
        </div>

        <motion.div layout
          style={{ ...sheet.style, padding: '1.5rem 1.35rem 2.2rem', boxShadow: 'var(--shadow-deep)', position: 'relative' }}>
          <input
            value={title} onChange={(e) => setTitle(e.target.value)} maxLength={60}
            placeholder="A heading, if it needs one"
            style={{
              width: '100%', background: 'transparent', fontFamily: 'var(--display)',
              fontSize: '1.7rem', color: 'inherit', marginBottom: '0.6rem', outline: 'none',
            }} />
          <div style={{ height: 1, background: 'currentColor', opacity: 0.16, marginBottom: '1rem' }} />
          <textarea
            value={body} onChange={(e) => onBody(e.target.value)} rows={13}
            placeholder="Take your time. This one isn't going anywhere fast."
            style={{
              width: '100%', background: 'transparent', resize: 'vertical', outline: 'none',
              fontFamily: 'var(--body)', fontSize: '1.06rem', lineHeight: 1.75, color: 'inherit',
            }} />
          <AnimatePresence>
            {secret && (
              <motion.div
                initial={{ opacity: 0, scale: 0.4, rotate: -25 }}
                animate={{ opacity: 1, scale: 1, rotate: -10 }}
                exit={{ opacity: 0, scale: 0.6 }}
                transition={{ type: 'spring', stiffness: 320, damping: 16 }}
                style={{ position: 'absolute', right: 16, bottom: 14, textAlign: 'center', pointerEvents: 'none' }}>
                <div style={{ fontSize: '2rem', lineHeight: 1, color: 'var(--accent)' }}>{secret.mark}</div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: '0.5rem', letterSpacing: '0.12em', opacity: 0.6 }}>
                  {secret.note}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        <div className="col gap-xs" style={{ marginTop: '1.6rem' }}>
          <div className="row gap-xs" style={{ alignItems: 'center', color: 'var(--ink-soft)' }}>
            <Icon.Clock /><span className="kicker">Open when…</span>
          </div>
          <input className="field" type="datetime-local" value={unlockAt}
            min={new Date(Date.now() + 6e4).toISOString().slice(0, 16)}
            onChange={(e) => setUnlockAt(e.target.value)} />
          <p className="byline faint italic">
            {unlockAt
              ? `Sealed until ${new Date(unlockAt).toLocaleString()} — the words are held on the server until then, not just hidden.`
              : 'Leave blank to deliver immediately.'}
          </p>
        </div>

        <div className="tac hand muted" style={{ marginTop: '2rem' }}>— {me?.name}</div>
      </div>
    </Sheet>
  )
}

/* ---------------- wax seal ---------------- */

function WaxSeal({ initial, cracked }: { initial: string; cracked: boolean }) {
  const half = (side: -1 | 1) => ({
    position: 'absolute' as const, inset: 0,
    clipPath: side === -1 ? 'inset(0 50% 0 0)' : 'inset(0 0 0 50%)',
    background: 'radial-gradient(60% 60% at 35% 30%, var(--accent-soft), var(--accent) 60%, #5d1a28 100%)',
    borderRadius: '48% 52% 46% 54% / 52% 46% 54% 48%',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  })
  return (
    <div style={{ position: 'relative', width: 78, height: 78, filter: 'drop-shadow(0 3px 5px rgba(60,20,30,.4))' }}>
      {([-1, 1] as const).map((side) => (
        <motion.div key={side} style={half(side)}
          animate={cracked
            ? { x: side * 46, y: side * 8, rotate: side * 34, opacity: 0 }
            : { x: 0, y: 0, rotate: 0, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 16 }}
        />
      ))}
      <motion.div animate={{ opacity: cracked ? 0 : 1 }} transition={{ duration: 0.18 }}
        style={{
          position: 'absolute', inset: 0, display: 'grid', placeItems: 'center',
          fontFamily: 'var(--display)', fontSize: '2.1rem', color: 'rgba(255,240,235,.85)',
          textShadow: '0 1px 1px rgba(80,20,35,.6)', pointerEvents: 'none',
        }}>
        {initial}
      </motion.div>
    </div>
  )
}

/* ---------------- reader ---------------- */

export function LetterReader({ memory, onClose }: { memory: Memory; onClose: () => void }) {
  const { user, pairing } = useSession()
  const [phase, setPhase] = useState<'sealed' | 'opening' | 'open'>('sealed')
  const [body, setBody] = useState<string | null>(null)
  const [denied, setDenied] = useState(false)

  const sealedByTime = isSealed(memory)
  const senderName = pairing?.profiles?.[memory.senderId]?.name ?? 'Someone'
  const paper = PAPERS[(memory.paper as PaperId) ?? 'parchment']

  async function crack() {
    if (sealedByTime || phase !== 'sealed') return
    setPhase('opening')
    play('seal'); buzz([12, 50, 22])
    // The unfold runs on its own beat. Waiting for the fetch here would strand
    // the reader staring at a cracked seal whenever the network is slow.
    setTimeout(() => { setPhase('open'); play('rustle') }, 820)
    const text = await readLetterBody(memory.id)
    if (text === null) { setDenied(true) } else { setBody(text) }
    if (user && memory.senderId !== user.uid && !memory.viewedAt) {
      markViewed(memory.id).catch(() => {})
    }
  }

  return (
    <div className="sheet" style={{ background: 'var(--paper)' }}>
      <div className="sheet-head">
        <button className="btn-ghost" onClick={onClose} style={{ padding: '0.4rem', margin: '-0.4rem' }} aria-label="Close">
          <Icon.Close />
        </button>
        <div className="kicker">{sealedByTime ? 'Sealed' : phase === 'open' ? 'Correspondence' : 'Unopened'}</div>
        <div style={{ width: 24 }} />
      </div>

      <div className="sheet-body" style={{ display: 'flex', flexDirection: 'column' }}>
        <AnimatePresence mode="wait">
          {phase !== 'open' ? (
            <motion.div key="envelope" className="col center gap-lg grow"
              exit={{ opacity: 0, scale: 0.94, transition: { duration: 0.35 } }}
              style={{ justifyContent: 'center', minHeight: '58vh' }}>

              <motion.button
                onClick={crack} disabled={sealedByTime}
                whileTap={sealedByTime ? {} : { scale: 0.97 }}
                animate={phase === 'opening' ? { rotateX: -16, y: -8 } : {}}
                transition={{ type: 'spring', stiffness: 200, damping: 20 }}
                style={{
                  position: 'relative', width: 'min(86vw, 360px)', aspectRatio: '1.55 / 1',
                  background: 'linear-gradient(170deg, var(--paper-card), var(--paper-deep))',
                  boxShadow: 'var(--shadow-deep)', cursor: sealedByTime ? 'not-allowed' : 'pointer',
                  transformStyle: 'preserve-3d', perspective: 900,
                }}>
                {/* flap */}
                <motion.div
                  animate={phase === 'opening' ? { rotateX: -165 } : { rotateX: 0 }}
                  transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1] }}
                  style={{
                    position: 'absolute', top: 0, left: 0, right: 0, height: '58%',
                    transformOrigin: 'top center', backfaceVisibility: 'hidden',
                    background: 'linear-gradient(175deg, var(--paper-deep), var(--paper-card))',
                    clipPath: 'polygon(0 0, 100% 0, 50% 100%)',
                    boxShadow: '0 1px 0 rgba(120,100,70,.14)',
                  }} />
                <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', paddingTop: '14%' }}>
                  <WaxSeal initial={senderName.charAt(0).toUpperCase()} cracked={phase === 'opening'} />
                </div>
                <div className="postmark" style={{ position: 'absolute', top: 12, right: 12 }}>
                  {memory.createdAt?.toDate().toLocaleDateString(undefined, { day: '2-digit', month: 'short' }) ?? '— —'}
                </div>
              </motion.button>

              <div className="col center gap-xs tac">
                <div className="headline">{memory.title}</div>
                <div className="byline">From {senderName}</div>
                {sealedByTime ? (
                  <div className="col center gap-xs" style={{ marginTop: '0.6rem' }}>
                    <span className="stamp">Do not open until</span>
                    <span className="serif-body italic">{memory.unlockAt?.toDate().toLocaleString()}</span>
                  </div>
                ) : phase === 'sealed' ? (
                  <div className="kicker" style={{ marginTop: '0.7rem' }}>Press the seal</div>
                ) : null}
              </div>
            </motion.div>
          ) : (
            <motion.article key="letter"
              initial={{ opacity: 0, y: 26, rotateX: 8 }}
              animate={{ opacity: 1, y: 0, rotateX: 0 }}
              transition={{ duration: 0.85, ease: [0.16, 1, 0.3, 1] }}
              style={{ ...paper.style, padding: '2rem 1.5rem 3rem', boxShadow: 'var(--shadow-deep)', maxWidth: 680, margin: '0 auto', width: '100%' }}>
              <div style={{ fontFamily: 'var(--mono)', fontSize: '0.6rem', letterSpacing: '0.2em', textTransform: 'uppercase', opacity: 0.55 }}>
                {memory.createdAt?.toDate().toLocaleDateString(undefined, { dateStyle: 'long' })}
              </div>
              <h1 style={{ fontFamily: 'var(--display)', fontSize: 'clamp(1.9rem,6vw,2.7rem)', lineHeight: 1.03, margin: '0.5rem 0 1.2rem' }}>
                {memory.title}
              </h1>
              {body === null && !denied && <PressLoader label="Unfolding" />}
              {denied && <p className="italic">This letter is still sealed. The press refuses to set it early.</p>}
              {body !== null && (
                <p className="dropcap" style={{ fontSize: '1.09rem', lineHeight: 1.78, whiteSpace: 'pre-wrap' }}>{body}</p>
              )}
              <div style={{ marginTop: '2.4rem', fontFamily: 'var(--hand)', fontSize: '1.7rem', opacity: 0.85 }}>
                — {senderName}
              </div>
            </motion.article>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
