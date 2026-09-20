import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { sendMedia, burnSnap, snapUrl, sendAlert, type Memory } from '../lib/db'
import { useSession } from '../lib/session'
import { play, buzz } from '../lib/sound'
import { Icon, Sheet } from '../components/ui'

const HOLD_MS = 7000

/* ---------------- composer ---------------- */

export function SnapComposer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user, pairing } = useSession()
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [once, setOnce] = useState(true)
  const [caption, setCaption] = useState('')
  const [sending, setSending] = useState(false)

  useEffect(() => {
    if (!file) { setPreview(null); return }
    const url = URL.createObjectURL(file)
    setPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  useEffect(() => { if (!open) { setFile(null); setCaption(''); setOnce(true) } }, [open])

  async function send() {
    if (!user || !pairing || !file) return
    setSending(true)
    try {
      await sendMedia({
        senderId: user.uid,
        type: once ? 'snap' : 'scrapbook',
        blob: file, caption,
        ext: file.type.includes('video') ? 'mp4' : 'jpg',
      })
      play(once ? 'burn' : 'stamp'); buzz([10, 40, 16])
      onClose()
    } finally { setSending(false) }
  }

  return (
    <Sheet open={open} onClose={onClose} title="Send a snap"
      actions={
        <button className="btn-ghost kicker" style={{ padding: '0.4rem 0.2rem' }}
          disabled={sending || !file} onClick={send}>{sending ? 'Sending…' : 'Send'}</button>
      }>
      <div className="sheet-body col gap-lg">
        {!preview ? (
          <div className="col gap-md">
            <label className="col center gap-sm" style={{
              border: '1px dashed var(--rule)', padding: '3.2rem 1rem', cursor: 'pointer', color: 'var(--ink-soft)',
            }}>
              <Icon.Camera />
              <span className="kicker">Take or choose a picture</span>
              <input type="file" accept="image/*,video/*" capture="environment" hidden
                onChange={(e) => { const f = e.target.files?.[0]; if (f) { setFile(f); play('shutter') } }} />
            </label>
          </div>
        ) : (
          <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
            style={{ position: 'relative', boxShadow: 'var(--shadow-deep)' }}>
            {file?.type.includes('video')
              ? <video src={preview} controls playsInline style={{ width: '100%', display: 'block' }} />
              : <img src={preview} alt="" style={{ width: '100%', display: 'block' }} />}
            <button className="btn-ghost" onClick={() => setFile(null)}
              style={{ position: 'absolute', top: 6, right: 6, background: 'rgba(20,16,12,.55)', color: '#fff', padding: '0.35rem' }}
              aria-label="Remove"><Icon.Close /></button>
          </motion.div>
        )}

        <div className="col gap-sm">
          <span className="kicker">How should it be filed?</span>
          {([true, false] as const).map((mode) => (
            <button key={String(mode)} onClick={() => { setOnce(mode); play('key') }}
              style={{
                textAlign: 'left', padding: '0.9rem 1rem',
                border: `1px solid ${once === mode ? 'var(--accent)' : 'var(--rule)'}`,
                background: once === mode ? 'var(--accent-wash)' : 'transparent',
              }}>
              <div className="row gap-sm" style={{ alignItems: 'center' }}>
                {mode ? <Icon.Eye /> : <Icon.Archive />}
                <div>
                  <div className="serif-body" style={{ fontSize: '1.02rem' }}>
                    {mode ? 'View once, then burn' : 'Keep in the scrapbook'}
                  </div>
                  <div className="byline faint">
                    {mode ? 'Seven seconds, held down, then the file is destroyed.' : 'Filed permanently in the archive.'}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>

        <input className="field" value={caption} maxLength={90}
          onChange={(e) => setCaption(e.target.value)} placeholder="caption, optional" />

        {once && (
          <p className="byline faint italic" style={{ lineHeight: 1.6 }}>
            Honest note: burning deletes the file from the server. It cannot stop a second
            phone pointed at the screen — nothing on the web can. Treat it as a courtesy, not a vault.
          </p>
        )}
      </div>
    </Sheet>
  )
}

/* ---------------- viewer ---------------- */

const CAUGHT_LINES = [
  'Subject looked away mid-viewing.',
  'Window lost focus at the critical moment.',
  'Something pulled the screen away. Suspicious.',
  'The press has noted the interruption.',
]

export function SnapViewer({ memory, onClose }: { memory: Memory; onClose: () => void }) {
  const { user, pairing, me, partner } = useSession()
  const [url, setUrl] = useState<string | null>(null)
  const [held, setHeld] = useState(false)
  const [progress, setProgress] = useState(0)
  const [done, setDone] = useState(false)
  const [caught, setCaught] = useState<string | null>(null)
  const raf = useRef(0)
  const started = useRef(0)
  const finishing = useRef(false)

  const senderName = pairing?.profiles?.[memory.senderId]?.name ?? 'Someone'
  const partnerName = partner?.name ?? 'they'
  const isMine = user?.uid === memory.senderId

  useEffect(() => { snapUrl(memory).then(setUrl) }, [memory.id])

  function finish(reason: 'timeout' | 'released' | 'caught') {
    if (finishing.current) return
    finishing.current = true
    cancelAnimationFrame(raf.current)
    setHeld(false)
    setDone(true)
    play('burn')
    burnSnap(memory).catch(() => {})
    if (reason !== 'caught') buzz(18)
  }

  function startHold() {
    if (done || isMine || !url) return
    setHeld(true)
    started.current = performance.now()
    const tick = () => {
      const p = Math.min(1, (performance.now() - started.current) / HOLD_MS)
      setProgress(p)
      if (p >= 1) { finish('timeout'); return }
      raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)
  }

  function endHold() {
    if (!held || done) return
    cancelAnimationFrame(raf.current)
    finish('released')
  }

  /**
   * The honest version of screenshot detection.
   *
   * A web page cannot see an OS screenshot — macOS and iOS intercept those
   * shortcuts before the browser gets a key event, and there is no API for it.
   * What we CAN see is the tab losing focus or visibility at the exact moment a
   * snap is open, which is what taking a screenshot usually looks like from in
   * here. It is a strong hint, not proof, and the copy says so.
   */
  useEffect(() => {
    if (!held || done) return
    const trip = () => {
      if (finishing.current) return
      const line = CAUGHT_LINES[Math.floor(Math.random() * CAUGHT_LINES.length)]
      setCaught(line)
      finish('caught')
      if (user && pairing && me) {
        sendAlert({
          from: user.uid, type: 'screenshot',
          message: `${me.name} looked away mid-snap. Possibly innocent. Possibly not.`,
        }).catch(() => {})
      }
    }
    const onVis = () => { if (document.visibilityState === 'hidden') trip() }
    window.addEventListener('blur', trip)
    document.addEventListener('visibilitychange', onVis)
    return () => {
      window.removeEventListener('blur', trip)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [held, done, user?.uid, me?.name])

  useEffect(() => () => cancelAnimationFrame(raf.current), [])

  const R = 34, C = 2 * Math.PI * R

  return (
    <div className="sheet" style={{ background: '#15120f' }}>
      <div className="sheet-head" style={{ borderColor: 'rgba(255,255,255,.12)' }}>
        <button className="btn-ghost" onClick={onClose} style={{ padding: '0.4rem', margin: '-0.4rem', color: '#e8e2d6' }} aria-label="Close">
          <Icon.Close />
        </button>
        <div className="kicker" style={{ color: '#a49c8d' }}>View once · from {senderName}</div>
        <div style={{ width: 24 }} />
      </div>

      <div className="grow center col gap-lg" style={{ display: 'flex', padding: '1.2rem', position: 'relative' }}>
        {done ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="col center gap-sm tac">
            <div style={{ fontFamily: 'var(--display)', fontSize: '2.4rem', color: '#e8e2d6' }}>Gone.</div>
            <div className="byline" style={{ color: '#8d8578', maxWidth: 300 }}>
              The file was deleted from the server. There is no copy to reopen.
            </div>
            <button className="btn" onClick={onClose} style={{ marginTop: '1.2rem', borderColor: '#5d564a', color: '#e8e2d6' }}>
              Close
            </button>
          </motion.div>
        ) : isMine ? (
          <div className="col center gap-sm tac">
            <div className="hand" style={{ color: '#a49c8d', fontSize: '1.8rem' }}>your own snap</div>
            <div className="byline" style={{ color: '#7d7568' }}>Only {partnerName} can open this.</div>
          </div>
        ) : (
          <>
            <div
              onPointerDown={startHold} onPointerUp={endHold} onPointerCancel={endHold} onPointerLeave={endHold}
              style={{
                position: 'relative', width: '100%', maxWidth: 520, aspectRatio: '3 / 4',
                overflow: 'hidden', touchAction: 'none', cursor: 'pointer', background: '#0e0c0a',
                boxShadow: '0 30px 70px -30px rgba(0,0,0,.9)',
              }}>
              {url && (
                <img src={url} alt="" draggable={false}
                  style={{
                    width: '100%', height: '100%', objectFit: 'cover',
                    filter: held ? 'blur(0px)' : 'blur(26px) saturate(0.6)',
                    transform: held ? 'scale(1)' : 'scale(1.08)',
                    transition: 'filter 260ms var(--ease-out), transform 420ms var(--ease-out)',
                    userSelect: 'none', WebkitUserSelect: 'none', WebkitTouchCallout: 'none',
                  }} />
              )}
              {!held && (
                <div className="col center gap-sm" style={{ position: 'absolute', inset: 0, color: '#f0ece2' }}>
                  <Icon.Eye />
                  <div className="kicker" style={{ color: '#f0ece2' }}>Press and hold</div>
                </div>
              )}
              <AnimatePresence>
                {held && (
                  <motion.svg initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    width="88" height="88" viewBox="0 0 88 88"
                    style={{ position: 'absolute', bottom: 14, right: 14 }}>
                    <circle cx="44" cy="44" r={R} fill="none" stroke="rgba(255,255,255,.22)" strokeWidth="4" />
                    <circle cx="44" cy="44" r={R} fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round"
                      strokeDasharray={C} strokeDashoffset={C * progress}
                      transform="rotate(-90 44 44)" />
                    <text x="44" y="49" textAnchor="middle" fill="#fff"
                      style={{ font: '600 15px "Courier Prime", monospace' }}>
                      {Math.ceil((1 - progress) * HOLD_MS / 1000)}
                    </text>
                  </motion.svg>
                )}
              </AnimatePresence>
            </div>
            {memory.caption && <div className="serif-body italic" style={{ color: '#c9c2b4' }}>{memory.caption}</div>}
          </>
        )}

        {/* STOP PRESS — the caught-in-4K splash, set as a broadsheet */}
        <AnimatePresence>
          {caught && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{
                position: 'absolute', inset: 0, background: 'var(--paper)', zIndex: 5,
                display: 'grid', placeItems: 'center', padding: '1.5rem',
              }}>
              <motion.div
                initial={{ scale: 0.8, rotate: -4 }} animate={{ scale: 1, rotate: -1.5 }}
                transition={{ type: 'spring', stiffness: 220, damping: 13 }}
                className="tac" style={{ maxWidth: 420, animation: 'shudder 420ms 1' }}>
                <div className="kicker">Late edition · extra</div>
                <hr className="rule-thick" style={{ margin: '0.4rem 0 0.7rem' }} />
                <div className="display" style={{ fontSize: 'clamp(2.6rem, 13vw, 4.4rem)', lineHeight: 0.88 }}>
                  STOP<br />PRESS
                </div>
                <hr className="rule-double" style={{ margin: '0.8rem 0' }} />
                <p className="serif-body italic" style={{ fontSize: '1.05rem' }}>{caught}</p>
                <p className="byline faint" style={{ marginTop: '0.7rem', lineHeight: 1.6 }}>
                  We can't actually see your screenshots — only that the window went away at a
                  suspicious moment. Your friend has been told exactly that much.
                </p>
                <button className="btn btn-accent" style={{ marginTop: '1.4rem' }} onClick={onClose}>
                  Accept the accusation
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
