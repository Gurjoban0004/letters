import { useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { useMemories, postClassified, type Memory } from '../lib/db'
import { useSession } from '../lib/session'
import { play, buzz } from '../lib/sound'
import { ROMAN, issueNumber } from '../lib/eggs'
import { Icon, EmptyPage, PressLoader } from '../components/ui'

type Tab = 'issues' | 'classifieds'

export default function Archive({
  onOpen, showCorrections, onDismissCorrections,
}: {
  onOpen: (m: Memory) => void
  showCorrections: boolean
  onDismissCorrections: () => void
}) {
  const { user, pairing, me, partner } = useSession()
  const memories = useMemories(user?.uid ?? null)
  const [tab, setTab] = useState<Tab>('issues')
  const [colophon, setColophon] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)

  // Reaching the very bottom of the archive prints the colophon.
  useEffect(() => {
    const el = endRef.current
    if (!el) return
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !colophon) { setColophon(true); play('chime') }
    }, { threshold: 0.9 })
    io.observe(el)
    return () => io.disconnect()
  }, [colophon, memories])

  const issues = useMemo(() => (memories ?? []).filter((m) => m.type !== 'classified'), [memories])
  const ads = useMemo(() => (memories ?? []).filter((m) => m.type === 'classified'), [memories])

  if (memories === null) return <PressLoader label="Pulling the archive" />

  return (
    <div className="stage-inner">
      <div className="row gap-md" style={{ padding: '1rem 0 0.8rem' }}>
        {(['issues', 'classifieds'] as Tab[]).map((t) => (
          <button key={t} onClick={() => { setTab(t); play('rustle') }}
            className="kicker"
            style={{
              paddingBottom: 4, color: tab === t ? 'var(--accent)' : 'var(--ink-faint)',
              borderBottom: `2px solid ${tab === t ? 'var(--accent)' : 'transparent'}`,
            }}>
            {t === 'issues' ? 'Back issues' : 'Classifieds'}
          </button>
        ))}
      </div>
      <hr className="rule" style={{ marginBottom: '1.3rem' }} />

      <AnimatePresence>
        {showCorrections && <Corrections a={me?.name} b={partner?.name} onDismiss={onDismissCorrections} />}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {tab === 'issues' ? (
          <motion.div key="issues" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            {!issues.length ? (
              <EmptyPage title="no back issues" hint="Everything you send gets filed here, forever, in order." />
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '0.9rem' }}>
                {issues.map((m, i) => (
                  <motion.button key={m.id}
                    initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: Math.min(i * 0.02, 0.4), duration: 0.5 }}
                    whileHover={{ y: -3, rotate: -0.4 }}
                    onClick={() => { onOpen(m); play('rustle') }}
                    className="clipping"
                    style={{ padding: '0.7rem', textAlign: 'left', aspectRatio: '3 / 4', display: 'flex', flexDirection: 'column' }}>
                    <div className="folio">{ROMAN(issues.length - i)}</div>
                    <div className="grow" style={{ display: 'grid', placeItems: 'center', minHeight: 0, padding: '0.4rem 0' }}>
                      {m.mediaUrl
                        ? <img src={m.mediaUrl} alt="" loading="lazy" style={{ maxHeight: '100%', objectFit: 'contain' }} />
                        : <span style={{ color: 'var(--accent)', opacity: 0.8 }}>
                            {m.type === 'letter' ? <Icon.Letter /> : m.type === 'snap' ? <Icon.Eye /> : <Icon.Archive />}
                          </span>}
                    </div>
                    <div className="byline" style={{ fontSize: '0.64rem', lineHeight: 1.3 }}>
                      {m.title || m.caption || (m.type === 'snap' ? 'burned' : 'untitled')}
                    </div>
                    <div className="folio" style={{ fontSize: '0.55rem' }}>
                      {m.createdAt?.toDate().toLocaleDateString(undefined, { day: '2-digit', month: 'short' })}
                    </div>
                  </motion.button>
                ))}
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div key="ads" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <Classifieds ads={ads} />
          </motion.div>
        )}
      </AnimatePresence>

      <div ref={endRef} style={{ height: 1, marginTop: '3rem' }} />
      <AnimatePresence>
        {colophon && <Colophon memories={memories} />}
      </AnimatePresence>
    </div>
  )
}

/* ---------------- classifieds ---------------- */

function Classifieds({ ads }: { ads: Memory[] }) {
  const { user, pairing } = useSession()
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)

  async function post() {
    if (!user || !pairing || !text.trim()) return
    setBusy(true)
    try { await postClassified(user.uid, text.trim()); play('key'); buzz(8); setText('') }
    finally { setBusy(false) }
  }

  return (
    <div className="col gap-md">
      <p className="byline faint italic">
        Small ads. Six words if you can manage it. No explanation offered or expected.
      </p>

      <div className="row gap-sm" style={{ alignItems: 'flex-end' }}>
        <input className="field grow" value={text} maxLength={80}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') post() }}
          placeholder="WANTED: someone to agree with me" />
        <button className="btn" onClick={post} disabled={busy || !text.trim()} style={{ padding: '0.55rem 0.9rem' }}>
          Post
        </button>
      </div>

      {!ads.length ? (
        <EmptyPage title="no small ads" hint="The classifieds page is blank. Somebody should do something about that." />
      ) : (
        <div style={{ columnCount: 2, columnGap: '1.2rem', marginTop: '0.6rem' }}>
          {ads.map((ad) => (
            <div key={ad.id} style={{ breakInside: 'avoid', marginBottom: '0.9rem', paddingBottom: '0.7rem', borderBottom: '1px solid var(--rule-hair)' }}>
              <div style={{ fontFamily: 'var(--mono)', fontSize: '0.74rem', lineHeight: 1.5, textTransform: 'uppercase' }}>
                {ad.caption}
              </div>
              <div className="folio" style={{ fontSize: '0.52rem', marginTop: 3 }}>
                — {pairing?.profiles?.[ad.senderId]?.name ?? '—'}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ---------------- corrections (easter egg) ---------------- */

const RETRACTIONS = [
  (a: string, b: string) => `In an earlier issue we reported that ${a} would "reply in a minute." ${a} did not. We regret the error.`,
  (a: string, b: string) => `We stated that ${b} was "almost ready." This was a projection, not a fact.`,
  (a: string, b: string) => `A previous edition described ${a}'s drawing as "a horse." It was a dog. Both parties now accept this.`,
  (a: string, b: string) => `We claimed ${b} "definitely remembered." Our source has since retracted.`,
  (a: string, b: string) => `Contrary to our reporting, neither ${a} nor ${b} has ever been on time. The record has been corrected.`,
  (a: string, b: string) => `We described a recent snap as "unflattering." We stand by this.`,
]

function Corrections({ a, b, onDismiss }: { a?: string; b?: string; onDismiss: () => void }) {
  const nameA = a ?? 'one of you'
  const nameB = b ?? 'the other'
  return (
    <motion.aside
      initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      style={{ overflow: 'hidden', marginBottom: '1.6rem' }}>
      <div className="clipping" style={{ padding: '1.1rem 1.15rem', border: '1px solid var(--rule)', borderRadius: '1rem' }}>
        <div className="row between" style={{ alignItems: 'baseline' }}>
          <span className="kicker">Corrections &amp; clarifications</span>
          <button className="btn-ghost" onClick={onDismiss} style={{ padding: '0.2rem' }} aria-label="Dismiss"><Icon.Close /></button>
        </div>
        <hr className="rule-hair" style={{ margin: '0.6rem 0 0.8rem' }} />
        <div className="col gap-sm">
          {RETRACTIONS.map((line, i) => (
            <p key={i} className="serif-body" style={{ fontSize: '0.92rem', lineHeight: 1.6, color: 'var(--ink-soft)' }}>
              {line(nameA, nameB)}
            </p>
          ))}
        </div>
      </div>
    </motion.aside>
  )
}

/* ---------------- colophon ---------------- */

function Colophon({ memories }: { memories: Memory[] }) {
  const { pairing, me, partner } = useSession()
  const first = memories[memories.length - 1]?.createdAt?.toDate() ?? null
  const days = first ? Math.max(1, Math.round((Date.now() - first.getTime()) / 864e5)) : 1
  const count = (t: string) => memories.filter((m) => m.type === t).length
  const marks = memories.reduce((n, m) => n + Object.keys(m.reactions ?? {}).length, 0)

  const rows: [string, string | number][] = [
    ['Established', first ? first.toLocaleDateString(undefined, { dateStyle: 'long' }) : '—'],
    ['Days in print', days],
    ['Issue', ROMAN(issueNumber(first))],
    ['Letters set', count('letter')],
    ['Illustrations', count('doodle')],
    ['Photographs kept', count('scrapbook')],
    ['Ephemera burned', memories.filter((m) => m.type === 'snap' && m.isBurned).length],
    ['Small ads placed', count('classified')],
    ['Marks left in margins', marks],
  ]

  return (
    <motion.section
      initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
      className="tac" style={{ padding: '3rem 0 1rem', maxWidth: 420, margin: '0 auto' }}>
      <div style={{ fontSize: '1.4rem', color: 'var(--accent)' }}>❖</div>
      <div className="kicker" style={{ marginTop: '0.6rem' }}>Colophon</div>
      <hr className="rule-double" style={{ margin: '0.9rem 0 1.2rem' }} />

      <div className="col gap-xs">
        {rows.map(([label, value]) => (
          <div key={label} className="row between" style={{ alignItems: 'baseline', gap: '0.6rem' }}>
            <span className="byline faint" style={{ textAlign: 'left' }}>{label}</span>
            <span style={{ flex: 1, borderBottom: '1px dotted var(--rule)', transform: 'translateY(-3px)' }} />
            <span className="serif-body" style={{ fontVariantNumeric: 'tabular-nums' }}>{value}</span>
          </div>
        ))}
      </div>

      <hr className="rule" style={{ margin: '1.4rem 0 1rem' }} />
      <p className="byline faint italic" style={{ lineHeight: 1.7 }}>
        Twofold is set in Instrument Serif, Newsreader and Courier Prime.
        Printed privately for {me?.name ?? 'two people'}{partner ? ` and ${partner.name}` : ''}.
        Circulation has never exceeded two, and never will.
      </p>
      <div className="folio" style={{ marginTop: '1.2rem' }}>— end of issue —</div>
    </motion.section>
  )
}
